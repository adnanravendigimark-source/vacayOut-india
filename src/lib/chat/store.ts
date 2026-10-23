"use client";

import { useSyncExternalStore } from "react";
import type { Block, TripMemory } from "./schema";

/**
 * Conversations saved in this browser only (no account yet). localStorage can
 * be unavailable (private mode, blocked storage), so an in-memory copy is the
 * working source of truth and storage is best-effort persistence.
 */

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      blocks: Block[];
      status: "streaming" | "done" | "error";
      summary?: string;
      error?: string;
      /** Progress line while the answer is being prepared. */
      statusText?: string;
      /** Trip details the planner remembered after this answer; sent back with the next question. */
      memory?: TripMemory | null;
      /** The reply was blocked until the visitor signs in. */
      needsAuth?: boolean;
    };

export type Chat = { id: string; title: string; createdAt: number; updatedAt: number; messages: ChatMessage[] };

const KEY = "vacayout.chats.v1";
const MAX_CHATS = 30;
const MAX_MESSAGES = 60;
const EMPTY: Chat[] = [];

let chats: Chat[] | null = null;
const listeners = new Set<() => void>();

function isChat(v: unknown): v is Chat {
  if (!v || typeof v !== "object") return false;
  const c = v as Chat;
  return typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.messages) && typeof c.updatedAt === "number";
}

function load(): Chat[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isChat).map((c) => ({
      ...c,
      // A reply that was still streaming when the tab closed can't resume.
      messages: c.messages.map((m) =>
        m.role === "assistant" && m.status === "streaming" ? { ...m, status: "error" as const, error: "This reply was interrupted." } : m,
      ),
    }));
  } catch {
    return [];
  }
}

function ensure(): Chat[] {
  if (chats === null) chats = typeof window === "undefined" ? [] : load();
  return chats;
}

function commit(next: Chat[]) {
  chats = [...next].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CHATS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(chats));
  } catch {
    // Storage full or blocked: keep working from memory for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      chats = load();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useChats(): Chat[] {
  return useSyncExternalStore(subscribe, ensure, () => EMPTY);
}

/** Trip memory from the latest finished answer in a chat. */
export function latestMemory(chat: Chat | undefined): TripMemory | null {
  if (!chat) return null;
  for (let i = chat.messages.length - 1; i >= 0; i--) {
    const m = chat.messages[i];
    if (m.role === "assistant" && m.status === "done" && m.memory) return m.memory;
  }
  return null;
}

/** False during server render and the first client render; avoids hydration mismatches. */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function createChat(id: string, firstMessage: string) {
  const now = Date.now();
  const title = firstMessage.length > 60 ? `${firstMessage.slice(0, 57)}…` : firstMessage;
  commit([{ id, title, createdAt: now, updatedAt: now, messages: [] }, ...ensure()]);
}

export function getChat(id: string) {
  return ensure().find((c) => c.id === id);
}

export function appendMessages(chatId: string, messages: ChatMessage[]) {
  commit(
    ensure().map((c) =>
      c.id === chatId ? { ...c, updatedAt: Date.now(), messages: [...c.messages, ...messages].slice(-MAX_MESSAGES) } : c,
    ),
  );
}

export function updateAssistant(
  chatId: string,
  messageId: string,
  update: (m: Extract<ChatMessage, { role: "assistant" }>) => Extract<ChatMessage, { role: "assistant" }>,
) {
  commit(
    ensure().map((c) =>
      c.id === chatId
        ? {
            ...c,
            updatedAt: Date.now(),
            messages: c.messages.map((m) => (m.id === messageId && m.role === "assistant" ? update(m) : m)),
          }
        : c,
    ),
  );
}

export function deleteChat(id: string) {
  commit(ensure().filter((c) => c.id !== id));
}
