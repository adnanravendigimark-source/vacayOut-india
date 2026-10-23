/**
 * Booking links. We link travellers to a provider's own search for the place —
 * we never show prices or availability ourselves (we don't have them).
 * Hosts must be on the allow-list in src/lib/chat/constants.ts. Affiliate IDs
 * are optional (env); when set, links carry them and pages show a disclosure.
 */
import type { BlockOf } from "@/lib/chat/schema";

export type BookingLink = { label: string; provider: string; href: string; icon: "train" | "hotel" | "ticket" | "plane" | "bus" };

const DESTINATION_KINDS = new Set(["state", "region", "city", "town"]);

export function bookingEnabled() {
  return process.env.BOOKING_LINKS !== "off";
}

export function affiliateActive() {
  return Boolean(process.env.BOOKING_AFFILIATE_ID || process.env.GETYOURGUIDE_PARTNER_ID);
}

/** Search links for a place. `name` is the place, `state` gives Booking.com context. */
export function bookingLinksFor(p: { name: string; kind: string; stateName: string | null }): BookingLink[] {
  if (!bookingEnabled()) return [];
  const where = p.stateName && p.kind !== "state" ? `${p.name}, ${p.stateName}` : p.name;
  const links: BookingLink[] = [];
  const isDestination = DESTINATION_KINDS.has(p.kind);

  if (isDestination) {
    const b = new URL("https://www.booking.com/searchresults.html");
    b.searchParams.set("ss", `${where}, India`);
    if (process.env.BOOKING_AFFILIATE_ID) b.searchParams.set("aid", process.env.BOOKING_AFFILIATE_ID);
    links.push({ label: `Stays in ${p.name}`, provider: "Booking.com", href: b.toString(), icon: "hotel" });
  }

  const g = new URL("https://www.getyourguide.com/s/");
  g.searchParams.set("q", p.name);
  if (process.env.GETYOURGUIDE_PARTNER_ID) g.searchParams.set("partner_id", process.env.GETYOURGUIDE_PARTNER_ID);
  links.push({ label: isDestination ? `Tours and activities in ${p.name}` : `Tours that include ${p.name}`, provider: "GetYourGuide", href: g.toString(), icon: "ticket" });

  if (isDestination) {
    links.push({ label: "Trains (IRCTC)", provider: "IRCTC", href: "https://www.irctc.co.in/nget/train-search", icon: "train" });
    links.push({ label: "Buses", provider: "redBus", href: "https://www.redbus.in/", icon: "bus" });
  }
  return links;
}

export function bookingsBlock(p: { name: string; kind: string; stateName: string | null }): BlockOf<"bookings"> | null {
  const items = bookingLinksFor(p);
  return items.length ? { type: "bookings", items: items.slice(0, 6), ...(affiliateActive() ? { disclosure: "VacayOut may earn a commission if you book through some of these links, at no extra cost to you." } : {}) } : null;
}
