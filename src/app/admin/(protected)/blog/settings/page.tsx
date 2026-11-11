import Link from "next/link";
import { BlogSettingsForm } from "@/components/admin/blog/settings-form";
import { requireUser } from "@/lib/auth/guard";
import { getStoredBlogSettings } from "@/lib/blog/service";
import { BLOG_DEFAULTS, type BlogSettings } from "@/lib/blog/settings";

export const metadata = { title: "Blog page settings" };

export default async function BlogSettingsPage() {
  await requireUser();
  const stored = (await getStoredBlogSettings()) as Partial<BlogSettings>;
  return (
    <div className="space-y-6">
      <div className="max-w-4xl">
        <Link href="/admin/blog" className="text-sm text-muted hover:underline">← Blog posts</Link>
        <h1 className="mt-2 font-serif text-[1.75rem] font-medium leading-tight">Blog page settings</h1>
        <p className="mt-1 text-sm text-muted">Hero text, sidebar promo and SEO for the /blog listing page.</p>
      </div>
      <BlogSettingsForm stored={stored} defaults={BLOG_DEFAULTS} />
    </div>
  );
}
