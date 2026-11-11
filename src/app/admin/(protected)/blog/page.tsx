import Link from "next/link";
import { PageTitle, StatusBadge } from "@/components/admin/ui";
import { DeletePostButton } from "@/components/admin/blog/delete-post-button";
import { requireUser } from "@/lib/auth/guard";
import { formatPostDate } from "@/lib/blog/post";
import { listAllPosts } from "@/lib/blog/service";

export const metadata = { title: "Blog" };

export default async function AdminBlogPage() {
  const user = await requireUser();
  const posts = await listAllPosts();
  const isAdmin = user.role === "admin";
  return (
    <div className="max-w-5xl space-y-5">
      <PageTitle title="Blog Posts">
        <Link href="/admin/blog/settings" className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:border-ink">Blog page settings</Link>
        <Link href="/admin/blog/new" className="inline-flex h-9 items-center rounded-lg bg-coral px-4 text-sm font-semibold text-white hover:bg-coral-hover">+ New Post</Link>
      </PageTitle>
      <p className="text-sm text-muted">Articles shown on /blog. A post is visible only once it is published; drafts stay here.</p>
      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
            <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-sand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.image ? <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/blog/${p.id}`} className="truncate font-semibold hover:underline">{p.title}</Link>
                <StatusBadge status={p.status} />
              </p>
              <p className="truncate text-sm text-muted">
                {p.category || "No category"} · {formatPostDate(p.publishDate)} · /blog/{p.slug}
              </p>
            </div>
            {p.status === "published" ? (
              <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-medium text-muted hover:underline">View</a>
            ) : null}
            <Link href={`/admin/blog/${p.id}`} className="shrink-0 text-sm font-semibold text-coral hover:underline">Edit</Link>
            {isAdmin ? <DeletePostButton id={p.id} title={p.title} compact /> : null}
          </div>
        ))}
        {posts.length === 0 ? <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">No posts yet — write your first one.</p> : null}
      </div>
    </div>
  );
}
