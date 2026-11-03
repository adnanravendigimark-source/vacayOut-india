"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";

/** Opens the AI planner with a prompt about this page. */
export function PlanAiButton({ prompt, children, className }: { prompt: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open ? <AiPlannerModal isOpen onClose={() => setOpen(false)} initialPrompt={prompt} /> : null}
    </>
  );
}

/**
 * Cards with filter chips (a card can sit in several groups) and a "show all" button.
 * Chips appear only when there are at least two groups; counts are real card counts.
 */
export function FilterCards({
  items,
  initial = 8,
  allLabel = "All",
  gridClass,
  label,
}: {
  items: { key: string; groups: string[]; node: ReactNode }[];
  initial?: number;
  allLabel?: string;
  gridClass: string;
  label: string;
}) {
  const [group, setGroup] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const groups = [...new Set(items.flatMap((i) => i.groups))].map((g) => ({ g, n: items.filter((i) => i.groups.includes(g)).length })).filter((x) => x.n > 0 && x.n < items.length);
  const shown = group ? items.filter((i) => i.groups.includes(group)) : items;
  const visible = all ? shown : shown.slice(0, initial);
  return (
    <div className="space-y-5">
      {groups.length > 1 ? (
        <div role="group" aria-label={label} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {[{ g: null as string | null, n: items.length }, ...groups].map(({ g, n }) => (
            <button
              key={g ?? "all"}
              type="button"
              aria-pressed={group === g}
              onClick={() => {
                setGroup(g);
                setAll(false);
              }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${group === g ? "bg-ink text-white" : "border border-[#E5E2DC] bg-white text-[#666] hover:border-ink hover:text-ink"}`}
            >
              {g ?? allLabel} <span className={group === g ? "font-medium text-white/70" : "font-medium text-[#999]"}>{n}</span>
            </button>
          ))}
        </div>
      ) : null}
      <ul className={gridClass}>
        {visible.map((i) => (
          <li key={i.key} className="flex">
            {i.node}
          </li>
        ))}
      </ul>
      {shown.length > initial ? (
        <button type="button" onClick={() => setAll((a) => !a)} className="mx-auto flex items-center gap-1.5 rounded-full border border-[#E5E2DC] bg-white px-5 py-2 text-sm font-semibold text-ink transition hover:border-ink">
          {all ? "Show fewer" : `Show all ${shown.length}`} <Icon name="chevronDown" size={15} className={`transition-transform ${all ? "rotate-180" : ""}`} />
        </button>
      ) : null}
    </div>
  );
}
