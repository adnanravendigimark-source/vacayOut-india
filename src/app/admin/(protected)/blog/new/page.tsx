import Link from "next/link";
import { PostForm } from "@/components/admin/blog/post-form";
import { requireUser } from "@/lib/auth/guard";
import { blankPost } from "@/lib/blog/post";
import { listRecommendablePlaces } from "@/lib/blog/service";

export const metadata = { title: "New post" };

export default async function NewPostPage() {
  await requireUser();
  const places = await listRecommendablePlaces();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/blog" className="text-sm text-muted hover:underline">← Blog posts</Link>
        <h1 className="mt-2 font-serif text-[1.75rem] font-medium leading-tight">New Post</h1>
        <p className="mt-1 text-sm text-muted">Fill in the basics, then write the article. Save a draft any time; publish when it’s ready.</p>
      </div>
      <PostForm id={null} initial={blankPost(today)} places={places} />
    </div>
  );
}
