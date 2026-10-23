"use client";

import { usePathname } from "next/navigation";

/** The chat is a full-height app screen and the admin has its own shell, so the site footer is hidden there. */
export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/chat") || pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}
