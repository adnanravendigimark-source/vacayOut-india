import Link from "next/link";
import { notFound } from "next/navigation";
import { DeletePostButton } from "@/components/admin/blog/delete-post-button";
import { PostForm } from "@/components/admin/blog/post-form";
import { requireUser } from "@/lib/auth/guard";
import { getPost, listRecommendablePlaces, listRedirectsTo } from "@/lib/blog/service";

export const metadata = { title: "Edit post" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const post = await getPost(id);
  if (!post) notFound();
  const [places, redirects] = await Promise.all([listRecommendablePlaces(), listRedirectsTo(id)]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, excerpt: _excerpt, updatedAt: _updatedAt, ...initial } = post;
  const isAdmin = user.role === "admin";
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/blog" className="text-sm text-muted hover:underline">← Blog posts</Link>
        <h1 className="mt-2 font-serif text-[1.75rem] font-medium leading-tight">Edit Post</h1>
        <p className="mt-1 text-sm text-muted">Editing “{post.title}”</p>
      </div>
      <PostForm id={id} initial={initial} places={places} redirects={redirects} canDelete={isAdmin} deleteButton={<DeletePostButton id={id} title={post.title} redirectTo="/admin/blog" />} />
    </div>
  );
}
