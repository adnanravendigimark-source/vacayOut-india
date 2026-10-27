"use client";

import { travellerSignOutAction } from "@/app/account/actions";
import { SIGNED_IN_EVENT, useMe } from "@/components/account/auth-panel";
import { openAuth } from "@/lib/chat/client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { deleteChat, useChats, useHydrated, type Chat } from "@/lib/chat/store";
import { routes } from "@/lib/routes";

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

  return (
    <aside className="sticky top-0 flex max-h-dvh flex-col gap-4 overflow-y-auto px-4 py-5">
      <Link
        href={routes.chat}
        onClick={onNavigate}
        className="flex items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-[0.875rem] font-semibold text-white hover:bg-forest-deep"
      >
        <Icon name="sparkles" size={16} />
        New trip
      </Link>

      <nav aria-label="Chat history">
        <h2 className="px-2 text-[0.75rem] font-semibold text-muted">Chat history</h2>
        {hydrated && chats.length > 0 ? (
          groupChats(chats).map((g) => (
            <div key={g.label} className="mt-3">
              <h3 className="px-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted/80">{g.label}</h3>
              <ul className="mt-1 space-y-0.5">
                {g.items.map((c) => {
                  const on = c.id === activeId;
                  return (
                    <li key={c.id} className={`group flex items-center rounded-lg ${on ? "bg-sand" : "hover:bg-sand/60"}`}>
                      <Link
                        href={routes.chatThread(c.id)}
                        onClick={onNavigate}
                        aria-current={on ? "page" : undefined}
                        title={c.title}
                        className="min-w-0 flex-1 px-2.5 py-2"
                      >
                        <span className={`block truncate text-[0.8125rem] ${on ? "font-semibold text-ink" : "text-ink/90"}`}>{c.title}</span>
                      </Link>
                      <button
                        type="button"
                        aria-label={`Delete “${c.title}”`}
                        onClick={() => {
                          deleteChat(c.id);
                          if (on) {
                            onNavigate?.();
                            router.push(routes.chat);
                          }
                        }}
                        className="mr-1 rounded-md p-1.5 text-muted opacity-100 hover:bg-white hover:text-ink focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
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
      <p className="mt-2 px-2 text-[0.6875rem] leading-relaxed text-muted">Trips are saved in this browser only.</p>
    </aside>
  );
}

function AccountBox() {
  const me = useMe();
  if (!me) return <div className="mt-auto" />;
  if (me.traveller) {
    return (
      <div className="mt-auto rounded-lg border border-line bg-white px-3 py-2 text-[0.75rem]">
        <p className="truncate font-semibold text-ink">{me.traveller.name || me.traveller.email}</p>
        <form
          action={async () => {
            await travellerSignOutAction();
            window.dispatchEvent(new CustomEvent(SIGNED_IN_EVENT));
          }}
        >
          <button type="submit" className="text-muted underline underline-offset-2 hover:text-ink">Sign out</button>
        </form>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => openAuth({ mode: "signin" })} className="mt-auto rounded-lg border border-line bg-white px-3 py-2 text-left text-[0.75rem] font-semibold text-ink hover:border-ink">
      Sign in or create a free account
    </button>
  );
}
