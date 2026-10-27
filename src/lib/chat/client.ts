"use client";

import type { Block, StreamEvent } from "./schema";
import { MAX_MESSAGE_CHARS } from "./constants";
import { getChat, latestMemory, updateAssistant, type ChatMessage } from "./store";

/**
 * The one place the browser talks to /api/chat. Used by the full chat page
 * and the homepage planner, so both behave the same (status lines, trip
 * memory, sign-up prompt after the free chats).
 */

const MAX_HISTORY = 20;

export const AUTH_EVENT = "vacayout:auth";
export const QUOTA_EVENT = "vacayout:quota";
export type AuthEventDetail = { mode?: "signup" | "signin"; message?: string };

export function openAuth(detail: AuthEventDetail = {}) {
  window.dispatchEvent(new CustomEvent<AuthEventDetail>(AUTH_EVENT, { detail }));
}

/** Conversation so far as plain turns: user text, and the agent's one-line summary of each finished answer. */
export function toTurns(messages: ChatMessage[]) {
  const turns: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    if (m.role === "user") turns.push({ role: "user", content: m.text.slice(0, MAX_MESSAGE_CHARS) });
    else if (m.status === "done" && m.summary) turns.push({ role: "assistant", content: m.summary.slice(0, MAX_MESSAGE_CHARS) });
  }
  const recent = turns.slice(-MAX_HISTORY);
  while (recent.length && recent[0].role !== "user") recent.shift();
  return recent;
}

export async function streamAnswer(chatId: string, assistantId: string, signal: AbortSignal) {
  const current = getChat(chatId);
  if (!current) return;
  const idx = current.messages.findIndex((m) => m.id === assistantId);
  const before = current.messages.slice(0, idx);
  const turns = toTurns(before);
  if (!turns.length || turns[turns.length - 1].role !== "user") return;
  const memory = latestMemory({ ...current, messages: before });

  const fail = (error: string, needsAuth = false) =>
    updateAssistant(chatId, assistantId, (m) => ({ ...m, status: "error", error, needsAuth, statusText: undefined }));

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chatId, messages: turns, memory }),
      signal,
    });
    if (!res.ok || !res.body) {
      const body = (await res.json().catch(() => null)) as { error?: string; authRequired?: boolean } | null;
      if (body?.authRequired) {
        fail(body.error ?? "Sign up free to keep planning.", true);
        openAuth({ mode: "signup", message: body.error });
        return;
      }
      fail(body?.error ?? "Couldn’t reach the planner. Check your connection and try again.");
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = false;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let event: StreamEvent;
        try {
          event = JSON.parse(line) as StreamEvent;
        } catch {
          continue;
        }
        if (event.type === "status") {
          updateAssistant(chatId, assistantId, (m) => ({ ...m, statusText: event.text.slice(0, 80) }));
        } else if (event.type === "block") {
          const block: Block = event.block;
          updateAssistant(chatId, assistantId, (m) => ({ ...m, blocks: [...m.blocks, block] }));
        } else if (event.type === "done") {
          finished = true;
          updateAssistant(chatId, assistantId, (m) => ({ ...m, status: "done", summary: event.summary, memory: event.memory ?? null, statusText: undefined }));
          if (typeof event.freeLeft === "number") window.dispatchEvent(new CustomEvent(QUOTA_EVENT, { detail: { freeLeft: event.freeLeft } }));
        } else if (event.type === "error") {
          finished = true;
          fail(event.message);
        }
      }
    }
    if (!finished) fail("The reply stopped early. Try again.");
  } catch {
    fail(signal.aborted ? "You stopped this reply." : "Couldn’t reach the planner. Check your connection and try again.");
  }
}
