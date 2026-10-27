import type { Metadata } from "next";
import Link from "next/link";
import { signOutToHomeAction } from "./actions";
import { requireTraveller } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const t = await requireTraveller("/account");
  const method = [t.hasPassword ? "Email and password" : null, t.google ? "Google" : null].filter(Boolean).join(" · ");
  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-[#F7F5F0] px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-[#E5E2DC] bg-white p-6 sm:p-8">
        <h1 className="font-serif text-[1.875rem] font-medium text-ink">Your account</h1>
        <dl className="mt-6 divide-y divide-[#EEEBE4] text-[0.9375rem]">
          <div className="flex justify-between gap-4 py-3"><dt className="text-[#6B675F]">Name</dt><dd className="font-medium text-ink">{t.name}</dd></div>
          <div className="flex justify-between gap-4 py-3"><dt className="text-[#6B675F]">Email</dt><dd className="break-all text-right font-medium text-ink">{t.email}</dd></div>
          <div className="flex justify-between gap-4 py-3"><dt className="text-[#6B675F]">Sign-in method</dt><dd className="font-medium text-ink">{method}</dd></div>
        </dl>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/chat" className="inline-flex h-11 items-center rounded-xl bg-[#234832] px-5 font-semibold text-white hover:bg-[#1A3726]">Plan a trip</Link>
          <form action={signOutToHomeAction}>
            <button type="submit" className="inline-flex h-11 items-center rounded-xl border border-[#DCD8CF] px-5 font-semibold text-ink hover:border-ink">Sign out</button>
          </form>
        </div>
      </div>
    </div>
  );
}
