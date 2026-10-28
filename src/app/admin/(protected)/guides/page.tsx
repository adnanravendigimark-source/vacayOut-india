import Link from "next/link";
import { PageTitle, StatusBadge } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/guard";
import { listGuidesForAdmin } from "@/lib/guides/service";

export const metadata = { title: "Travel guides" };

const when = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function GuidesAdminPage() {
  await requireUser();
  const rows = await listGuidesForAdmin();
  return (
    <div className="max-w-6xl space-y-5">
      <PageTitle title="Travel guides" />
      <p className="text-sm text-muted">How-to and planning articles. A guide goes live only when you publish it, after its main place is published and its cited facts are verified. It then appears on every linked place’s page.</p>
      {rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F7F5F0] text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-2.5">Guide</th><th className="px-4 py-2.5">Main place</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Updated</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-2.5"><Link href={`/admin/guides/${r.id}`} className="font-semibold underline-offset-4 hover:underline">{r.title}</Link>{r.locked ? <span className="ml-2 text-xs text-muted">edited</span> : null}</td>
                  <td className="px-4 py-2.5">{r.placeName} <span className="text-xs text-muted">({r.placeStatus})</span></td>
                  <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-2.5 text-muted">{when(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-muted">No travel guides yet. They are added by the content seed from researched files.</p>
      )}
    </div>
  );
}
