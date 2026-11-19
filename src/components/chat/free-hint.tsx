"use client";

import { openAuth } from "@/lib/chat/client";
import { useQuota } from "@/lib/chat/quota-client";
import { quotaView } from "@/lib/chat/quota-view";

/** "3 of 5 free questions left · Sign up free" — under the message box, for visitors who aren't signed in. */
export function FreeMessagesHint({ activeChatId = null }: { activeChatId?: string | null }) {
  const v = quotaView(useQuota(), activeChatId);
  // When the box is closed, the sign-up row above already says it.
  if (!v.hint || v.locked) return null;
  return (
    <p className="mt-2 text-center text-[0.75rem] text-[#666666]" role="status" aria-live="polite">
      <span className="tabular-nums">{v.hint}</span>
      <span aria-hidden className="mx-1.5 text-[#BBBBBB]">·</span>
      <button type="button" onClick={() => openAuth({ mode: "signup", ...(v.reason ? { message: v.reason } : {}) })} className="font-semibold text-[#B8432A] underline-offset-2 hover:underline">
        Sign up free
      </button>
    </p>
  );
}
