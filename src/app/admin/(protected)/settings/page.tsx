import Link from "next/link";
import { BudgetForm } from "@/components/admin/research/budget-form";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/guard";
import { chatBudget } from "@/lib/chat/quota";
import { usd } from "@/lib/research/cost";
import { budgetStatus, checkModel, draftModel, getBudgetUsd, imageModel, researchModel } from "@/lib/research/service";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [b, budgetUsd, chat] = await Promise.all([budgetStatus(), getBudgetUsd(), chatBudget()]);
  const admin = user.role === "admin";
  const links = [
    { href: "/admin/chat", title: "Chat", body: `AI planner usage and its monthly budget (${usd(chat.spent)} of ${usd(chat.budgetMicro)} used).` },
    ...(admin ? [{ href: "/admin/users", title: "Team", body: "Admins and editors who can sign in." }] : []),
    ...(admin ? [{ href: "/admin/system", title: "System", body: "Errors, stalled jobs, setup checks and migrations." }] : []),
    { href: "/admin/audit", title: "Activity", body: "Who changed what, and when." },
  ];
  return (
    <div className="max-w-3xl space-y-6">
      <PageTitle title="Settings" />
      <section className="rounded-xl border border-line bg-white p-5 text-sm">
        <h2 className="font-semibold">AI budget for destinations</h2>
        <p className="mt-1 text-muted">
          Research, writing and illustrations this month: <strong className="text-ink">{usd(b.spent)}</strong> of {usd(b.budgetMicro)}
          {b.reserved ? ` (${usd(b.reserved)} held for work in progress)` : ""}. A full destination costs roughly $0.60–0.80. Budget months follow India time.
        </p>
        {admin ? <div className="mt-3"><BudgetForm current={budgetUsd} /></div> : null}
        <p className="mt-3 text-xs text-muted">Models: research {researchModel()}, source checks {checkModel()}, writing {draftModel()}, illustrations {imageModel()}. Costs are estimates; your OpenAI bill is final.</p>
      </section>
      <ul className="grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="block h-full rounded-xl border border-line bg-white p-4 hover:border-ink">
              <p className="font-semibold">{l.title} →</p>
              <p className="mt-1 text-sm text-muted">{l.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
