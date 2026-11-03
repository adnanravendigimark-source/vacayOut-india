"use client";

import { useState, type ReactNode } from "react";
import { Icon, type Name } from "@/components/icons/icon";
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

export type PracticalTab = {
  key: string;
  title: string;
  icon: Name;
  count: number;
  node: ReactNode;
};

/** Tabbed switcher for practical information categories. */
export function PracticalTabs({ tabs }: { tabs: PracticalTab[] }) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  return (
    <div className="space-y-6">
      {/* Tab Navigation Bar */}
      <div
        role="tablist"
        aria-label="Practical info categories"
        className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab?.key;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              id={`tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              onClick={() => setActiveKey(tab.key)}
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-150 sm:text-sm ${
                isActive
                  ? "bg-ink text-white shadow-sm"
                  : "border border-[#E5E2DC] bg-white text-[#555] hover:border-ink hover:text-ink hover:bg-neutral-50"
              }`}
            >
              <Icon
                name={tab.icon}
                size={16}
                className={isActive ? "text-coral" : "text-[#777]"}
              />
              <span>{tab.title}</span>
              <span
                className={`ml-0.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                  isActive ? "bg-white/20 text-white" : "bg-[#F0ECE1] text-[#666]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content Panel */}
      {activeTab ? (
        <div
          role="tabpanel"
          id={`panel-${activeTab.key}`}
          aria-labelledby={`tab-${activeTab.key}`}
          className="rounded-3xl border border-[#E5E2DC] bg-white p-6 shadow-xs sm:p-8"
        >
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#F0ECE1] pb-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-coral/10 text-coral">
                <Icon name={activeTab.icon} size={20} />
              </span>
              <div>
                <h3 className="font-serif text-lg font-bold text-ink sm:text-xl">{activeTab.title}</h3>
                <p className="text-xs text-[#777]">Essential on-ground guidance and verified rules</p>
              </div>
            </div>
            <span className="self-start rounded-full bg-[#FAF8F5] border border-[#EAE6DE] px-3 py-1 text-xs font-semibold text-[#555] sm:self-auto">
              {activeTab.count} verified points
            </span>
          </div>

          {activeTab.node}
        </div>
      ) : null}
    </div>
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
