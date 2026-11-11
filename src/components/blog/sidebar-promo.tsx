import Link from "next/link";
import { Icon } from "@/components/icons/icon";

/** Promo card in the blog sidebars. Hidden when no heading is set. */
export function SidebarPromo({ heading, body, buttonText, buttonHref }: { heading: string; body: string; buttonText: string; buttonHref: string }) {
  if (!heading) return null;
  const external = /^https?:\/\//.test(buttonHref);
  const cls = "mt-4 inline-flex items-center gap-1.5 rounded-xl bg-coral px-5 py-2.5 text-xs font-bold text-white shadow-coral transition hover:scale-[1.02] hover:bg-coral-hover";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-coral-soft via-white to-sand/60 p-6 text-center shadow-sm">
      <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-coral-soft text-coral">
        <Icon name="sparkles" size={20} />
      </div>
      <p className="mt-3.5 font-serif text-base font-semibold text-ink">{heading}</p>
      {body ? <p className="mt-1.5 text-xs leading-relaxed text-muted">{body}</p> : null}
      {buttonText && buttonHref ? (
        external ? (
          <a href={buttonHref} target="_blank" rel="noopener noreferrer" className={cls}>{buttonText}</a>
        ) : (
          <Link href={buttonHref} className={cls}>{buttonText}</Link>
        )
      ) : null}
    </div>
  );
}
