"use client";

import { usePathname } from "next/navigation";
import { isBarePage } from "@/lib/chrome";

/** The chat is a full-height app screen, the admin has its own shell and sign-in/sign-up are full-screen, so the site footer is hidden there. */
export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/chat") || pathname.startsWith("/admin") || isBarePage(pathname)) return null;
  return <>{children}</>;
}
