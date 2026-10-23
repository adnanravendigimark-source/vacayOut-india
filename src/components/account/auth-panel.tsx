"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { googleSignInAction, signUpAction, travellerSignInAction, type AccountState } from "@/app/account/actions";
import { AUTH_EVENT, type AuthEventDetail } from "@/lib/chat/client";

type Me = { traveller: { name: string; email: string } | null; google: boolean };
export const SIGNED_IN_EVENT = "vacayout:signed-in";

const idle: AccountState = { ok: false };
const input = "mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-[0.9375rem] outline-none focus:border-ink";

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

function Message({ state }: { state: AccountState }) {
  if (!state.message) return null;
  return <p role="alert" className={`rounded-lg px-3 py-2 text-[0.875rem] ${state.ok ? "bg-forest-soft text-forest" : "bg-red-50 text-red-800"}`}>{state.message}</p>;
}

function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, idle);
  if (state.step === "check_email") return <Message state={state} />;
  return (
    <form action={action} className="space-y-3">
      <label className="block text-[0.875rem] font-medium">Name<input name="name" required maxLength={80} autoComplete="name" defaultValue={state.fields?.name} className={input} /></label>
      <label className="block text-[0.875rem] font-medium">Email<input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={state.fields?.email} className={input} /></label>
      <label className="block text-[0.875rem] font-medium">Password <span className="font-normal text-muted">(10+ characters)</span><input name="password" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={input} /></label>
      <Message state={state} />
      <button type="submit" disabled={pending} className="h-11 w-full rounded-lg bg-coral font-semibold text-white hover:bg-coral-hover disabled:opacity-60">{pending ? "Creating account…" : "Create free account"}</button>
    </form>
  );
}

function SignInForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(travellerSignInAction, idle);
  const doneRef = useRef(false);
  useEffect(() => {
    if (state.step === "signed_in" && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [state.step, onDone]);
  return (
    <form action={action} className="space-y-3">
      <label className="block text-[0.875rem] font-medium">Email<input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={state.fields?.email} className={input} /></label>
      <label className="block text-[0.875rem] font-medium">Password<input name="password" type="password" required maxLength={200} autoComplete="current-password" className={input} /></label>
      <Message state={state} />
      <button type="submit" disabled={pending} className="h-11 w-full rounded-lg bg-ink font-semibold text-white hover:bg-black disabled:opacity-60">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

/**
 * Sign-up / sign-in dialog for travellers. Opens when the chat reports the
 * free messages are used up, from "Sign up" links, or after an email link.
 */
export function AuthPanel() {
  const router = useRouter();
  const params = useSearchParams();
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

  // Arriving from the email confirmation link.
  const account = params.get("account");
  useEffect(() => {
    if (account !== "verified" && account !== "link-invalid") return;
    const t = setTimeout(() => {
      setMode("signin");
      setNote(account === "verified" ? "Email confirmed — sign in to keep planning." : "That link has expired or was already used. Sign in, or sign up again to get a new link.");
      setOpen(true);
    }, 0);
    return () => clearTimeout(t);
  }, [account]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const signedIn = useCallback(() => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent(SIGNED_IN_EVENT));
    router.refresh();
  }, [router]);

  return (
    <dialog
      ref={dialog}
      onClose={() => setOpen(false)}
      aria-labelledby="auth-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-canvas p-0 text-ink shadow-2xl backdrop:bg-black/50"
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
            <>
              {me?.google ? (
                <form action={googleSignInAction} className="mt-5">
                  <input type="hidden" name="back" value={typeof window !== "undefined" ? window.location.pathname : "/chat"} />
                  <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white font-semibold hover:border-ink">
                    <span aria-hidden className="font-bold text-[#4285F4]">G</span> Continue with Google
                  </button>
                </form>
              ) : null}
              <div className="mt-5">{mode === "signup" ? <SignUpForm /> : <SignInForm onDone={signedIn} />}</div>
              <p className="mt-4 text-center text-[0.875rem] text-muted">
                {mode === "signup" ? "Already have an account? " : "New to VacayOut? "}
                <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="font-semibold text-ink underline underline-offset-4">
                  {mode === "signup" ? "Sign in" : "Create one"}
                </button>
              </p>
            </>
          )}
        </div>
      ) : null}
    </dialog>
  );
}
