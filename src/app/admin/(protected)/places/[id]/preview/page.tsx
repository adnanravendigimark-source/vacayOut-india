import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PlacePage } from "@/components/place/place-page";
import { requireUser } from "@/lib/auth/guard";
import { previewData } from "@/lib/places/preview";

/** Exactly what "Publish" would put live right now: approved sections only. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  await requireUser();
  const p = await previewData(id, { includeDrafts: false });
  if (!p) notFound();
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
        <strong>Preview</strong> — approved sections only, exactly as Publish would show them.
        <Link href={`/admin/places/${id}`} className="ml-auto font-semibold underline">Back to review</Link>
      </div>
      {p.problems.length ? (
        <ul className="mt-3 list-disc rounded-xl bg-red-50 py-3 pl-8 pr-4 text-sm text-red-800">
          {p.problems.map((x) => <li key={x}>{x}</li>)}
        </ul>
      ) : null}
      <div className="mt-4 rounded-2xl border border-line bg-canvas">
        <PlacePage snapshot={p.snapshot} items={p.children} inline={p.inline} related={p.related} stateSlug={p.stateSlug} tripTypes={p.tripTypes} preview />
      </div>
    </div>
  );
}
