import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/auth-shell";
import { Divider, GoogleButton, SignUpForm } from "@/components/account/auth-forms";
import { captchaSiteKey } from "@/lib/auth/captcha";
import { currentTraveller } from "@/lib/auth/guard";
import { safeNext } from "@/lib/auth/next-path";
import { googleConfigured } from "@/lib/auth/travellers";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentTraveller()) redirect(next);
  return (
    <AuthShell
      title="Create your account"
      subtitle="Free. Save your trips and plan more with AI."
      footer={<>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-[#234832] underline underline-offset-4">Sign in</Link></>}
    >
      {googleConfigured() ? (
        <>
          <GoogleButton next={next} label="Sign up with Google" />
          <Divider />
        </>
      ) : null}
      <SignUpForm next={next} siteKey={captchaSiteKey()} />
    </AuthShell>
  );
}
