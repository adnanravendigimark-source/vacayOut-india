import Link from "next/link";

export const metadata = { title: "Sign-in problem", robots: { index: false } };

export default function AuthErrorPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-serif text-3xl font-medium">We couldn’t sign you in</h1>
      <p className="mt-3 text-muted">The sign-in was cancelled or the account isn’t available. Please try again.</p>
      <Link href="/chat" className="mt-6 inline-block rounded-lg bg-coral px-5 py-3 font-semibold text-white hover:bg-coral-hover">Back to the planner</Link>
    </div>
  );
}
