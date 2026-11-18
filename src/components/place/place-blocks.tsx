import { Icon, type Name } from "@/components/icons/icon";
import type { PublishedSnapshot, SnapshotImage } from "@/lib/db/schema";
import { StatusPill } from "./section-body";

/** Display pieces shared by the place page and the experience page. */

const ext = { target: "_blank", rel: "nofollow noopener noreferrer" } as const;

/** Photo credit (author · licence · source) or the AI-illustration notice. */
export function Credit({ img, onDark = false }: { img: SnapshotImage; onDark?: boolean }) {
  const cls = onDark ? "text-white/85" : "text-muted";
  if (img.kind === "ai_generated") {
    return <p className={`text-xs ${cls}`}>AI-generated illustration — not a photograph of the place.</p>;
  }
  return (
    <p className={`text-xs ${cls}`}>
      {img.attribution ? <>Photo: {img.attribution} · </> : null}
      {img.licenseUrl && /^https?:\/\//.test(img.licenseUrl) ? <a href={img.licenseUrl} {...ext} rel="license nofollow noopener noreferrer" className="underline">{img.license}</a> : img.license}
      {img.sourceUrl && /^https?:\/\//.test(img.sourceUrl) ? <> · <a href={img.sourceUrl} {...ext} className="underline">source</a></> : null}
    </p>
  );
}

/** Icon for a practical / safety / accessibility heading. */
export function infoIcon(title: string): Name {
  const t = title.toLowerCase();
  if (/visa|passport|permit|document/.test(t)) return "fileText";
  if (/money|cash|pay|atm|upi|currency/.test(t)) return "coins";
  if (/network|mobile|internet|sim|phone/.test(t)) return "chat";
  if (/emergenc|police|ambulance|hospital|health|medical/.test(t)) return "shield";
  if (/monsoon|rain|river|flood/.test(t)) return "waves";
  if (/weather|snow|season/.test(t)) return "sun";
  if (/altitude|height|trek|mountain/.test(t)) return "mountain";
  if (/road|drive|driving|taxi|transport|path|walk/.test(t)) return "car";
  if (/language/.test(t)) return "chat";
  if (/law|drug|rule|ban|plastic/.test(t)) return "help";
  if (/food|water|drink/.test(t)) return "utensils";
  return "checkCircle";
}

/** Titled items (practical info, safety, accessibility) as a grid of cards with their status badges. */
export function InfoCards({ s, highlightFirst = false }: { s: PublishedSnapshot["sections"][number]; highlightFirst?: boolean }) {
  return (
    <ul className="grid gap-3 @xl:grid-cols-2">
      {(s.body.items ?? []).map((it, i) => {
        const hl = highlightFirst && i === 0;
        return (
          <li key={i} className={`flex gap-3 rounded-xl border p-4 ${hl ? "border-[#F2C9BD] bg-[#FDF3EF] @xl:col-span-2" : "border-line-subtle bg-[#FBFAF7]"}`}>
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${hl ? "bg-[#E8826A] text-white" : "bg-white text-[#2D5A3F] shadow-sm"}`}><Icon name={infoIcon(it.title ?? "")} size={16} /></span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">{it.title}<StatusPill status={it.status} /></p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-[#555]">{it.body}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Fees as cards: what it is, the amount as published, and the section's note. */
export function BudgetCards({ s }: { s: PublishedSnapshot["sections"][number] }) {
  return (
    <div className="space-y-4">
      <p className="flex gap-2 rounded-xl bg-[#FBF4E6] px-4 py-3 text-[0.8125rem] leading-relaxed text-[#6B4A12]"><Icon name="bulb" size={16} className="mt-0.5 shrink-0" /><span>{s.body.text ? `${s.body.text} ` : ""}Prices change — check current rates before you travel.</span></p>
      <ul className="grid gap-3 @xl:grid-cols-2">
        {(s.body.items ?? []).map((it, i) => {
          const unknown = /not confirmed|not published|ask /i.test(it.body);
          return (
            <li key={i} className="flex flex-col rounded-xl border border-line-subtle bg-[#FBFAF7] p-4">
              <span className="flex items-start justify-between gap-2 text-[0.8125rem] font-medium text-[#555]">{it.title}<StatusPill status={it.status} /></span>
              <span className={`mt-1.5 leading-snug ${unknown ? "text-sm text-[#777]" : "text-[0.9375rem] font-semibold text-ink"}`}>{it.body}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Paragraphs as small cards with an icon picked from their opening words. */
export function ParagraphCards({ text }: { text: string }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const pick = (p: string): Name => (/^on foot|walk/i.test(p) ? "route" : /bus/i.test(p.slice(0, 40)) ? "bus" : /driv|car|park/i.test(p.slice(0, 40)) ? "car" : /taxi/i.test(p.slice(0, 40)) ? "car" : "compass");
  if (paras.length < 2) return <div className="space-y-3 text-[0.9375rem] leading-[1.7] text-[#444]">{paras.map((p, i) => <p key={i}>{p}</p>)}</div>;
  return (
    <ul className="space-y-3">
      {paras.map((p, i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-line-subtle bg-[#FBFAF7] p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#2D5A3F] shadow-sm"><Icon name={pick(p)} size={16} /></span>
          <p className="text-sm leading-relaxed text-[#444]">{p}</p>
        </li>
      ))}
    </ul>
  );
}

/** Icon for a key-fact label. */
export function factIcon(label: string): Name {
  const l = label.toLowerCase();
  if (/altitude|height|elevation/.test(l)) return "mountain";
  if (/snow|season|time|month|open/.test(l)) return "calendar";
  if (/airport|flight/.test(l)) return "plane";
  if (/rail|train/.test(l)) return "train";
  if (/bus/.test(l)) return "bus";
  if (/permit|fee|ticket|entry|tax/.test(l)) return "ticket";
  if (/hour|timing/.test(l)) return "clock";
  if (/state|region|type/.test(l)) return "pin";
  return "compass";
}

/** "By air: …" paragraphs as route cards; anything else stays as text. */
export function RouteCards({ text }: { text: string }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const ICONS: Record<string, Name> = { air: "plane", bus: "bus", train: "train", rail: "train", car: "car", road: "car", taxi: "car" };
  const cards = paras.map((p) => {
    const m = /^By ([a-z]+)\s*:\s*/i.exec(p);
    return m ? { mode: m[1].toLowerCase(), label: `By ${m[1].toLowerCase()}`, body: p.slice(m[0].length) } : null;
  });
  if (cards.some((c) => c === null)) return <div className="space-y-3 text-[0.9375rem] leading-[1.7] text-[#444]">{paras.map((p, i) => <p key={i}>{p}</p>)}</div>;
  return (
    <ul className="grid gap-3 @xl:grid-cols-2">
      {cards.map((c) => c && (
        <li key={c.label} className="flex gap-3 rounded-xl border border-line-subtle bg-[#FBFAF7] p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4F0] text-[#2D5A3F]"><Icon name={ICONS[c.mode] ?? "route"} size={19} /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold capitalize text-ink">{c.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#555]">{c.body.charAt(0).toUpperCase() + c.body.slice(1)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
