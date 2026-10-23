import { Icon, type Name } from "@/components/icons/icon";
import { isAllowedBookingUrl } from "@/lib/chat/constants";
import type { BlockOf } from "@/lib/chat/schema";
import { BlockImage, Bullets, Card } from "./shared";

function InfoCard({ icon, title, children, photo }: { icon: Name; title: string; children: React.ReactNode; photo?: BlockOf<"stay">["photo"] }) {
  return (
    <Card className="flex h-full gap-3.5 p-4">
      <Icon name={icon} size={22} className="mt-0.5 shrink-0 text-forest" />
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-[1rem] font-medium text-ink">{title}</h3>
        <div className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">{children}</div>
      </div>
      {photo ? <BlockImage photo={photo} sizes="96px" className="relative hidden h-20 w-24 shrink-0 self-start rounded-lg sm:block" /> : null}
    </Card>
  );
}

/** ₹8000 -> "8k", ₹12500 -> "12.5k": short enough for three budget columns. */
function k(n: number) {
  return `${Number((n / 1000).toFixed(1))}k`;
}

export function ReachBlock({ block }: { block: BlockOf<"reach"> }) {
  return (
    <InfoCard icon="car" title="How to Reach">
      <ul className="space-y-1">
        {block.items.map((r) => (
          <li key={r.mode}>
            <span className="font-medium text-ink">{r.mode}:</span> {r.text}
          </li>
        ))}
      </ul>
      {block.localTransport ? (
        <p className="mt-2">
          <span className="font-medium text-ink">Getting around:</span> {block.localTransport}
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

export function BudgetBlock({ block }: { block: BlockOf<"budget"> }) {
  return (
    <InfoCard icon="coins" title="Estimated Budget">
      <p>({block.basis})</p>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {block.tiers.map((t) => (
          <div key={t.label}>
            <dt className="text-[0.6875rem]">{t.label}</dt>
            <dd className="mt-0.5 whitespace-nowrap text-[0.875rem] font-semibold text-ink">
              <span className="sr-only">
                {t.high ? `₹${t.low.toLocaleString("en-IN")} to ₹${t.high.toLocaleString("en-IN")}` : `₹${t.low.toLocaleString("en-IN")} or more`}
              </span>
              <span aria-hidden>
                ₹{k(t.low)}
                {t.high ? `–${k(t.high)}` : "+"}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[0.75rem]">{block.note}</p>
    </InfoCard>
  );
}

export function BookingsBlock({ block }: { block: BlockOf<"bookings"> }) {
  const items = block.items.filter((b) => isAllowedBookingUrl(b.href));
  if (items.length === 0) return null;
  return (
    <InfoCard icon="ticket" title="Booking Options">
      <p>These open the provider’s own search. VacayOut doesn’t check prices or availability.</p>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2.5">
        {items.map((b) => (
          <li key={b.label}>
            <a href={b.href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="group flex items-center gap-2">
              <Icon name={b.icon} size={22} className="text-forest" />
              <span className="leading-tight">
                <span className="block text-[0.8125rem] font-medium text-ink group-hover:underline">{b.label}</span>
                <span className="block text-[0.6875rem]">({b.provider})</span>
              </span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
      {block.disclosure ? <p className="mt-3 text-[0.75rem] text-muted">{block.disclosure}</p> : null}
    </InfoCard>
  );
}

export function TipsBlock({ block }: { block: BlockOf<"tips"> }) {
  return (
    <InfoCard icon="bulb" title="Travel Tips">
      <Bullets items={block.items} />
    </InfoCard>
  );
}
