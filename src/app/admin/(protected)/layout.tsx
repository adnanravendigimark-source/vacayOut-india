import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireUser } from "@/lib/auth/guard";
import { logoutAction } from "../login/actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="flex flex-col border-b border-line bg-white px-4 py-5 lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <Link href="/admin" className="font-serif text-lg font-medium">
          Vacay<span className="text-coral">Out</span> <span className="text-sm text-muted">admin</span>
        </Link>
        <Link href="/admin/places/new" className="mt-5 hidden items-center justify-center rounded-lg bg-coral px-3 py-2.5 text-sm font-semibold text-white hover:bg-coral-hover lg:flex">
          + Create destination
        </Link>
        <AdminNav />
        <div className="mt-auto hidden border-t border-line pt-4 text-xs text-muted lg:block">
          <a href="/india" target="_blank" rel="noreferrer" className="mb-3 block font-semibold text-ink underline underline-offset-4">Public directory ↗</a>
          <p className="truncate font-medium text-ink">{user.name}</p>
          <p className="truncate">{user.email} · {user.role}</p>
          <form action={logoutAction} className="mt-2">
            <button type="submit" className="text-xs font-semibold text-ink underline underline-offset-4">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
