"use client";

import { useEffect, useState } from "react";
import { openAuth, QUOTA_EVENT } from "@/lib/chat/client";

/** "2 free messages left" — shown to visitors who aren't signed in, once they're running low. */
export function FreeMessagesHint() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const on = (e: Event) => setLeft((e as CustomEvent<{ freeLeft: number }>).detail.freeLeft);
    window.addEventListener(QUOTA_EVENT, on);
    return () => window.removeEventListener(QUOTA_EVENT, on);
  }, []);
  if (left === null || left > 3) return null;
  return (
    <p className="mt-2 text-center text-[0.75rem] text-ink/80" role="status">
      {left === 0 ? "That was your last free message." : `${left} free message${left === 1 ? "" : "s"} left.`}{" "}
      <button type="button" onClick={() => openAuth({ mode: "signup" })} className="font-semibold text-coral underline underline-offset-2">
        Sign up free
      </button>{" "}
      to keep planning.
    </p>
  );
}
