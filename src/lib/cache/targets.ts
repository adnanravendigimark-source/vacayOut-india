import "server-only";
import { listPublishedGuides } from "@/lib/guides/service";
import { listPublishedItineraries } from "@/lib/itineraries/service";
import { listPublishedForSitemap } from "@/lib/places/repo";
import { site } from "@/lib/site";
import { publicPaths } from "./paths";

/** Every published page, from the database (same source as the sitemap). */
export async function listPublicPaths(): Promise<string[]> {
  const [places, itineraries, guides] = await Promise.all([listPublishedForSitemap(), listPublishedItineraries(), listPublishedGuides()]);
  return publicPaths({ places, itineraries, guides });
}

/** The origin to warm: this deployment's production domain on Vercel, else the configured site URL. */
export function warmOrigin(): string {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return prod ? `https://${prod}` : site.url;
}
