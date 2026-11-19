"use client";

import { travellerSignOutAction } from "@/app/account/actions";
import { SIGNED_IN_EVENT, useMe } from "@/components/account/auth-panel";
import { openAuth } from "@/lib/chat/client";
import { useQuota } from "@/lib/chat/quota-client";
import { quotaView, SIGN_UP_FOR_NEW_TRIP } from "@/lib/chat/quota-view";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { deleteChat, useChats, useHydrated, type Chat } from "@/lib/chat/store";
import { routes } from "@/lib/routes";
import { Logo } from "@/components/layout/logo";

/** ChatGPT-style groups: Today, Yesterday, Previous 7 days, then by month. */
function groupLabel(ts: number, now: Date) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= startOfToday) return "Today";
  if (ts >= startOfToday - 86_400_000) return "Yesterday";
  if (ts >= startOfToday - 7 * 86_400_000) return "Previous 7 days";
  if (ts >= startOfToday - 30 * 86_400_000) return "Previous 30 days";
  return new Date(ts).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function groupChats(chats: Chat[]) {
  const now = new Date();
  const groups: { label: string; items: Chat[] }[] = [];
  for (const c of chats) {
    const label = groupLabel(c.updatedAt, now);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(c);
    else groups.push({ label, items: [c] });
  }
  return groups;
}

export function ChatSidebar({ activeId, onNavigate }: { activeId: string | null; onNavigate?: () => void }) {
  const chats = useChats();
  const hydrated = useHydrated();
  const router = useRouter();
  const needsSignUp = quotaView(useQuota(), activeId).newTripNeedsSignUp;

  return (
    <aside className="sticky top-0 flex max-h-dvh flex-col gap-4 overflow-y-auto px-4 py-5">
      <div className="px-1 pt-1"><Logo /></div>
      <Link
        href={routes.chat}
        onClick={(e) => {
          if (needsSignUp) {
            e.preventDefault();
            openAuth({ mode: "signup", message: SIGN_UP_FOR_NEW_TRIP });
          }
          onNavigate?.();
        }}
        className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-4 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <Icon name="arrowRight" size={15} className="-rotate-45" />
        New trip
      </Link>

      <nav aria-label="Chat history">
        <h2 className="px-2 text-[0.8125rem] font-semibold text-ink">Your trips</h2>
        {hydrated && chats.length > 0 ? (
          groupChats(chats).map((g) => (
            <div key={g.label} className="mt-3">
              <h3 className="px-2 text-[0.75rem] font-medium text-[#767676]">{g.label}</h3>
              <ul className="mt-1 space-y-0.5">
                {g.items.map((c) => {
                  const on = c.id === activeId;
                  return (
                    <li key={c.id} className={`group relative flex items-center rounded-xl transition-colors ${on ? "bg-sand" : "hover:bg-[#F4F2ED]"}`}>
                      <Link
                        href={routes.chatThread(c.id)}
                        onClick={onNavigate}
                        aria-current={on ? "page" : undefined}
                        title={c.title}
                        className="min-w-0 flex-1 px-2.5 py-2"
                      >
                        <span className={`block truncate text-[0.8125rem] ${on ? "font-semibold text-ink" : "text-[#333333]"}`}>{c.title}</span>
                      </Link>
                      <button
                        type="button"
                        aria-label={`Delete “${c.title}”`}
                        onClick={() => {
                          if (!window.confirm(`Delete “${c.title}”? This can’t be undone.`)) return;
                          deleteChat(c.id);
                          if (on) {
                            onNavigate?.();
                            router.push(routes.chat);
                          }
                        }}
                        className="mr-0.5 flex size-9 items-center justify-center rounded-full text-[#767676] opacity-100 hover:bg-white hover:text-ink focus-visible:opacity-100 lg:size-8 lg:opacity-0 lg:group-hover:opacity-100"
                      >
                        <Icon name="x" size={13} strokeWidth={2} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        ) : (
          <p className="mt-2 px-2 text-[0.75rem] text-muted">{hydrated ? "Your conversations will appear here." : " "}</p>
        )}
      </nav>

      <AccountBox />
      <p className="mt-2 flex items-center gap-1.5 px-2 text-[0.75rem] leading-relaxed text-[#767676]"><Icon name="shield" size={12} className="shrink-0" />Trips are saved in this browser only.</p>
    </aside>
  );
}

function AccountBox() {
  const me = useMe();
  if (!me) return <div className="mt-auto" />;
  if (me.traveller) {
    return (
      <div className="mt-auto shrink-0 rounded-2xl border border-line bg-white px-3.5 py-2.5 text-[0.8125rem]">
        <p className="truncate font-semibold text-ink">{me.traveller.name || me.traveller.email}</p>
        <form
          action={async () => {
            await travellerSignOutAction();
            window.dispatchEvent(new CustomEvent(SIGNED_IN_EVENT));
          }}
        >
          <button type="submit" className="text-[#666666] underline underline-offset-2 hover:text-ink">Sign out</button>
        </form>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => openAuth({ mode: "signin" })} className="mt-auto flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border border-line bg-white px-3.5 py-2.5 text-left text-[0.8125rem] font-semibold text-ink transition-colors hover:border-ink">
      <Icon name="user" size={14} className="shrink-0 text-[#666666]" />
      Sign in or create a free account
    </button>
  );
}
