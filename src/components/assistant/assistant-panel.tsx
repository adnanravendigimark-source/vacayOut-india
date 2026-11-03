"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icon";
import { StatusPill } from "@/components/place/section-body";
import { answerLocally, normalize, notesForAi } from "@/lib/assistant/search";
import type { Note, Pack } from "@/lib/assistant/types";
import { routes } from "@/lib/routes";

type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "bot"; kind: "greeting" }
  | { id: number; role: "bot"; kind: "loading" }
  | { id: number; role: "bot"; kind: "answer"; text: string | null; notes: Note[]; ai: boolean }
  | { id: number; role: "bot"; kind: "none"; question: string; topics: { label: string; question: string }[] };

let seq = 0;

/** Answers from the page's own notes; asks the server (cheap AI, cached) only when unsure. */
export function AssistantPanel({ pack, firstQuestion, onClose }: { pack: Pack; firstQuestion: string | null; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ id: seq++, role: "bot", kind: "greeting" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const name = pack.place.name;

  const ask = useCallback(
    async (raw: string) => {
      const q = raw.trim().slice(0, 200);
      if (q.length < 3) return;
      setAsked((a) => [...a, q]);
      setInput("");
      const local = answerLocally(pack, q);
      if (local.confidence === "high") {
        setMsgs((m) => [...m, { id: seq++, role: "user", text: q }, { id: seq++, role: "bot", kind: "answer", text: null, notes: local.notes, ai: false }]);
        return;
      }
      const loadingId = seq++;
      setMsgs((m) => [...m, { id: seq++, role: "user", text: q }, { id: loadingId, role: "bot", kind: "loading" }]);
      setBusy(true);
      let next: Msg;
      try {
        const params = new URLSearchParams({ s: pack.place.stateSlug, q: normalize(q), v: pack.version });
        if (pack.place.kind !== "state") params.set("p", pack.place.slug);
        const res = await fetch(`/api/assistant?${params}`, { headers: { accept: "application/json" } });
        const data = (await res.json().catch(() => ({}))) as { answer?: string | null; notCovered?: boolean };
        if (res.ok && data.answer) next = { id: loadingId, role: "bot", kind: "answer", text: data.answer, notes: notesForAi(pack, q, 3), ai: true };
        else if (res.ok && data.notCovered) next = { id: loadingId, role: "bot", kind: "none", question: q, topics: local.topics };
        else throw new Error("fallback");
      } catch {
        // AI unavailable or limited: show the best we found on the page, or say we don't know.
        next = local.notes.length ? { id: loadingId, role: "bot", kind: "answer", text: null, notes: local.notes, ai: false } : { id: loadingId, role: "bot", kind: "none", question: q, topics: local.topics };
      }
      setMsgs((m) => m.map((x) => (x.id === loadingId ? next : x)));
      setBusy(false);
    },
    [pack],
  );

  // Ask the question picked in the pop-up (scheduled, so the panel paints first).
  useEffect(() => {
    inputRef.current?.focus();
    if (!firstQuestion) return;
    const t = window.setTimeout(() => void ask(firstQuestion), 0);
    return () => window.clearTimeout(t);
  }, [ask, firstQuestion]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const more = pack.suggestions.filter((s) => !asked.includes(s)).slice(0, 3);
  const onLink = () => {
    if (window.matchMedia("(max-width: 639px)").matches) onClose();
  };
  const lastId = msgs[msgs.length - 1]?.id;

  const chips = (list: string[]) => (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {list.map((q) => (
        <button key={q} type="button" disabled={busy} onClick={() => ask(q)} className="rounded-full border border-line bg-white px-3 py-1.5 text-left text-xs text-ink transition hover:border-[#2D5A3F] hover:bg-[#EEF4F0] disabled:opacity-50">{q}</button>
      ))}
    </div>
  );

  const noteLink = (n: Note) =>
    n.href ? (
      n.href.startsWith("#") ? (
        <a href={n.href} onClick={onLink} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#2D5A3F] hover:text-coral">Read more <Icon name="arrowRight" size={12} /></a>
      ) : (
        <Link href={n.href} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#2D5A3F] hover:text-coral">Open {n.label.toLowerCase()} <Icon name="arrowRight" size={12} /></Link>
      )
    ) : null;

  return (
    <section
      role="dialog"
      aria-label={`${name} assistant`}
      className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] animate-[fadeIn_.2s_ease-out] flex-col overflow-hidden rounded-t-3xl border border-line bg-[#FBFAF7] shadow-[0_-10px_50px_-10px_rgba(0,0,0,.35)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(36rem,calc(100dvh-7rem))] sm:w-[24rem] sm:rounded-3xl"
    >
      <header className="flex items-center gap-3 bg-[#1F3F2C] px-4 py-3.5 text-white">
        <span className="flex size-9 items-center justify-center rounded-full bg-white/15"><Icon name="sparkles" size={17} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[1.0625rem] font-medium leading-tight">{name} assistant</p>
          <p className="text-xs text-white/75">Answers from this guide</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="flex size-9 items-center justify-center rounded-full text-2xl leading-none hover:bg-white/15">×</button>
      </header>

      <div ref={listRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {msgs.map((m) => {
          if (m.role === "user") return <p key={m.id} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#2D5A3F] px-3.5 py-2 text-sm text-white">{m.text}</p>;
          if (m.kind === "greeting")
            return (
              <div key={m.id} className="max-w-[92%]">
                <p className="rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink">Hi! I can answer questions about {name} from this guide — seasons, getting there, permits, costs, things to do and more. Try one of these:</p>
                {chips(pack.suggestions.slice(0, 5))}
              </div>
            );
          if (m.kind === "loading")
            return (
              <p key={m.id} className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3" aria-label="Looking that up">
                {[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-bounce rounded-full bg-[#2D5A3F]" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </p>
            );
          if (m.kind === "none")
            return (
              <div key={m.id} className="max-w-[92%]">
                <div className="rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink">
                  <p>I couldn’t find that in our {name} guide.</p>
                  <Link href={routes.chatWithPrompt(`${m.question} (${name})`)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#2D5A3F] hover:text-coral"><Icon name="sparkles" size={12} /> Ask our full AI trip planner</Link>
                </div>
                {m.id === lastId && m.topics.length ? chips(m.topics.map((t) => t.question).filter((q) => !asked.includes(q)).slice(0, 3)) : null}
              </div>
            );
          return (
            <div key={m.id} className="max-w-[92%]">
              <div className="rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-3 text-sm leading-relaxed text-ink">
                {m.text ? <p>{m.text}</p> : null}
                {m.notes.length ? (
                  <div className={m.text ? "mt-2.5 border-t border-line-subtle pt-2" : ""}>
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[#888]">{!m.text && m.notes.every((n) => n.label === m.notes[0].label) ? `From “${m.notes[0].label}”` : "From this page"}</p>
                    <ul className="mt-1.5 space-y-2">
                      {m.notes.map((n) => (
                        <li key={n.id} className={m.text ? "text-xs text-[#555]" : "text-[0.8125rem] text-[#333]"}>
                          {m.notes.some((x) => x.label !== m.notes[0].label) ? <span className="block text-[0.625rem] font-semibold uppercase tracking-wider text-[#B9442B]">{n.label}</span> : null}
                          {n.title ? <strong className="font-semibold text-ink">{n.title}: </strong> : null}
                          {m.text ? (n.text.length > 140 ? `${n.text.slice(0, 139)}…` : n.text) : n.text}
                          {n.status ? <StatusPill status={n.status} className="ml-1.5 align-middle" /> : null}
                          <span className="block">{noteLink(n)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {m.ai ? <p className="mt-2 text-[0.625rem] text-[#999]">Written by AI from this guide — check the badges for how sure we are.</p> : null}
              </div>
              {m.id === lastId && more.length ? chips(more) : null}
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void ask(input);
        }}
        className="border-t border-line bg-white p-3"
      >
        <div className="flex items-center gap-2 rounded-full border border-line bg-[#FBFAF7] p-1 pl-4 focus-within:border-[#2D5A3F]">
          <label htmlFor="asst-input" className="sr-only">Ask about {name}</label>
          <input ref={inputRef} id="asst-input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={200} placeholder={`Ask about ${name}…`} className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-[#999] focus:outline-none" />
          <button type="submit" disabled={busy || input.trim().length < 3} aria-label="Send" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2D5A3F] text-white transition hover:bg-[#244A33] disabled:opacity-40"><Icon name="send" size={15} /></button>
        </div>
        <Link href={routes.chatWithPrompt(`Plan a trip to ${name}`)} className="mt-2 flex items-center justify-center gap-1 text-[0.6875rem] font-semibold text-[#2D5A3F] hover:text-coral">Need a full day-by-day plan? Try the AI trip planner <Icon name="arrowRight" size={11} /></Link>
      </form>
    </section>
  );
}
