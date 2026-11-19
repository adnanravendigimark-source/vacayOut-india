/**
 * What the chat UI shows for the free-question quota. Pure, so it can be
 * tested; the server is still the authority (it rejects anything over).
 */
export type QuotaInfo = { signedIn: boolean; limit: number; left: number | null; chatId: string | null };

export type QuotaView = {
  /** "3 of 5 free questions left" (anonymous visitors only). */
  hint: string | null;
  /** The message box is closed: sign up to continue. */
  locked: boolean;
  /** Why it is closed, for the sign-up popup. */
  reason: string | null;
  /** "New trip" opens the sign-up popup instead of a new chat. */
  newTripNeedsSignUp: boolean;
};

export const SIGN_UP_AFTER_LIMIT = (limit: number) => `You’ve used your ${limit} free questions. Sign up free to keep planning — this conversation stays with you.`;
export const SIGN_UP_FOR_NEW_TRIP = "Free planning includes one conversation. Sign up free to start a new trip — it takes a minute.";

export function quotaView(q: QuotaInfo | null, activeChatId: string | null): QuotaView {
  if (!q || q.signedIn || q.left === null) return { hint: null, locked: false, reason: null, newTripNeedsSignUp: false };
  // Tied to a conversation and looking at another one (or a blank new chat).
  const otherChat = Boolean(q.chatId && q.chatId !== activeChatId);
  const out = q.left <= 0;
  return {
    hint: `${Math.max(0, q.left)} of ${q.limit} free question${q.limit === 1 ? "" : "s"} left`,
    locked: out || otherChat,
    reason: out ? SIGN_UP_AFTER_LIMIT(q.limit) : otherChat ? SIGN_UP_FOR_NEW_TRIP : null,
    // Once a conversation is tied to them (or the questions are used up), a second one needs an account.
    newTripNeedsSignUp: Boolean(q.chatId) || out,
  };
}

/** After an answer: the new quota, and whether to open the sign-up popup (the last free answer was just shown). */
export function afterAnswer(q: QuotaInfo | null, freeLeft: number | null | undefined, chatId: string): { next: QuotaInfo | null; promptSignUp: boolean } {
  if (typeof freeLeft !== "number" || !q || q.signedIn) return { next: q, promptSignUp: false };
  const answered = q.left === null || freeLeft < q.left;
  return { next: { ...q, left: freeLeft, chatId: q.chatId ?? (answered ? chatId : null) }, promptSignUp: freeLeft === 0 && answered };
}
