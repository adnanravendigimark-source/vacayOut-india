/**
 * Self-hosted copies of Unsplash photos (Unsplash License: free to use,
 * attribution appreciated but not required). `source` records where each came from.
 * Used only by the homepage's sample content.
 */
import type { Photo } from "./types";

const u = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const photos = {
  heroUdaipur: { src: "/images/unsplash/hero-udaipur.jpg", width: 2400, height: 1350, source: u("1589901164570-f9de6556e1c1"), position: "60% 8%", alt: "City Palace rising above Lake Pichola in Udaipur under a clear sky" },
  udaipur: { src: "/images/unsplash/udaipur.jpg", width: 1000, height: 750, source: u("1615836245337-f5b9b2303f10"), alt: "A boat on Lake Pichola below the City Palace, Udaipur" },
  jaipur: { src: "/images/unsplash/jaipur.jpg", width: 1000, height: 667, source: u("1477587458883-47145ed94245"), position: "60% 30%", alt: "Hawa Mahal in Jaipur with decorated horses on the street" },
  meghalaya: { src: "/images/unsplash/meghalaya.jpg", width: 1000, height: 750, source: u("1609276804051-8c5e906cc430"), alt: "Waterfalls running down a green valley in Meghalaya" },
  kerala: { src: "/images/unsplash/kerala.jpg", width: 1000, height: 563, source: u("1602216056096-3b40cc0c9944"), alt: "A houseboat on palm-lined backwaters in Kerala" },
  manali: { src: "/images/unsplash/manali.jpg", width: 1000, height: 536, source: u("1597167231350-d057a45dc868"), alt: "Snow-covered mountains above Manali" },
  varanasi: { src: "/images/unsplash/varanasi.jpg", width: 1000, height: 667, source: u("1706186839147-0d708602587b"), alt: "Boats on the Ganga beside the ghats of Varanasi" },
  hampi: { src: "/images/unsplash/trip-heritage.jpg", width: 1000, height: 667, source: u("1616606484004-5ef3cc46e39d"), alt: "The stone chariot at Hampi" },
  goa: { src: "/images/unsplash/trip-weekend.jpg", width: 1000, height: 750, source: u("1581892197913-fd2e407e698a"), alt: "Palm trees above a beach in Goa" },
} satisfies Record<string, Photo>;
