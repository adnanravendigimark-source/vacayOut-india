import Image from "next/image";
import Link from "next/link";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/guard";
import { listMediaLibrary } from "@/lib/places/repo";

export const metadata = { title: "Media Library" };

export default async function MediaLibraryPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  await requireUser();
  const { kind } = await searchParams;
  const items = await listMediaLibrary(kind);
  const filters = [
    ["", "All"],
    ["photo", "Photos"],
    ["ai_generated", "AI illustrations"],
  ] as const;
  return (
    <div className="max-w-6xl space-y-5">
      <PageTitle title="Media Library" />
      <nav aria-label="Filter images" className="flex gap-2 text-sm">
        {filters.map(([k, l]) => (
          <Link key={k} href={k ? `/admin/media?kind=${k}` : "/admin/media"} aria-current={(kind ?? "") === k ? "page" : undefined} className={`rounded-full border px-3 py-1 ${(kind ?? "") === k ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>{l}</Link>
        ))}
      </nav>
      {items.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-xl border border-line bg-white text-xs">
              <div className="relative aspect-[4/3] bg-sand">
                <Image src={m.url} alt={m.alt} fill sizes="(min-width:1024px) 18rem, 50vw" className="object-cover" />
                {m.kind === "ai_generated" ? <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">AI-generated illustration</span> : null}
                {m.isHero ? <span className="absolute right-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold">Main image</span> : null}
              </div>
              <div className="space-y-1 p-3">
                <Link href={`/admin/places/${m.placeId}?tab=images`} className="font-semibold hover:underline">{m.placeName}</Link>
                <p className="line-clamp-2 text-muted">{m.alt}</p>
                <p className="text-muted">
                  {m.licenseUrl ? <a href={m.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{m.license}</a> : m.license}
                  {m.attribution ? ` · ${m.attribution}` : ""}
                  {m.sourceUrl ? <> · <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">source</a></> : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">No images yet. They’re added when you generate a destination or from a destination’s Images tab.</p>}
    </div>
  );
}
