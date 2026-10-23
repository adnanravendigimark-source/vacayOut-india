import Link from "next/link";
import { routes } from "@/lib/routes";

/** The VacayOut wordmark. `light` is for dark backgrounds (white letters, same orange). */
export function Logo({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <Link href={routes.home} aria-label="VacayOut home" className={`inline-flex shrink-0 items-center transition-opacity hover:opacity-90 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a tiny static SVG; next/image adds nothing here */}
      <img
        src={tone === "light" ? "/brand/vacayout-logo-light.svg" : "/brand/vacayout-logo.svg"}
        alt="VacayOut"
        width={310}
        height={62}
        className="h-7 w-auto sm:h-8 lg:h-9"
      />
    </Link>
  );
}
