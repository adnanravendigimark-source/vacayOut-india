import Link from "next/link";
import { ChatBudgetForm } from "@/components/admin/chat-budget-form";
import { requireUser } from "@/lib/auth/guard";
import { LIMITS, chatBudget, chatStats, getChatBudgetUsd } from "@/lib/chat/quota";
import { chatModel, chatResearchModel, routeModel } from "@/lib/chat/live/agent";
import { usd } from "@/lib/research/cost";

export default async function ChatAdminPage() {
  const user = await requireUser();
  const [b, budgetUsd, stats] = await Promise.all([chatBudget(), getChatBudgetUsd(), chatStats()]);

  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/settings" className="text-sm text-muted hover:underline">← Settings</Link>
      <h1 className="font-serif text-2xl font-medium">Chat</h1>
      <section className="grid gap-4 sm:grid-cols-4">
        {[
          ["Messages this month", String(stats?.total ?? 0)],
          ["Declined (not India travel)", String(stats?.outOfScope ?? 0)],
          ["Used web research", `${stats?.researched ?? 0} (${stats?.cacheHits ?? 0} from cache)`],
          ["Spent / budget", `${usd(b.spent)} / ${usd(b.budgetMicro)}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line bg-white p-4">
            <p className="text-xs text-muted">{k}</p>
            <p className="mt-1 text-xl font-semibold">{v}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-line bg-white p-5 text-sm">
        <h2 className="font-semibold">Settings</h2>
        <p className="mt-1 text-muted">
          Models: routing <code>{routeModel()}</code>, answers <code>{chatModel()}</code>, web research <code>{chatResearchModel()}</code>. Visitors get {LIMITS.freeChats} free chats (up to {LIMITS.freeMessagesPerChat} messages each), then must sign up; signed-in travellers get {LIMITS.travellerPerDay} a day. Live web research: {LIMITS.researchAnonPerDay}/day for visitors, {LIMITS.researchTravellerPerDay}/day signed in (cached answers don’t count).
        </p>
        {user.role === "admin" ? <div className="mt-3"><ChatBudgetForm current={budgetUsd} /></div> : null}
      </section>

      <p className="text-sm text-muted">What travellers asked that needed web research is listed under <Link href="/admin/research#questions" className="underline">Research &amp; Review</Link>.</p>
    </div>
  );
}
