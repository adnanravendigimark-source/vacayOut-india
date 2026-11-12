import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import { GUIDE_HREF_RE } from "@/lib/chat/constants";
import type { BlockOf } from "@/lib/chat/schema";
import { BlockImage } from "./shared";

/** A small link card to the guide the answer is based on (not a page-sized hero). */
export function DestinationBlock({ block }: { block: BlockOf<"destination"> }) {
  const href = block.href && GUIDE_HREF_RE.test(block.href) ? block.href : null;
  const body = (
    <>
      <BlockImage photo={block.photo} sizes="64px" className="relative size-14 shrink-0 rounded-lg" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className="truncate text-[0.9375rem] font-semibold text-ink">{block.name}</span>
          {block.days ? <span className="shrink-0 text-[0.75rem] text-muted">· {block.days} {block.days === 1 ? "day" : "days"}</span> : null}
        </span>
        <span className="mt-0.5 line-clamp-1 block text-[0.8125rem] text-muted">{block.tagline}</span>
      </span>
      {href ? <Icon name="arrowRight" size={16} className="shrink-0 text-forest" /> : null}
    </>
  );
  const cls = "flex items-center gap-3 rounded-xl border border-line bg-white p-2 pr-3.5 shadow-[var(--shadow-card)]";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-forest`} title={block.credit ? `Photo: ${block.credit}` : undefined}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
