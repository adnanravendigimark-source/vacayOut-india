"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { googleSignInAction, signUpAction, travellerSignInAction, type AccountState } from "@/app/account/actions";

const idle: AccountState = { ok: false };
const input = "mt-1 h-11 w-full rounded-xl border border-line bg-[#FBFAF8] px-4 text-[0.9375rem] text-ink outline-none transition-colors placeholder:text-[#9A968D] focus:border-ink focus:bg-white focus:ring-4 focus:ring-ink/5";
const label = "block text-[0.8125rem] font-semibold text-ink";
const primary = "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink font-semibold text-white transition-colors hover:bg-coral disabled:opacity-60";

/** Password input with a show/hide button. */
function PasswordField({ name, autoComplete, minLength, hint }: { name: string; autoComplete: string; minLength?: number; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className={label}>
      Password {hint ? <span className="font-normal text-[#8A867D]">({hint})</span> : null}
      <span className="relative block">
        <input name={name} type={show ? "text" : "password"} required minLength={minLength} maxLength={200} autoComplete={autoComplete} className={`${input} pr-16`} />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-2 top-1/2 mt-[2px] -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-[#F1EEE8] hover:text-ink"
        >
          {show ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}

type Grecaptcha = { ready: (cb: () => void) => void; render: (el: HTMLElement, opts: { sitekey: string }) => number; reset: (id?: number) => void };
declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

let scriptLoading: Promise<void> | null = null;
function loadRecaptcha() {
  scriptLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    s.async = true;
    s.onload = () => window.grecaptcha!.ready(() => resolve());
    s.onerror = () => {
      scriptLoading = null;
      reject(new Error("CAPTCHA failed to load"));
    };
    document.head.appendChild(s);
  });
  return scriptLoading;
}

/**
 * reCAPTCHA v2 checkbox. The widget adds a hidden `g-recaptcha-response` field
 * to the surrounding form; the server verifies it. `resetKey` changes after
 * every submit because a token can only be used once.
 */
function Captcha({ siteKey, resetKey }: { siteKey: string; resetKey: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    loadRecaptcha()
      .then(() => {
        if (live && box.current && widget.current === null) widget.current = window.grecaptcha!.render(box.current, { sitekey: siteKey });
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [siteKey]);

  useEffect(() => {
    if (widget.current !== null) window.grecaptcha?.reset(widget.current);
  }, [resetKey]);

  return (
    <div>
      <div ref={box} className="min-h-[78px] origin-left max-[360px]:scale-90" />
      {failed ? <p className="text-[0.8125rem] text-red-700">The “I’m not a robot” check couldn’t load. Check your connection and reload the page.</p> : null}
    </div>
  );
}

function Message({ state }: { state: AccountState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-xl px-4 py-3 text-[0.875rem] leading-snug ${state.ok ? "bg-[#E9F3EC] text-[#1B4332]" : "bg-red-50 text-red-800"}`}>
      {state.message}
    </p>
  );
}

export function GoogleButton({ next, label = "Continue with Google" }: { next: string; label?: string }) {
  return (
    <form action={googleSignInAction}>
      <input type="hidden" name="next" value={next} />
      <button type="submit" className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-white font-semibold text-ink transition-colors hover:border-ink hover:bg-[#FBFAF8]">
        <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {label}
      </button>
    </form>
  );
}

export function Divider() {
  return (
    <div className="my-4 flex items-center gap-3 text-xs text-[#8A867D]">
      <span className="h-px flex-1 bg-line" />
      or with email
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function SignInForm({ next, siteKey }: { next: string; siteKey: string | null }) {
  const [state, action, pending] = useActionState(travellerSignInAction, idle);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className={label}>
        Email
        <input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" defaultValue={state.fields?.email} className={input} />
      </label>
      <PasswordField name="password" autoComplete="current-password" />
      {siteKey ? <Captcha siteKey={siteKey} resetKey={state} /> : null}
      <Message state={state} />
      <button type="submit" disabled={pending} className={primary}>{pending ? "Signing in…" : <>Sign in <span aria-hidden>→</span></>}</button>
    </form>
  );
}

export function SignUpForm({ next, siteKey }: { next: string; siteKey: string | null }) {
  const [state, action, pending] = useActionState(signUpAction, idle);
  if (state.step === "check_email") {
    return (
      <div className="space-y-5 text-center">
        <span aria-hidden className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#E9F3EC] text-2xl">✉️</span>
        <Message state={state} />
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={primary}>Go to sign in</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <label className={label}>
        Name
        <input name="name" required maxLength={80} autoComplete="name" placeholder="Your name" defaultValue={state.fields?.name} className={input} />
      </label>
      <label className={label}>
        Email
        <input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" defaultValue={state.fields?.email} className={input} />
      </label>
      <PasswordField name="password" autoComplete="new-password" minLength={10} hint="at least 10 characters" />
      {siteKey ? <Captcha siteKey={siteKey} resetKey={state} /> : null}
      <Message state={state} />
      <button type="submit" disabled={pending} className={primary}>{pending ? "Creating account…" : <>Create account <span aria-hidden>→</span></>}</button>
    </form>
  );
}
