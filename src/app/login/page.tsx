import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/auth-shell";
import { Divider, GoogleButton, SignInForm } from "@/components/account/auth-forms";
import { captchaSiteKey } from "@/lib/auth/captcha";
import { currentTraveller } from "@/lib/auth/guard";
import { safeNext } from "@/lib/auth/next-path";
import { googleConfigured } from "@/lib/auth/travellers";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const NOTICES: Record<string, string> = {
  verified: "Email confirmed — sign in to continue.",
  "link-invalid": "That confirmation link has expired or was already used. Sign up again with the same email to get a new one.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; account?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await currentTraveller()) redirect(next);
  const notice = sp.account ? NOTICES[sp.account] : undefined;
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to save trips and keep planning with VacayOut."
      footer={<>New to VacayOut? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-[#234832] underline underline-offset-4">Create an account</Link></>}
    >
      {notice ? <p role="status" className="mb-5 rounded-xl bg-[#E6EFE8] px-3.5 py-2.5 text-[0.875rem] text-[#234832]">{notice}</p> : null}
      {googleConfigured() ? (
        <>
          <GoogleButton next={next} />
          <Divider />
        </>
      ) : null}
      <SignInForm next={next} siteKey={captchaSiteKey()} />
    </AuthShell>
  );
}
