import type { Metadata } from "next";
import Link from "next/link";
import { deleteAccountAction, signOutToHomeAction } from "./actions";
import { requireTraveller } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ delete?: string }> }) {
  const t = await requireTraveller("/account");
  const { delete: del } = await searchParams;
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
        <section className="mt-10 border-t border-[#EEEBE4] pt-6" aria-labelledby="delete-heading">
          <h2 id="delete-heading" className="font-semibold text-ink">Delete my account</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#6B675F]">
            This permanently removes your name, email and sign-in details. Trips saved in this browser stay on this device. This can’t be undone.
          </p>
          <form action={deleteAccountAction} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm text-ink">
              Type <strong>DELETE</strong> to confirm
              <input name="confirm" required autoComplete="off" aria-invalid={del === "confirm" || undefined} className="mt-1 block h-11 w-44 rounded-xl border border-[#DCD8CF] px-3 text-ink" />
            </label>
            <button type="submit" className="inline-flex h-11 items-center rounded-xl border border-[#B42318] px-5 font-semibold text-[#B42318] hover:bg-[#FEF3F2]">Delete account</button>
          </form>
          {del === "confirm" ? <p role="alert" className="mt-2 text-sm text-[#B42318]">Type DELETE exactly to confirm.</p> : null}
        </section>
      </div>
    </div>
  );
}
