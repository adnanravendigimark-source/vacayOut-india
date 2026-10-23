"use client";

import { travellerSignOutAction } from "@/app/account/actions";
import { SIGNED_IN_EVENT, useMe } from "@/components/account/auth-panel";
import { openAuth } from "@/lib/chat/client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { deleteChat, useChats, useHydrated } from "@/lib/chat/store";
import { routes } from "@/lib/routes";

function when(ts: number) {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function ChatSidebar({ activeId }: { activeId: string | null }) {
  const chats = useChats();
  const hydrated = useHydrated();
  const router = useRouter();

  return (
    <aside className="sticky top-0 flex max-h-dvh flex-col gap-4 overflow-y-auto px-4 py-5">
      <Link
        href={routes.chat}
        className="flex items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-[0.875rem] font-semibold text-white hover:bg-forest-deep"
      >
        <Icon name="sparkles" size={16} />
        New trip
      </Link>

      <nav aria-label="Your trips">
        <h2 className="px-2 text-[0.75rem] font-semibold text-muted">Your trips</h2>
        {hydrated && chats.length > 0 ? (
          <ul className="mt-2 space-y-0.5">
            {chats.map((c) => {
              const on = c.id === activeId;
              return (
                <li key={c.id} className={`group flex items-center rounded-lg ${on ? "bg-sand" : "hover:bg-sand/60"}`}>
                  <Link
                    href={routes.chatThread(c.id)}
                    aria-current={on ? "page" : undefined}
                    className="min-w-0 flex-1 px-2.5 py-2"
                  >
                    <span className={`block truncate text-[0.8125rem] ${on ? "font-semibold text-ink" : "text-ink/90"}`}>{c.title}</span>
                    <span className="block text-[0.6875rem] text-muted">{when(c.updatedAt)}</span>
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete “${c.title}”`}
                    onClick={() => {
                      deleteChat(c.id);
                      if (on) router.push(routes.chat);
                    }}
                    className="mr-1 rounded-md p-1.5 text-muted opacity-0 hover:bg-white hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Icon name="x" size={13} strokeWidth={2} />
                  </button>
                </li>
              );
            })}
          </ul>
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
