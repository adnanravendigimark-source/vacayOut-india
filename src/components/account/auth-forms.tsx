"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { googleSignInAction, signUpAction, travellerSignInAction, type AccountState } from "@/app/account/actions";

const idle: AccountState = { ok: false };
const input = "mt-1.5 h-11 w-full rounded-xl border border-[#DCD8CF] bg-white px-3.5 text-[0.9375rem] text-ink outline-none transition-colors placeholder:text-[#9A968D] focus:border-[#234832] focus:ring-2 focus:ring-[#234832]/15";
const primary = "flex h-11 w-full items-center justify-center rounded-xl bg-[#234832] font-semibold text-white transition-colors hover:bg-[#1A3726] disabled:opacity-60";

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
    <p role={state.ok ? "status" : "alert"} className={`rounded-xl px-3.5 py-2.5 text-[0.875rem] ${state.ok ? "bg-[#E6EFE8] text-[#234832]" : "bg-red-50 text-red-800"}`}>
      {state.message}
    </p>
  );
}

export function GoogleButton({ next, label = "Continue with Google" }: { next: string; label?: string }) {
  return (
    <form action={googleSignInAction}>
      <input type="hidden" name="next" value={next} />
      <button type="submit" className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#DCD8CF] bg-white font-semibold text-ink transition-colors hover:border-[#234832]">
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
    <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-[#8A867D]">
      <span className="h-px flex-1 bg-[#E5E2DC]" />
      or
      <span className="h-px flex-1 bg-[#E5E2DC]" />
    </div>
  );
}

export function SignInForm({ next, siteKey }: { next: string; siteKey: string | null }) {
  const [state, action, pending] = useActionState(travellerSignInAction, idle);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block text-[0.875rem] font-medium text-ink">
        Email
        <input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" defaultValue={state.fields?.email} className={input} />
      </label>
      <label className="block text-[0.875rem] font-medium text-ink">
        Password
        <input name="password" type="password" required maxLength={200} autoComplete="current-password" className={input} />
      </label>
      {siteKey ? <Captcha siteKey={siteKey} resetKey={state} /> : null}
      <Message state={state} />
      <button type="submit" disabled={pending} className={primary}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function SignUpForm({ next, siteKey }: { next: string; siteKey: string | null }) {
  const [state, action, pending] = useActionState(signUpAction, idle);
  if (state.step === "check_email") {
    return (
      <div className="space-y-4 text-center">
        <Message state={state} />
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={primary}>Go to sign in</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <label className="block text-[0.875rem] font-medium text-ink">
        Name
        <input name="name" required maxLength={80} autoComplete="name" placeholder="Your name" defaultValue={state.fields?.name} className={input} />
      </label>
      <label className="block text-[0.875rem] font-medium text-ink">
        Email
        <input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" defaultValue={state.fields?.email} className={input} />
      </label>
      <label className="block text-[0.875rem] font-medium text-ink">
        Password <span className="font-normal text-[#8A867D]">(at least 10 characters)</span>
        <input name="password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={input} />
      </label>
      {siteKey ? <Captcha siteKey={siteKey} resetKey={state} /> : null}
      <Message state={state} />
      <button type="submit" disabled={pending} className={primary}>{pending ? "Creating account…" : "Create account"}</button>
    </form>
  );
}
