import Link from "next/link";
import { PageTitle } from "@/components/admin/ui";
import { CreateStateForm } from "@/components/admin/build-forms";
import { requireUser } from "@/lib/auth/guard";
import { missingStates } from "@/lib/builder/overview";

export const metadata = { title: "Create destination" };

export default async function CreateStatePage() {
  const user = await requireUser();
  const states = await missingStates();
  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/admin/places" className="text-sm text-muted hover:underline">
        ← Destinations
      </Link>
      <PageTitle title="Create destination" />
      <p className="text-sm text-muted">
        Pick a state. VacayOut researches it from Wikivoyage, Wikipedia and Wikidata, writes the state page, its best-known destinations and their main sights, trip plans and guides — then
        publishes everything that passes the checks. Anything that doesn’t stays as a draft for you. Each build is capped at $1.
      </p>
      {user.role !== "admin" ? (
        <p className="rounded-xl border border-line bg-white p-5 text-sm">Only admins can run one-click builds, because a build publishes pages. You can still create a place manually below.</p>
      ) : states.length ? <CreateStateForm states={states} /> : <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted">Every state and union territory is already in VacayOut.</p>}
      <p className="text-sm text-muted">
        Want a single place instead? Open its state on the{" "}
        <Link href="/admin/places" className="underline">
          Destinations
        </Link>{" "}
        page, or{" "}
        <Link href="/admin/places/new" className="underline">
          create one manually
        </Link>
        .
      </p>
    </div>
  );
}
