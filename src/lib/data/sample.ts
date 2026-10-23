/**
 * SAMPLE homepage content, for design work only. It describes real places in
 * general terms (no prices, timings or claims we'd need a source for) and never
 * links to a guide page, because none exists. It fills a section only when that
 * section has no published data, and only while sample content is switched on
 * (see `sampleContentEnabled`).
 */
import type { Destination, Itinerary, ZoneGroup } from "./types";
import { photos } from "./photos";

const d = (x: Omit<Destination, "level" | "publishedAt" | "sample" | "featured"> & { featured?: boolean }): Destination => ({
  level: "place",
  publishedAt: "2026-01-01T00:00:00.000Z",
  sample: true,
  featured: false,
  ...x,
});

export const sampleDestinations: Destination[] = [
  d({ slug: "udaipur", name: "Udaipur", stateSlug: "rajasthan", stateName: "Rajasthan", kind: "city", tagline: "City", description: "The city of lakes, known for the City Palace and boat rides on Lake Pichola.", tripTypes: ["heritage", "romantic", "family"], photo: photos.udaipur, featured: true }),
  d({ slug: "manali", name: "Manali", stateSlug: "himachal-pradesh", stateName: "Himachal Pradesh", kind: "town", tagline: "Town", description: "A mountain town in the Kullu valley and a base for trips to Solang and beyond.", tripTypes: ["mountains", "adventure", "family"], photo: photos.manali, featured: true }),
  d({ slug: "varanasi", name: "Varanasi", stateSlug: "uttar-pradesh", stateName: "Uttar Pradesh", kind: "city", tagline: "City", description: "One of the oldest living cities in the world, with ghats stepping down to the Ganga.", tripTypes: ["spiritual", "heritage"], photo: photos.varanasi, featured: true }),
  d({ slug: "alappuzha", name: "Alappuzha", stateSlug: "kerala", stateName: "Kerala", kind: "town", tagline: "Town", description: "Backwater canals and paddy fields, best seen slowly from a houseboat.", tripTypes: ["nature", "romantic", "family"], photo: photos.kerala, featured: true }),
  d({ slug: "hampi", name: "Hampi", stateSlug: "karnataka", stateName: "Karnataka", kind: "town", tagline: "Town", description: "Ruins of the Vijayanagara capital, spread across a landscape of boulder hills.", tripTypes: ["heritage", "adventure"], photo: photos.hampi, featured: true }),
  d({ slug: "jaipur", name: "Jaipur", stateSlug: "rajasthan", stateName: "Rajasthan", kind: "city", tagline: "City", description: "Rajasthan’s capital: Amber Fort, the Hawa Mahal and busy old-city bazaars.", tripTypes: ["heritage", "family", "weekend"], photo: photos.jaipur, featured: true }),
  d({ slug: "sohra", name: "Sohra (Cherrapunji)", stateSlug: "meghalaya", stateName: "Meghalaya", kind: "town", tagline: "Town", description: "Waterfalls, deep gorges and living root bridges in the Khasi Hills.", tripTypes: ["nature", "adventure"], photo: photos.meghalaya }),
  d({ slug: "north-goa", name: "North Goa", stateSlug: "goa", stateName: "Goa", kind: "region", tagline: "Region", description: "Palm-lined beaches, river estuaries and old Portuguese-era churches.", tripTypes: ["beaches", "weekend", "romantic"], photo: photos.goa }),
];

const STATES: { name: string; slug: string; zone: string; photo: Destination["photo"] }[] = [
  { name: "Rajasthan", slug: "rajasthan", zone: "North", photo: photos.heroUdaipur },
  { name: "Himachal Pradesh", slug: "himachal-pradesh", zone: "North", photo: photos.manali },
  { name: "Uttar Pradesh", slug: "uttar-pradesh", zone: "Central", photo: photos.varanasi },
  { name: "Goa", slug: "goa", zone: "West", photo: photos.goa },
  { name: "Kerala", slug: "kerala", zone: "South", photo: photos.kerala },
  { name: "Karnataka", slug: "karnataka", zone: "South", photo: photos.hampi },
  { name: "Meghalaya", slug: "meghalaya", zone: "Northeast", photo: photos.meghalaya },
];

export function sampleZones(order: readonly string[]): ZoneGroup[] {
  return order
    .map((zone) => ({
      zone,
      states: STATES.filter((s) => s.zone === zone).map((s) => ({
        name: s.name,
        slug: s.slug,
        places: sampleDestinations.filter((x) => x.stateSlug === s.slug).length,
        photo: s.photo,
        sample: true,
      })),
    }))
    .filter((z) => z.states.length);
}

const by = (slug: string) => sampleDestinations.find((x) => x.slug === slug)!;

export const sampleItineraries: Itinerary[] = [
  { destination: by("udaipur"), days: ["City Palace and a boat ride on Lake Pichola", "Old-city lanes and Jagdish Temple", "Saheliyon-ki-Bari and sunset at Sajjangarh"] },
  { destination: by("manali"), days: ["Mall Road and Hadimba Temple", "Old Manali and Vashisht", "Solang Valley", "A slow day by the Beas river"] },
  { destination: by("varanasi"), days: ["Evening Ganga aarti on the ghats", "Sunrise boat ride, then Sarnath"] },
];

export const sampleGuides: Destination[] = [by("jaipur"), by("sohra"), by("north-goa")];

/**
 * Sample content is on by default while developing and off in production.
 * HOMEPAGE_SAMPLE_CONTENT=1 / =0 overrides either way.
 */
export function sampleContentEnabled(env: NodeJS.ProcessEnv = process.env) {
  if (env.HOMEPAGE_SAMPLE_CONTENT === "1") return true;
  if (env.HOMEPAGE_SAMPLE_CONTENT === "0") return false;
  return env.NODE_ENV !== "production";
}
