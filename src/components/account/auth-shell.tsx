import Link from "next/link";
import Image from "@/components/media/image";
import { Icon } from "@/components/icons/icon";
import { Logo } from "@/components/layout/logo";
import { PAGE_HEROES } from "@/lib/data/page-heroes";

const PHOTOS = { login: PAGE_HEROES.exploreIndia, signup: PAGE_HEROES.travelGuides };

const PERKS = [
  { icon: "heart", text: "Save trips and pick up where you left off" },
  { icon: "sparkles", text: "Plan day-by-day with the AI planner" },
  { icon: "shield", text: "Guides checked against official sources" },
] as const;

/**
 * Full-screen sign-in / sign-up layout (no site header or footer, see
 * src/lib/chrome.ts): a photo panel on the left on large screens, the form on
 * the right.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  photo = "login",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  photo?: keyof typeof PHOTOS;
}) {
  const hero = PHOTOS[photo];
  return (
    <div className="grid h-dvh overflow-hidden bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Photo panel (large screens) */}
      <aside className="relative hidden overflow-hidden bg-ink lg:block">
        <Image src={hero.src} alt={hero.alt} fill priority sizes="50vw" className="object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
          <Logo tone="light" />
          <div className="max-w-md text-white">
            <p className="font-serif text-4xl font-bold leading-tight xl:text-[2.75rem]">India is waiting. Plan it properly.</p>
            <ul className="mt-6 space-y-3">
              {PERKS.map((p) => (
                <li key={p.text} className="flex items-center gap-3 text-[0.9375rem] text-white/90">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                    <Icon name={p.icon} size={15} />
                  </span>
                  {p.text}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[0.6875rem] text-white/60">
              {hero.caption} · Photo:{" "}
              <a href={hero.creditUrl} target="_blank" rel="nofollow noopener noreferrer" className="underline hover:text-white">{hero.credit}</a> ·{" "}
              <a href={hero.licenseUrl} target="_blank" rel="license nofollow noopener noreferrer" className="underline hover:text-white">{hero.license}</a>
            </p>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <div className="flex h-dvh flex-col overflow-y-auto px-5 py-4 sm:px-10 sm:py-5">
        <div className="flex items-center justify-between">
          <span className="lg:invisible"><Logo /></span>
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium text-muted transition-colors hover:bg-[#F4F1EA] hover:text-ink">
            <Icon name="arrowLeft" size={14} />
            Back to VacayOut
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-2">
          <div className="w-full max-w-[24rem]">
            <h1 className="font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-ink sm:text-[2rem]">{title}</h1>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[#6B675F]">{subtitle}</p>
            <div className="mt-4">{children}</div>
            <p className="mt-4 text-center text-[0.875rem] text-[#6B675F]">{footer}</p>
          </div>
        </div>

        <p className="text-center text-xs text-[#8A867D]">
          By continuing you agree to our <Link href="/terms" className="underline underline-offset-2 hover:text-ink">Terms</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
