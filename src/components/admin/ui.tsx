export const inputClass = "mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink";
export const textareaClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-ink";
export const buttonClass = "inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-black disabled:opacity-50";
export const secondaryButtonClass = "inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink hover:border-ink disabled:opacity-50";

const STATUS: Record<string, string> = {
  draft: "bg-sand text-ink",
  in_review: "bg-amber-100 text-amber-900",
  published: "bg-emerald-100 text-emerald-900",
  archived: "bg-zinc-200 text-zinc-700",
  approved: "bg-emerald-100 text-emerald-900",
};
const LABEL: Record<string, string> = { draft: "Draft", in_review: "In review", published: "Published", archived: "Archived", approved: "Approved" };

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[status] ?? "bg-sand"}`}>{LABEL[status] ?? status}</span>;
}

export function Notice({ state }: { state: { ok: boolean; message?: string; problems?: string[] } }) {
  if (!state.message && !state.problems?.length) return null;
  return (
    <div role="status" className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>
      {state.message}
      {state.problems?.length ? (
        <ul className="mt-1 list-disc pl-5">
          {state.problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

const PILL: Record<string, [string, string]> = {
  approved: ["bg-emerald-100 text-emerald-900", "Approved"],
  ready: ["bg-sky-100 text-sky-900", "Ready"],
  needs_review: ["bg-amber-100 text-amber-900", "Needs review"],
  missing: ["bg-zinc-100 text-zinc-600", "Missing information"],
};

/** Section/review state: Approved · Ready · Needs review · Missing information. */
export function StatePill({ state }: { state: string }) {
  const [cls, label] = PILL[state] ?? ["bg-sand", state];
  return <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-serif text-[1.75rem] font-medium leading-tight">{title}</h1>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
