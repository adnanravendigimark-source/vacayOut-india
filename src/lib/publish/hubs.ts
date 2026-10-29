import { revalidatePath } from "next/cache";

/** Listing pages that show published places, itineraries and guides (cached for 5 minutes). */
export const HUB_PATHS = ["/", "/india", "/things-to-do", "/travel-guides", "/itineraries"] as const;

/** Refreshes the cached listing pages after a publish. Outside a request (scripts, tests) they refresh on their 5-minute timer instead. */
export function refreshHubs() {
  try {
    for (const p of HUB_PATHS) revalidatePath(p);
  } catch {
    // Not inside a Next.js request.
  }
}
