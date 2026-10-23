import Link from "next/link";
import { Icon, type Name } from "@/components/icons/icon";
import type { SectionCopy } from "@/lib/data/types";

interface SectionHeaderProps {
  id?: string;
  title?: string;
  subtitle?: string;
  copy?: SectionCopy;
  icon?: Name;
  link?: { href: string; label: string };
  center?: boolean;
  sample?: boolean;
  className?: string;
}

export function SectionHeader({
  id,
  title,
  subtitle,
  copy,
  icon,
  link,
  center = false,
  sample = false,
  className = "mb-6 sm:mb-8",
}: SectionHeaderProps) {
  const displayTitle = title ?? copy?.title ?? "";
  const displaySubtitle = subtitle ?? copy?.body ?? "";

  return (
    <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 ${center ? "items-center text-center" : ""} ${className}`}>
      <div className={`flex items-start gap-3 ${center ? "flex-col items-center" : ""}`}>
        {icon && (
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E2DC] bg-white text-ink shadow-xs">
            <Icon name={icon} size={18} strokeWidth={1.8} />
          </div>
        )}
        <div>
          <h2 id={id} className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-sans">
            {displayTitle}
          </h2>
          {displaySubtitle && (
            <p className="mt-1 text-xs sm:text-[0.875rem] text-[#666666] leading-relaxed">
              {displaySubtitle}
            </p>
          )}
        </div>
      </div>
      {link && (
        <Link
          href={link.href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-xs sm:text-sm font-semibold text-ink/80 hover:text-coral transition-colors"
        >
          <span>{link.label}</span>
          <Icon
            name="arrowRight"
            size={14}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </div>
  );
}
