"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { GoogleButton } from "./auth-forms";
import { AUTH_EVENT, type AuthEventDetail } from "@/lib/chat/client";

type Me = { traveller: { name: string; email: string } | null; google: boolean };
export const SIGNED_IN_EVENT = "vacayout:signed-in";

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const load = useCallback(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Me>) : null))
      .then((m) => m && setMe(m))
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
    window.addEventListener(SIGNED_IN_EVENT, load);
    return () => window.removeEventListener(SIGNED_IN_EVENT, load);
  }, [load]);
  return me;
}

/**
 * Sign-up / sign-in dialog for travellers. Opens when the chat reports the
 * free messages are used up, from "Sign up" links, or after an email link.
 */
export function AuthPanel() {
  const pathname = usePathname();
  const me = useMe();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [note, setNote] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<AuthEventDetail>).detail ?? {};
      setMode(d.mode ?? "signup");
      setNote(d.message ?? null);
      setOpen(true);
    };
    window.addEventListener(AUTH_EVENT, on);
    return () => window.removeEventListener(AUTH_EVENT, on);
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Email sign-in and sign-up live on their own pages (the CAPTCHA can't sit inside a modal); come back here afterwards.
  const next = encodeURIComponent(pathname || "/chat");
  const primary = "flex h-11 w-full items-center justify-center rounded-xl bg-[#234832] font-semibold text-white hover:bg-[#1A3726]";

  return (
    <dialog
      ref={dialog}
      onClose={() => setOpen(false)}
      aria-labelledby="auth-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-[#E5E2DC] bg-white p-0 text-ink shadow-2xl backdrop:bg-black/50"
    >
      {open ? (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="auth-title" className="font-serif text-[1.6rem] font-medium leading-tight">{mode === "signup" ? "Keep planning — it’s free" : "Welcome back"}</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-md px-2 py-1 text-muted hover:text-ink">✕</button>
          </div>
          {note ? <p className="mt-2 text-[0.9375rem] text-muted">{note}</p> : null}
          {me?.traveller ? (
            <p className="mt-4 text-[0.9375rem]">You’re signed in as {me.traveller.name || me.traveller.email}.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {me?.google ? <GoogleButton next={decodeURIComponent(next)} /> : null}
              <Link href={`/${mode === "signup" ? "signup" : "login"}?next=${next}`} onClick={() => setOpen(false)} className={primary}>
                {mode === "signup" ? "Sign up with email" : "Sign in with email"}
              </Link>
              <p className="pt-1 text-center text-[0.875rem] text-muted">
                {mode === "signup" ? "Already have an account? " : "New to VacayOut? "}
                <Link href={`/${mode === "signup" ? "login" : "signup"}?next=${next}`} onClick={() => setOpen(false)} className="font-semibold text-ink underline underline-offset-4">
                  {mode === "signup" ? "Sign in" : "Create one"}
                </Link>
              </p>
            </div>
          )}
        </div>
      ) : null}
    </dialog>
  );
}
