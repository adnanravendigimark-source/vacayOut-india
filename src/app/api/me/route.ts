import { auth } from "@/lib/auth";
import { googleConfigured } from "@/lib/auth/travellers";

export const dynamic = "force-dynamic";

/** Who is signed in as a traveller (if anyone), for client components on otherwise static pages. */
export async function GET() {
  const session = await auth();
  const traveller = session?.user?.kind === "traveller" ? { name: session.user.name ?? "", email: session.user.email ?? "" } : null;
  return Response.json({ traveller, google: googleConfigured() }, { headers: { "cache-control": "no-store" } });
}
