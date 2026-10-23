import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { NewPlaceForm } from "@/components/admin/new-place-form";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { places } from "@/lib/db/schema";
import { listContainers } from "@/lib/places/repo";

export const metadata = { title: "Create destination" };

export default async function NewPlacePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  await requireUser();
  const { state } = await searchParams;
  const [states, containers] = await Promise.all([
    getDb().select({ id: places.id, name: places.name, status: places.status }).from(places).where(eq(places.kind, "state")).orderBy(asc(places.name)),
    listContainers(),
  ]);
  return (
    <div className="space-y-5">
      <Link href="/admin/places" className="text-sm text-muted hover:underline">← Destinations</Link>
      <PageTitle title="Create destination" />
      <p className="max-w-2xl text-sm text-muted">India only. Choose the state and the place — VacayOut does the research and writing, then you review everything on one screen.</p>
      <NewPlaceForm states={states} containers={containers} defaultState={state} />
    </div>
  );
}
