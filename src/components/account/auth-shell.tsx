import Link from "next/link";

/** Centred card on the cream background, used by the sign-in and sign-up pages. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] items-start justify-center bg-[#F7F5F0] px-4 py-10 sm:items-center sm:py-16">
      <div className="w-full max-w-[26rem]">
        <div className="rounded-2xl border border-[#E5E2DC] bg-white p-6 shadow-[0_10px_30px_-12px_rgba(35,72,50,0.18)] sm:p-8">
          <h1 className="font-serif text-[1.875rem] font-medium leading-tight text-ink">{title}</h1>
          <p className="mt-1.5 text-[0.9375rem] text-[#6B675F]">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-5 text-center text-[0.875rem] text-[#6B675F]">{footer}</p>
        <p className="mt-3 text-center text-xs text-[#8A867D]">
          By continuing you agree to our <Link href="/terms" className="underline underline-offset-2 hover:text-ink">Terms</Link> and <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
