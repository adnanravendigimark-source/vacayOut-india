import { Icon, type Name } from "@/components/icons/icon";
import { isAllowedBookingUrl } from "@/lib/chat/constants";
import type { BlockOf } from "@/lib/chat/schema";
import { BlockImage, BlockTitle, Bullets, Card } from "./shared";

function InfoCard({ icon, title, children, photo }: { icon: Name; title: string; children: React.ReactNode; photo?: BlockOf<"stay">["photo"] }) {
  return (
    <Card className="flex h-full gap-4 p-4 sm:p-5">
      <div className="min-w-0 flex-1">
        <BlockTitle icon={icon}>{title}</BlockTitle>
        <div className="mt-2 text-[0.9375rem] leading-relaxed text-[#444444]">{children}</div>
      </div>
      {photo ? <BlockImage photo={photo} sizes="96px" className="relative hidden h-20 w-24 shrink-0 self-start rounded-xl sm:block" /> : null}
    </Card>
  );
}

const MODE_ICON: Record<string, Name> = { Air: "plane", Rail: "train", Road: "car", Bus: "bus", Ferry: "waves" };

/** One row per way of getting there, best option first. */
export function ReachBlock({ block }: { block: BlockOf<"reach"> }) {
  return (
    <InfoCard icon="route" title="How to get there">
      <ul className="divide-y divide-line-subtle">
        {block.items.map((r) => (
          <li key={r.mode + r.text} className="grid grid-cols-[5.5rem_1fr] gap-3 py-2 first:pt-0">
            <span className="inline-flex items-center gap-1.5 pt-px text-[0.8125rem] font-semibold text-ink">
              <Icon name={MODE_ICON[r.mode] ?? "route"} size={14} className="text-[#767676]" />
              {r.mode}
            </span>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
      {block.localTransport ? (
        <p className="mt-2 border-t border-line-subtle pt-2">
          <span className="font-semibold text-ink">Getting around:</span> {block.localTransport}
        </p>
      ) : null}
    </InfoCard>
  );
}

export function StayBlock({ block }: { block: BlockOf<"stay"> }) {
  return (
    <InfoCard icon="hotel" title="Where to Stay" photo={block.photo}>
      <p>{block.body}</p>
      {block.areas.length ? <p className="mt-2">Best areas: {block.areas.join(", ")}</p> : null}
    </InfoCard>
  );
}

export function FoodBlock({ block }: { block: BlockOf<"food"> }) {
  return (
    <InfoCard icon="utensils" title="Food & Dining" photo={block.photo}>
      <p>{block.body}</p>
      {block.dishes.length ? <Bullets items={block.dishes} /> : null}
    </InfoCard>
  );
}

/** Per-day ranges by travel style; always rough ("about"). */
export function BudgetBlock({ block }: { block: BlockOf<"budget"> }) {
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  return (
    <InfoCard icon="coins" title="Rough budget">
      <p className="text-[0.8125rem] text-[#666666]">{block.basis}</p>
      <dl className="mt-2.5 grid gap-2 sm:grid-cols-3">
        {block.tiers.map((t) => (
          <div key={t.label} className="rounded-xl bg-[#FBFAF8] px-3 py-2.5">
            <dt className="text-[0.8125rem] font-semibold text-[#555555]">{t.label}</dt>
            <dd className="mt-0.5">
              <span className="block text-[1rem] font-semibold tabular-nums text-ink">
                {t.high ? `${inr(t.low)}–${t.high.toLocaleString("en-IN")}` : `${inr(t.low)}+`}
              </span>
              {t.includes ? <span className="mt-0.5 block text-[0.8125rem] leading-snug text-[#666666]">{t.includes}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2.5 text-[0.8125rem] text-[#666666]">{block.note}</p>
    </InfoCard>
  );
}

export function BookingsBlock({ block }: { block: BlockOf<"bookings"> }) {
  const items = block.items.filter((b) => isAllowedBookingUrl(b.href));
  if (items.length === 0) return null;
  return (
    <InfoCard icon="ticket" title="Book it">
      <p>These open the provider’s own search. VacayOut doesn’t check prices or availability.</p>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2.5">
        {items.map((b) => (
          <li key={b.label}>
            <a href={b.href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="group flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-sand text-ink"><Icon name={b.icon} size={16} /></span>
              <span className="leading-tight">
                <span className="block text-[0.9375rem] font-medium text-ink group-hover:underline">{b.label}</span>
                <span className="block text-[0.8125rem] text-[#666666]">{b.provider}</span>
              </span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
      {block.disclosure ? <p className="mt-3 text-[0.8125rem] text-[#666666]">{block.disclosure}</p> : null}
    </InfoCard>
  );
}

/** Light inline tips, not a big card. */
export function TipsBlock({ block }: { block: BlockOf<"tips"> }) {
  return (
    <div className="rounded-2xl bg-[#FBFAF8] px-4 py-3 text-[0.9375rem] leading-relaxed text-[#444444]">
      <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-ink">
        <Icon name="bulb" size={14} className="text-[#666666]" /> Good to know
      </p>
      <ul className="mt-1 space-y-0.5">
        {block.items.map((t) => (
          <li key={t} className="flex gap-2.5">
            <span aria-hidden className="mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-[#B5AFA5]" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
