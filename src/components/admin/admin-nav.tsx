"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Overview", match: (p: string) => p === "/admin" },
  { href: "/admin/places", label: "Destinations", match: (p: string) => p.startsWith("/admin/places") },
  { href: "/admin/itineraries", label: "Itineraries", match: (p: string) => p.startsWith("/admin/itineraries") },
  { href: "/admin/research", label: "Research & Review", match: (p: string) => p.startsWith("/admin/research") },
  { href: "/admin/media", label: "Media Library", match: (p: string) => p.startsWith("/admin/media") },
  { href: "/admin/settings", label: "Settings", match: (p: string) => ["/admin/settings", "/admin/chat", "/admin/system", "/admin/users", "/admin/audit"].some((x) => p.startsWith(x)) },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="mt-6 flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map((n) => {
        const on = n.match(path);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${on ? "bg-ink font-semibold text-white" : "font-medium text-ink/80 hover:bg-sand"}`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
