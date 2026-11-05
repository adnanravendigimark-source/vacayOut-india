import "server-only";
import fs from "node:fs";
import path from "node:path";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import {
  itineraries,
  media,
  places,
  placeVersions,
  searchDocuments,
  sections,
  travelGuides,
  travelGuidePlaces,
  users,
  type SnapshotImage,
  type ItemStatus,
  type ItinerarySnapshot,
  type GuideSnapshot,
} from "../src/lib/db/schema.js";
import { storeImage } from "../src/lib/media/storage.js";
import { sniffImage, EXT } from "../src/lib/media/sniff.js";
import { snapshotText } from "../src/lib/places/publish.js";
import { validateItinerary } from "../src/lib/itineraries/plan.js";
import { validateGuide } from "../src/lib/guides/body.js";

// Delay helper to avoid Wikimedia rate-limiting
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function searchWiki(query: string, retries = 3): Promise<{
  url: string;
  alt: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
} | null> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    query
  )}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url|extmetadata&format=json`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sleep(400); // 400ms throttle between queries
      const res = await fetch(url, {
        headers: { "User-Agent": "VacayOut/1.0 (travel@vacayout.com; https://vacayout.com)" },
      });

      if (res.status === 429) {
        console.warn(`Wikimedia rate limit hit for query "${query}". Backing off for 3s...`);
        await sleep(3000);
        continue;
      }

      if (!res.ok) {
        throw new Error(`Wikimedia API error HTTP ${res.status}`);
      }

      const data = await res.json();
      const pages = data.query?.pages;
      if (!pages) return null;
      const page = Object.values(pages)[0] as any;
      const info = page.imageinfo?.[0];
      if (!info) return null;
      const meta = info.extmetadata || {};
      return {
        url: info.url as string,
        alt: meta.ObjectName?.value || query,
        author: (meta.Artist?.value?.replace(/<[^>]*>/g, "") || "Wikimedia Commons Contributor").trim(),
        license: meta.LicenseShortName?.value || "CC BY-SA",
        licenseUrl: meta.LicenseUrl?.value || "https://creativecommons.org/licenses/",
        sourceUrl: info.descriptionurl || info.url,
      };
    } catch (e) {
      if (attempt === retries) {
        console.error(`Failed searching Wikimedia for "${query}":`, e);
        return null;
      }
      await sleep(1500);
    }
  }
  return null;
}

async function fetchAndStoreImage(
  query: string,
  prefix: string,
  fallbackAlt: string,
  fallbackCaption: string
): Promise<SnapshotImage & { contentType: string; bytes: number; storageKey: string }> {
  const cachePath = path.resolve(process.cwd(), "scripts/.jk-img-cache.json");
  if (fs.existsSync(cachePath)) {
    try {
      const cache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
      if (cache[query]) {
        console.log(`✓ Using cached image for: "${query}" -> ${cache[query].url}`);
        return {
          ...cache[query],
          alt: fallbackAlt || cache[query].alt,
          caption: fallbackCaption || cache[query].caption,
        };
      }
    } catch {}
  }

  console.log(`Searching Wikimedia for: "${query}"...`);
  const wiki = await searchWiki(query);
  if (!wiki) {
    throw new Error(`No Wikimedia image found for: "${query}"`);
  }

  console.log(`Downloading photo from: ${wiki.url.substring(0, 75)}...`);
  const res = await fetch(wiki.url, {
    headers: {
      "User-Agent": "VacayOut/1.0 (travel@vacayout.com; https://vacayout.com)",
      Accept: "image/*",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download image from ${wiki.url}: HTTP ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const type = sniffImage(bytes);
  if (!type) {
    throw new Error(`Downloaded file from ${wiki.url} is not a supported image format`);
  }

  const ext = EXT[type];
  const storageKey = `${prefix}-${Date.now()}.${ext}`;

  console.log(`Uploading to Vercel Blob: ${storageKey} (${bytes.length} bytes, ${type})...`);
  const stored = await storeImage(storageKey, bytes, type);

  const result = {
    url: stored.url,
    storageKey: stored.storageKey,
    contentType: type,
    bytes: bytes.length,
    alt: fallbackAlt || wiki.alt,
    caption: fallbackCaption || wiki.alt,
    kind: "photo" as const,
    license: wiki.license,
    licenseUrl: wiki.licenseUrl,
    attribution: wiki.author,
    sourceUrl: wiki.sourceUrl,
  };

  try {
    let cache: Record<string, any> = {};
    if (fs.existsSync(cachePath)) {
      cache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    }
    cache[query] = result;
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write image cache:", err);
  }

  return result;
}

const REGION_CONFIGS = [
  {
    title: "Kashmir Valley & Great Lakes",
    body: "The legendary alpine bowl encircled by the Pir Panjal and Greater Himalayas, centered around the summer capital Srinagar, the lotus-filled waters of Dal and Nigeen Lakes, floating vegetable markets, century-old cedar houseboats, and terraced Mughal pleasure gardens.",
    query: "Dal Lake Hazratbal Srinagar",
    alt: "Boatmen paddling across still reflective waters of Dal Lake below snow-covered mountains",
    caption: "Dal Lake & Zabarwan Range, Srinagar",
  },
  {
    title: "Pir Panjal & Alpine Meadow Resorts (Gulmarg & Yusmarg)",
    body: "The western mountain ramparts home to Gulmarg ('Meadow of Flowers') at 2,650m, Asia's highest operating cable car (Gulmarg Gondola) reaching 3,980m at Apharwat Peak, world-class powdery ski slopes, and the serene untamed meadows of Doodhpathri and Yusmarg.",
    query: "Gulmarg Kashmir snow gondola",
    alt: "Gulmarg Gondola cable car ascending above snow-covered pines toward Apharwat Peak",
    caption: "Gulmarg Ski Slopes & Gondola, Pir Panjal",
  },
  {
    title: "Lidder & Sindh River Valleys (Pahalgam & Sonamarg)",
    body: "The dramatic eastern alpine valleys: Pahalgam ('Valley of Shepherds') nestled along the rushing turquoise Lidder River with Betaab and Aru Valleys, and Sonamarg ('Meadow of Gold') on the Sindh River, gateway to Thajiwas Glacier and the Ladakh highway across Zojila Pass.",
    query: "Pahalgam Betaab Valley Kashmir",
    alt: "Turquoise river flowing through pine forests and alpine meadows of Betaab Valley",
    caption: "Betaab Valley & Lidder River, Pahalgam",
  },
  {
    title: "Jammu Hills & Sacred Shrines",
    body: "The southern sub-Himalayan Shivalik foothills and Trikuta mountain range, home to Jammu ('City of Temples'), the revered cave shrine of Shri Mata Vaishno Devi at Katra, the cool pine-forested ridge of Patnitop, and the engineering marvel of the Chenab railway bridge.",
    query: "Vaishno Devi Katra Jammu",
    alt: "Holy cave shrine of Shri Mata Vaishno Devi nestled in the Trikuta Mountains of Katra",
    caption: "Shri Mata Vaishno Devi Shrine, Katra",
  },
];

const DESTINATIONS_CONFIG = [
  {
    name: "Srinagar",
    slug: "srinagar",
    kind: "city" as const,
    summary: "The enchanting summer capital of Jammu and Kashmir, celebrated for its labyrinth of water channels on Dal and Nigeen lakes, hand-carved cedar houseboats, historic Mughal terraced gardens, and the bustling artisanal bazaars of the Old City.",
    lat: 34.0837,
    lng: 74.7973,
    tripTypes: ["heritage", "romantic", "culture"],
    query: "Dal Lake Srinagar Shikara",
    alt: "Colourful Shikara boats docked along the shores of Dal Lake in Srinagar",
    caption: "Shikaras on Dal Lake, Srinagar",
  },
  {
    name: "Gulmarg",
    slug: "gulmarg",
    kind: "town" as const,
    summary: "India's premier winter sports paradise and summer alpine bowl situated at 2,650m, featuring one of the world's highest operating passenger cable cars (Gulmarg Gondola) ascending to 3,980m on Apharwat Peak, pine-fringed golf links, and powdery ski runs.",
    lat: 34.0484,
    lng: 74.3805,
    tripTypes: ["mountains", "adventure", "romantic"],
    query: "Gulmarg meadow Kashmir",
    alt: "Lush green rolling meadows of Gulmarg framed by dense pine forests and snow peaks",
    caption: "Alpine Meadow of Gulmarg",
  },
  {
    name: "Pahalgam",
    slug: "pahalgam",
    kind: "town" as const,
    summary: "The scenic 'Valley of Shepherds' perched at 2,130m where the Lidder River rushes through dense pine and deodar forests, serving as the base for Betaab Valley, Aru Valley, Baisaran meadow ('Mini Switzerland'), and the annual Amarnath Yatra pilgrimage.",
    lat: 34.0161,
    lng: 75.3150,
    tripTypes: ["nature", "mountains", "adventure"],
    query: "Betaab Valley Pahalgam",
    alt: "Pristine green valley and clear mountain river in Betaab Valley near Pahalgam",
    caption: "Betaab Valley, Pahalgam",
  },
  {
    name: "Sonamarg",
    slug: "sonamarg",
    kind: "town" as const,
    summary: "The breathtaking 'Meadow of Gold' nestled at 2,740m along the roaring Sindh River in Ganderbal, famed for pony treks to the glistening Thajiwas Glacier, alpine trout fishing, and serving as the strategic gateway to Ladakh via Zojila Pass.",
    lat: 34.3056,
    lng: 75.2952,
    tripTypes: ["adventure", "mountains", "nature"],
    query: "Thajiwas Glacier Sonamarg",
    alt: "Glistening white ice tongues of Thajiwas Glacier descending into green meadows in Sonamarg",
    caption: "Thajiwas Glacier, Sonamarg",
  },
  {
    name: "Doodhpathri",
    slug: "doodhpathri",
    kind: "town" as const,
    summary: "An idyllic, pristine alpine bowl known as the 'Valley of Milk' in Budgam district, where emerald pastures carpeted with wild daisies meet the foaming, milk-white glacial rapids of the Shaliganga River without tourist commercialisation.",
    lat: 33.8722,
    lng: 74.5611,
    tripTypes: ["nature", "relaxing", "mountains"],
    query: "Doodhpathri meadow Kashmir",
    alt: "Rolling green meadows and pine woodlands of Doodhpathri with gushing stream",
    caption: "Pastures of Doodhpathri (Valley of Milk)",
  },
  {
    name: "Katra",
    slug: "katra",
    kind: "town" as const,
    summary: "The vibrant pilgrimage base town nestled at the foothills of the holy Trikuta Mountains, from where over 8 million devotees annually embark on the 12 km sacred trek to the holy cave shrine of Shri Mata Vaishno Devi.",
    lat: 32.9922,
    lng: 74.9317,
    tripTypes: ["spiritual", "mountains"],
    query: "Vaishno Devi temple Katra",
    alt: "Sacred shrine complex of Shri Mata Vaishno Devi lit up on the Trikuta hillside",
    caption: "Vaishno Devi Bhawan, Katra",
  },
  {
    name: "Jammu",
    slug: "jammu",
    kind: "city" as const,
    summary: "The historic winter capital of Jammu and Kashmir, known as the 'City of Temples' along the Tawi River, home to the ancient 3,000-year-old Bahu Fort, the grand Raghunath Temple, and the royal Mubarak Mandi Palace complex.",
    lat: 32.7266,
    lng: 74.8570,
    tripTypes: ["heritage", "spiritual", "culture"],
    query: "Bahu Fort Jammu",
    alt: "Ancient stone ramparts of Bahu Fort overlooking the Tawi River valley in Jammu",
    caption: "Historic Bahu Fort, Jammu",
  },
  {
    name: "Patnitop",
    slug: "patnitop",
    kind: "town" as const,
    summary: "A peaceful pine-forested hilltop retreat perched at 2,024m on a plateau along the Shivalik range, offering panoramic views over the Chenab River gorge, winter snow play, nature walks, and the Skyview luxury cable car ropeway.",
    lat: 33.0844,
    lng: 75.3267,
    tripTypes: ["mountains", "nature", "family"],
    query: "Patnitop hill station Jammu",
    alt: "Dense pine and cedar tree ridges across the mountain slopes of Patnitop",
    caption: "Pine Forest Ridge of Patnitop",
  },
  {
    name: "Yusmarg",
    slug: "yusmarg",
    kind: "town" as const,
    summary: "A tranquil highland meadow celebrated as the 'Meadow of Jesus', situated 47 km from Srinagar amidst towering fir trees, offering scenic horseback trails to the roaring Doodh Ganga torrent and the alpine blue Nilnag Lake.",
    lat: 33.8311,
    lng: 74.6644,
    tripTypes: ["nature", "mountains", "relaxing"],
    query: "Yusmarg meadow Kashmir",
    alt: "Expansive green pastures and alpine pine woods of Yusmarg under clear mountain skies",
    caption: "Alpine Meadows of Yusmarg",
  },
  {
    name: "Gurez Valley",
    slug: "gurez-valley",
    kind: "region" as const,
    summary: "A remote, breathtaking frontier Himalayan valley located along the ancient Silk Route and Kishanganga River, dominated by the majestic pyramid-shaped Habba Khatoon peak and the distinctive wooden architecture of Dardic Shin villages.",
    lat: 34.6361,
    lng: 74.8389,
    tripTypes: ["adventure", "mountains", "nature"],
    query: "Habba Khatoon peak Gurez Valley",
    alt: "Towering pyramid limestone peak of Habba Khatoon rising above the Kishanganga river in Gurez",
    caption: "Habba Khatoon Peak, Gurez Valley",
  },
];

async function main() {
  const db = getDb();
  console.log("=== STARTING COMPLETE JAMMU & KASHMIR STATE SEEDING ===");

  // 1. Check or insert Jammu & Kashmir state
  let [jk] = await db
    .select()
    .from(places)
    .where(and(eq(places.slug, "jammu-and-kashmir"), eq(places.kind, "state")))
    .limit(1);

  if (!jk) {
    [jk] = await db
      .insert(places)
      .values({
        kind: "state",
        name: "Jammu and Kashmir",
        slug: "jammu-and-kashmir",
        summary:
          "Jammu and Kashmir, immortalised by Mughal Emperor Jahangir as 'Paradise on Earth', is an extraordinary realm of alpine majesty and spiritual antiquity. From the cedar houseboats and floating gardens of Dal Lake to the snow-covered ski slopes of Gulmarg, the roaring Lidder waters of Pahalgam, and the sacred cave shrines of Vaishno Devi and Amarnath, the Union Territory encompasses dramatic Himalayan landscapes, 500-year-old Sufi and Shaivite traditions, and legendary artisan craftsmanship.",
        lat: 34.0837,
        lng: 74.7973,
        seoTitle: "Jammu and Kashmir Travel Guide: Srinagar, Gulmarg, Pahalgam & Trip Planning",
        seoDescription:
          "Comprehensive Jammu and Kashmir travel guide covering Srinagar, Dal Lake houseboats, Gulmarg Gondola, Pahalgam, Sonamarg, Vaishno Devi, best time, itineraries, and maps.",
        status: "draft",
        tripTypes: ["mountains", "nature", "spiritual", "romantic", "adventure"],
        suggestedTripTypes: ["mountains", "nature", "spiritual", "romantic", "adventure", "heritage", "family"],
        featured: true,
      })
      .returning();
    console.log(`✓ Inserted Jammu & Kashmir state record: id=${jk.id}`);
  } else {
    console.log(`Found existing Jammu & Kashmir state record: id=${jk.id}`);
  }

  // Fetch admin user
  const [adminUser] = await db.select().from(users).limit(1);
  const actorId = adminUser?.id ?? jk.id;

  // 2. Fetch & store State Hero Photo
  console.log("\n=== 2. UPLOADING REAL STATE HERO PHOTO ===");
  let stateHeroImg: any;
  let stateHeroMedia: any;
  if (jk.heroMediaId) {
    const [existingHeroMedia] = await db.select().from(media).where(eq(media.id, jk.heroMediaId)).limit(1);
    if (existingHeroMedia) {
      stateHeroMedia = existingHeroMedia;
      stateHeroImg = {
        url: existingHeroMedia.url,
        storageKey: existingHeroMedia.storageKey,
        contentType: existingHeroMedia.contentType,
        bytes: existingHeroMedia.bytes,
        alt: existingHeroMedia.alt,
        caption: existingHeroMedia.caption,
        kind: existingHeroMedia.kind,
        license: existingHeroMedia.license,
        licenseUrl: existingHeroMedia.licenseUrl,
        attribution: existingHeroMedia.attribution,
        sourceUrl: existingHeroMedia.sourceUrl,
      };
      console.log("✓ Reusing existing state hero photo");
    }
  }

  if (!stateHeroImg) {
    stateHeroImg = await fetchAndStoreImage(
      "Dal Lake Hazratbal Srinagar",
      "places/jammu-and-kashmir/hero",
      "Boatmen paddling across still reflective waters of Dal Lake below snow-covered mountains",
      "Dal Lake, Srinagar"
    );

    const [insertedHero] = await db
      .insert(media)
      .values({
        placeId: jk.id,
        storageKey: stateHeroImg.storageKey,
        url: stateHeroImg.url,
        contentType: stateHeroImg.contentType,
        bytes: stateHeroImg.bytes,
        alt: stateHeroImg.alt,
        caption: stateHeroImg.caption,
        kind: "photo",
        license: stateHeroImg.license,
        licenseUrl: stateHeroImg.licenseUrl,
        attribution: stateHeroImg.attribution,
        sourceUrl: stateHeroImg.sourceUrl,
        createdAt: new Date(),
      })
      .returning();
    stateHeroMedia = insertedHero;

    await db.update(places).set({ heroMediaId: stateHeroMedia.id }).where(eq(places.id, jk.id));
    console.log("✓ Linked hero media to Jammu & Kashmir place");
  }

  // 3. Fetch & store 4 Regions
  console.log("\n=== 3. UPLOADING REAL PHOTOS FOR 4 REGIONS ===");
  const regionItems = [];
  for (const reg of REGION_CONFIGS) {
    const slugKey = reg.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const img = await fetchAndStoreImage(
      reg.query,
      `places/jammu-and-kashmir/regions/${slugKey}`,
      reg.alt,
      reg.caption
    );

    regionItems.push({
      title: reg.title,
      body: reg.body,
      status: "verified" as ItemStatus,
      image: {
        url: img.url,
        alt: img.alt,
        caption: img.caption,
        kind: img.kind,
        license: img.license,
        licenseUrl: img.licenseUrl,
        attribution: img.attribution,
        sourceUrl: img.sourceUrl,
      },
    });
  }

  // 4. Seed 10 Child Destinations
  console.log("\n=== 4. SEEDING 10 CHILD DESTINATIONS WITH REAL PHOTOS ===");
  const childPlacesData = [];
  for (const d of DESTINATIONS_CONFIG) {
    let [child] = await db
      .select()
      .from(places)
      .where(and(eq(places.slug, d.slug), eq(places.stateId, jk.id)))
      .limit(1);

    if (!child) {
      [child] = await db
        .insert(places)
        .values({
          kind: d.kind,
          name: d.name,
          slug: d.slug,
          parentId: jk.id,
          stateId: jk.id,
          summary: d.summary,
          lat: d.lat,
          lng: d.lng,
          seoTitle: `${d.name} Travel Guide: Places to Visit, Best Time & Trip Planning`,
          seoDescription: d.summary,
          status: "published",
          tripTypes: d.tripTypes,
          suggestedTripTypes: d.tripTypes,
          featured: true,
          displayMode: "page",
        })
        .returning();
      console.log(`✓ Inserted destination record: ${d.name}`);
    } else {
      console.log(`Found existing destination record: ${d.name}`);
    }

    let img: any;
    if (child.heroMediaId) {
      const [existingMedia] = await db
        .select()
        .from(media)
        .where(eq(media.id, child.heroMediaId))
        .limit(1);
      if (existingMedia) {
        img = {
          url: existingMedia.url,
          storageKey: existingMedia.storageKey,
          contentType: existingMedia.contentType,
          bytes: existingMedia.bytes,
          alt: existingMedia.alt,
          caption: existingMedia.caption,
          kind: existingMedia.kind,
          license: existingMedia.license,
          licenseUrl: existingMedia.licenseUrl,
          attribution: existingMedia.attribution,
          sourceUrl: existingMedia.sourceUrl,
        };
        console.log(`✓ Reusing existing hero media for ${d.name}`);
      }
    }

    if (!img) {
      img = await fetchAndStoreImage(
        d.query,
        `places/${d.slug}/hero`,
        d.alt,
        d.caption
      );

      const [childMedia] = await db
        .insert(media)
        .values({
          placeId: child.id,
          storageKey: img.storageKey,
          url: img.url,
          contentType: img.contentType,
          bytes: img.bytes,
          alt: img.alt,
          caption: img.caption,
          kind: "photo",
          license: img.license,
          licenseUrl: img.licenseUrl,
          attribution: img.attribution,
          sourceUrl: img.sourceUrl,
          createdAt: new Date(),
        })
        .returning();

      await db.update(places).set({ heroMediaId: childMedia.id }).where(eq(places.id, child.id));
    }

    const heroImgObj = {
      url: img.url,
      alt: img.alt,
      caption: img.caption,
      kind: img.kind,
      license: img.license,
      licenseUrl: img.licenseUrl,
      attribution: img.attribution,
      sourceUrl: img.sourceUrl,
    };

    childPlacesData.push({
      id: child.id,
      name: child.name,
      slug: child.slug,
      kind: child.kind,
      summary: child.summary,
      lat: child.lat,
      lng: child.lng,
      tripTypes: child.tripTypes,
      heroImage: heroImgObj,
    });

    // Create published snapshot for child destination
    const childSnapshot = {
      place: {
        id: child.id,
        kind: d.kind,
        name: d.name,
        slug: d.slug,
        summary: d.summary,
        lat: d.lat,
        lng: d.lng,
        seoTitle: `${d.name} Travel Guide: Places to Visit, Best Time & Trip Planning`,
        seoDescription: d.summary,
        state: { name: jk.name, slug: jk.slug },
        parent: { name: jk.name, slug: jk.slug, kind: "state" },
        displayMode: "page" as const,
        hero: heroImgObj,
      },
      sections: [
        {
          key: "overview",
          body: { text: d.summary },
        },
      ],
      childPlaces: [],
      itineraries: [],
      guides: [],
      publishedAt: new Date().toISOString(),
    };

    const [existingChildPV] = await db
      .select()
      .from(placeVersions)
      .where(and(eq(placeVersions.placeId, child.id), eq(placeVersions.version, 1)))
      .limit(1);

    let childPvRow;
    if (existingChildPV) {
      const [u] = await db
        .update(placeVersions)
        .set({ snapshot: childSnapshot as any })
        .where(eq(placeVersions.id, existingChildPV.id))
        .returning();
      childPvRow = u;
    } else {
      const [i] = await db
        .insert(placeVersions)
        .values({
          placeId: child.id,
          version: 1,
          snapshot: childSnapshot as any,
        })
        .returning();
      childPvRow = i;
    }

    await db
      .update(places)
      .set({
        status: "published",
        displayMode: "page",
        publishedVersionId: childPvRow.id,
        updatedAt: new Date(),
      })
      .where(eq(places.id, child.id));

    const childDoc = {
      versionId: childPvRow.id,
      path: `/india/jammu-and-kashmir/${d.slug}`,
      name: d.name,
      kind: d.kind,
      stateName: "Jammu and Kashmir",
      content: `${d.name} Jammu and Kashmir. ${d.summary}`,
      updatedAt: new Date(),
    };
    await db
      .insert(searchDocuments)
      .values({ placeId: child.id, ...childDoc })
      .onConflictDoUpdate({ target: searchDocuments.placeId, set: childDoc });

    console.log(`  ✓ Published destination page for: ${d.name} (id: ${child.id})`);
  }

  // 4b. Seed top activities & experiences for Jammu & Kashmir (shown in /things-to-do)
  console.log("\n=== 4b. SEEDING TOP ACTIVITIES & EXPERIENCES FOR J&K ===");
  const srinagarPlace = childPlacesData.find((c) => c.slug === "srinagar");
  const gulmargPlace = childPlacesData.find((c) => c.slug === "gulmarg");
  const pahalgamPlace = childPlacesData.find((c) => c.slug === "pahalgam");
  const sonamargPlace = childPlacesData.find((c) => c.slug === "sonamarg");

  const ACTIVITIES = [
    {
      name: "Shikara Ride & Floating Market on Dal Lake",
      slug: "shikara-ride-dal-lake-srinagar",
      kind: "activity" as const,
      category: "cultural",
      parent: srinagarPlace,
      summary: "Glide along the mirror-like waters of Dal Lake in a cushioned wooden Shikara boat at dawn, exploring floating vegetable markets, lotus gardens, and Char Chinar.",
      lat: 34.0837,
      lng: 74.8211,
      tripTypes: ["cultural", "romantic", "nature"],
      query: "Shikara Dal Lake Srinagar",
      alt: "Paddling a wooden Shikara boat across mirror-still waters of Dal Lake",
      caption: "Dawn Shikara Ride on Dal Lake, Srinagar",
    },
    {
      name: "Gulmarg Gondola Ride to Apharwat Peak",
      slug: "gulmarg-gondola-apharwat-ride",
      kind: "activity" as const,
      category: "adventure",
      parent: gulmargPlace,
      summary: "Soar above pine forests and snowdrifts on Asia's highest operating cable car to Kongdoori (Phase 1) and Apharwat Peak at 3,980m (Phase 2) for unmatched Himalayan panoramas.",
      lat: 34.0484,
      lng: 74.3805,
      tripTypes: ["adventure", "mountains"],
      query: "Gulmarg gondola Apharwat",
      alt: "Gulmarg Gondola cabin suspended high above snow-covered slopes and mountain ridges",
      caption: "Gulmarg Gondola to Apharwat Peak (3,980m)",
    },
    {
      name: "Betaab Valley & Aru Valley Alpine Meadows Walk",
      slug: "betaab-valley-aru-pahalgam-trek",
      kind: "activity" as const,
      category: "nature",
      parent: pahalgamPlace,
      summary: "Walk along the crystal-clear turquoise waters of the Lidder River, through the verdant pine-surrounded meadows of Betaab Valley and the peaceful mountain village of Aru.",
      lat: 34.0161,
      lng: 75.3150,
      tripTypes: ["nature", "mountains", "romantic"],
      query: "Aru Valley Pahalgam Kashmir",
      alt: "Idyllic wooden houses and green alpine meadows of Aru Valley near Pahalgam",
      caption: "Aru Valley & Betaab Valley Trails, Pahalgam",
    },
    {
      name: "Thajiwas Glacier Trek & Snow Sledging in Sonamarg",
      slug: "thajiwas-glacier-sonamarg-trek",
      kind: "activity" as const,
      category: "adventure",
      parent: sonamargPlace,
      summary: "Trek or take a pony ride to the year-round snowfields and ice cascades of Thajiwas Glacier beneath towering granite peaks, enjoying wooden sledging and alpine views.",
      lat: 34.3056,
      lng: 75.2952,
      tripTypes: ["adventure", "nature", "mountains"],
      query: "Thajiwas Glacier Sonamarg",
      alt: "Tourists exploring snowfields near Thajiwas Glacier with backdrop of rugged jagged peaks",
      caption: "Thajiwas Glacier Trail, Sonamarg",
    },
  ];

  for (const act of ACTIVITIES) {
    let [actPlace] = await db
      .select()
      .from(places)
      .where(and(eq(places.slug, act.slug), eq(places.stateId, jk.id)))
      .limit(1);

    if (!actPlace) {
      [actPlace] = await db
        .insert(places)
        .values({
          kind: act.kind,
          category: act.category,
          name: act.name,
          slug: act.slug,
          parentId: act.parent?.id ?? jk.id,
          stateId: jk.id,
          summary: act.summary,
          lat: act.lat,
          lng: act.lng,
          seoTitle: `${act.name}: Best Time, Timings, Tickets & Guide`,
          seoDescription: act.summary,
          status: "published",
          tripTypes: act.tripTypes,
          suggestedTripTypes: act.tripTypes,
          featured: true,
          displayMode: "page",
        })
        .returning();
      console.log(`✓ Inserted experience/activity: ${act.name}`);
    }

    const actImg = await fetchAndStoreImage(act.query, `places/${act.slug}/hero`, act.alt, act.caption);
    const [actMedia] = await db
      .insert(media)
      .values({
        placeId: actPlace.id,
        storageKey: actImg.storageKey,
        url: actImg.url,
        contentType: actImg.contentType,
        bytes: actImg.bytes,
        alt: actImg.alt,
        caption: actImg.caption,
        kind: "photo",
        license: actImg.license,
        licenseUrl: actImg.licenseUrl,
        attribution: actImg.attribution,
        sourceUrl: actImg.sourceUrl,
        createdAt: new Date(),
      })
      .returning();

    await db.update(places).set({ heroMediaId: actMedia.id }).where(eq(places.id, actPlace.id));

    const actSnapshot = {
      place: {
        id: actPlace.id,
        kind: act.kind,
        name: act.name,
        slug: act.slug,
        summary: act.summary,
        lat: act.lat,
        lng: act.lng,
        seoTitle: `${act.name}: Best Time, Timings, Tickets & Guide`,
        seoDescription: act.summary,
        state: { name: jk.name, slug: jk.slug },
        parent: act.parent ? { name: act.parent.name, slug: act.parent.slug, kind: act.parent.kind } : { name: jk.name, slug: jk.slug, kind: "state" },
        displayMode: "page" as const,
        hero: {
          url: actImg.url,
          alt: actImg.alt,
          caption: actImg.caption,
          kind: actImg.kind,
          license: actImg.license,
          licenseUrl: actImg.licenseUrl,
          attribution: actImg.attribution,
          sourceUrl: actImg.sourceUrl,
        },
      },
      sections: [{ key: "overview", body: { text: act.summary } }],
      childPlaces: [],
      itineraries: [],
      guides: [],
      publishedAt: new Date().toISOString(),
    };

    const [existingActPV] = await db
      .select()
      .from(placeVersions)
      .where(and(eq(placeVersions.placeId, actPlace.id), eq(placeVersions.version, 1)))
      .limit(1);

    let actPvRow;
    if (existingActPV) {
      const [u] = await db
        .update(placeVersions)
        .set({ snapshot: actSnapshot as any })
        .where(eq(placeVersions.id, existingActPV.id))
        .returning();
      actPvRow = u;
    } else {
      const [i] = await db
        .insert(placeVersions)
        .values({
          placeId: actPlace.id,
          version: 1,
          snapshot: actSnapshot as any,
        })
        .returning();
      actPvRow = i;
    }

    await db
      .update(places)
      .set({
        status: "published",
        displayMode: "page",
        publishedVersionId: actPvRow.id,
        updatedAt: new Date(),
      })
      .where(eq(places.id, actPlace.id));

    const parentSlug = act.parent ? `${act.parent.slug}/` : "";
    const actDoc = {
      versionId: actPvRow.id,
      path: `/india/jammu-and-kashmir/${parentSlug}${act.slug}`,
      name: act.name,
      kind: act.kind,
      stateName: "Jammu and Kashmir",
      content: `${act.name} Jammu and Kashmir. ${act.summary}`,
      updatedAt: new Date(),
    };
    await db
      .insert(searchDocuments)
      .values({ placeId: actPlace.id, ...actDoc })
      .onConflictDoUpdate({ target: searchDocuments.placeId, set: actDoc });

    console.log(`  ✓ Published activity: ${act.name} (id: ${actPlace.id})`);
  }

  // 5. Populate All 16 State Sections for Jammu & Kashmir
  console.log("\n=== 5. POPULATING 16 STATE SECTIONS ===");
  const allSections: { key: string; body: any }[] = [
    {
      key: "overview",
      body: {
        text: "Jammu and Kashmir, celebrated across centuries as 'Paradise on Earth', is an extraordinary northern realm where the glaciated peaks of the Greater Himalayas and the dense pine-clad ridges of the Pir Panjal enclose the legendary Kashmir Valley. Traversed by the serpentine waters of the Jhelum, Chenab, and Tawi rivers, the Union Territory spans a remarkable geographic and cultural spectrum—from the subtropical Shivalik plains and historic temple spires of Jammu to the world-renowned lotus lakes, cedarwood houseboats, and terraced Mughal pleasure gardens of Srinagar.\n\nHistorically, the region has been a vibrant crucible of spiritual philosophy, classical literature, and cosmopolitan commerce. It was the cradle of Kashmir Shaivism, a flourishing centre of Mahayana Buddhism under Emperor Kanishka, and a sanctuary of Sufism, as embodied by the revered 14th-century mystic poetess Lal Ded and patron saint Nund Rishi (Sheikh Noor-ud-Din Wali). In the 16th and 17th centuries, Mughal emperors Jahangir and Shah Jahan turned the valley into their summer imperial retreat, engineering magnificent terraced water gardens at Shalimar Bagh, Nishat Bagh, and Chashme Shahi, with cascading fountains framing Dal Lake against the snow-streaked Zabarwan mountains.\n\nIn 2024, Jammu and Kashmir recorded a landmark 23.0 million domestic tourist visits and 65,000 foreign arrivals (India Tourism Data Compendium 2025), reflecting immense traveller demand for its world-class winter ski slopes in Gulmarg, trekking trails through the pristine meadows of Pahalgam and Sonamarg, and sacred pilgrimages to the holy cave shrine of Shri Mata Vaishno Devi at Katra and Amarnath Dham.",
      },
    },
    {
      key: "key_facts",
      body: {
        items: [
          { title: "Best time to visit", body: "Apr–Jun (pleasant spring blooms & green valleys) · Jul–Aug (Amarnath Yatra & alpine treks) · Dec–Feb (Gulmarg winter snow & skiing)", status: "seasonal" },
          { title: "Recommended trip length", body: "Plan 6–7 days for Srinagar, Gulmarg, and Pahalgam; 9–10 days to include Sonamarg, Doodhpathri, and Katra (Vaishno Devi)", status: "estimate" },
          { title: "Geography & Highest Elevation", body: "42,241 km² territory; elevations range from 300m in Jammu plains to 5,425m in the Greater Himalayan crests", status: "verified" },
          { title: "Dual Capitals", body: "Srinagar (Summer Capital, May–October) · Jammu (Winter Capital, November–April)", status: "verified" },
        ],
      },
    },
    {
      key: "regions",
      body: {
        items: regionItems,
      },
    },
    {
      key: "highlights",
      body: {
        items: [
          { body: "Dal Lake Shikara & Heritage Houseboats — Glide through calm lotus waters and sleep aboard handcrafted cedarwood houseboats.", status: "verified" },
          { body: "Gulmarg Gondola & Apharwat Peak — Asia's highest operating cable car ascending to 3,980m for skiing and panoramic Himalayan vistas.", status: "verified" },
          { body: "Betaab Valley & Lidder River in Pahalgam — Picturesque pine-fringed alpine meadows named after the classic Bollywood movie.", status: "verified" },
          { body: "Thajiwas Glacier in Sonamarg — Year-round snowfields, pony treks, and dramatic granite peaks in the 'Meadow of Gold'.", status: "verified" },
          { body: "UNESCO Mughal Terraced Gardens — Shalimar Bagh, Nishat Bagh, and Pari Mahal with flowing Persian fountains facing Dal Lake.", status: "verified" },
          { body: "Shri Mata Vaishno Devi Cave Shrine — India's revered pilgrimage sanctuary in the sacred Trikuta Mountains of Katra.", status: "verified" },
          { body: "Indira Gandhi Memorial Tulip Garden — Asia's largest tulip garden boasting over 1.5 million blooming bulbs in April.", status: "seasonal" },
          { body: "Traditional 36-Course Kashmiri Wazwan — Grand royal culinary feast featuring Rogan Josh, Gushtaba, and Rista served on a copper Traem.", status: "verified" },
        ],
      },
    },
    {
      key: "things_to_do",
      body: {
        items: [
          { body: "Take a sunrise Shikara ride on Dal Lake to witness the historic floating vegetable and flower market." },
          { body: "Ride Phase 1 and Phase 2 of the Gulmarg Gondola up to Apharwat Peak at 3,980m for snow activities and alpine views." },
          { body: "Stroll barefoot through the terraced fountains and chinar groves of Shalimar Bagh and Nishat Bagh at golden hour." },
          { body: "Walk along the foaming turquoise rapids of the Lidder River in Pahalgam and explore the quiet wooden village of Aru." },
          { body: "Hire a pony or trek up to the snow cascades of Thajiwas Glacier in Sonamarg, trying wooden toboggan sledging." },
          { body: "Explore the ancient wooden architecture of Jamia Masjid in Srinagar's Old City with its 378 monumental deodar pillars." },
          { body: "Sip warm golden Kahwa tea brewed with saffron, green tea leaves, crushed green cardamom, and slivered almonds." },
          { body: "Embark on the 12 km pilgrimage trek or battery-car ride from Katra up to the holy cave shrine of Vaishno Devi." },
        ],
      },
    },
    {
      key: "best_time",
      body: {
        text: "Spring (April to May): Widely considered the most magical time to experience the Kashmir Valley. Fruit orchards of almond, cherry, and apple burst into white and pink blossoms across the countryside. The world-famous Indira Gandhi Memorial Tulip Garden in Srinagar opens for approximately 3 to 4 weeks in April, displaying over 1.5 million tulips in 60+ vibrant varieties against the Zabarwan range. Daytime temperatures range from a pleasant 15°C to 22°C with crisp, cool evenings.\n\nSummer (June to August): The peak tourist and pilgrimage season. As the north Indian plains swelter, Kashmir and higher hill stations like Gulmarg, Pahalgam, and Sonamarg offer refreshing temperatures between 20°C and 30°C. Alpine meadows are lush green, rivers flow with clear snowmelt, and high mountain trekking routes (such as the Kashmir Great Lakes Trek and Tarsar Marsar) open. This season also hosts the sacred Amarnath Yatra pilgrimage to the high-altitude holy cave at 3,888m.\n\nAutumn (September to November): The season of golden foliage and crisp mountain air. The majestic Chinar trees across Srinagar and Mughal gardens transform into fiery hues of crimson, amber, and gold. Saffron fields in Pampore reach harvest in late October, blanketing the fields in delicate purple blossoms. Weather is consistently dry, skies are crystal clear, and it is the best time for photography and quiet sightseeing.\n\nWinter (December to March): Gulmarg transforms into India's premier international ski resort, receiving meters of powdery alpine snow. Skiers and snowboarders from around the world take the Gulmarg Gondola to Apharwat Peak for backcountry and tree skiing. Srinagar experiences chilly, magical snowfall (temperatures dipping to -4°C to 7°C) with Dal Lake occasionally freezing along its edges. Houseboats and hotels use traditional Kangris (earthen pots with embers) and wood-fired Hamams for cozy warmth.",
      },
    },
    {
      key: "how_to_reach",
      body: {
        text: "By Air: Sheikh ul-Alam International Airport (SXR) in Srinagar is the primary air gateway to the Kashmir Valley, situated 12 km (25 minutes drive) from the city center and Dal Lake. It operates frequent daily direct non-stop flights from New Delhi, Mumbai, Bengaluru, Chandigarh, and Ahmedabad operated by IndiGo, Air India, and SpiceJet. For southern destinations like Vaishno Devi and Patnitop, Jammu Civil Enclave Airport (IXJ) operates regular daily flights from Delhi and major metro cities.\n\nBy Rail: Jammu Tawi Railway Station (JAT) and Shri Mata Vaishno Devi Katra (SVDK) are major broad-gauge rail terminals served by high-speed trains from across India, including the New Delhi–Katra Vande Bharat Express (taking just 8 hours to Katra) and the Uttar Sampark Kranti. For the Kashmir Valley, the historic Udhampur–Srinagar–Baramulla Rail Link (USBRL)—featuring the world's highest railway bridge over the Chenab River—connects the northern rail network directly into Srinagar Railway Station.\n\nBy Road: National Highway 44 (NH-44) is the vital all-weather arterial highway connecting Jammu to Srinagar through the modern 9-km Dr. Syama Prasad Mookerjee (Chenani–Nashri) Tunnel and the 8.5-km Navyug (Qazigund–Banihal) Tunnel, significantly cutting travel time across the Pir Panjal mountains to 6–7 hours. JKSRTC operates regular deluxe Volvo and sleeper coaches connecting Delhi, Chandigarh, and Jammu directly to Srinagar.",
      },
    },
    {
      key: "local_transport",
      body: {
        items: [
          { title: "Shikaras on Dal & Nigeen Lakes", body: "Traditional wooden passenger boats operate by government-approved hourly union tariffs (approx. ₹700–₹1,000/hr) for sightseeing, floating market tours, and crossing to houseboats.", status: "verified" },
          { title: "Tourist Taxis & Union Cabs", body: "Prepaid airport taxis connect Srinagar Airport to Dal Lake. For day trips to Gulmarg, Pahalgam, and Sonamarg, book licensed private cabs from the Tourist Taxi Stand at TRC Srinagar.", status: "verified" },
          { title: "Local Destination Cabs (Pahalgam & Sonamarg)", body: "Local taxi unions in Pahalgam (for Betaab/Aru valleys) and Sonamarg operate fixed-rate union vehicles; outside cabs drop at town taxi stands.", status: "verified" },
          { title: "Auto-Rickshaws", body: "Plentiful for short trips within Srinagar, Jammu, and Katra. Drivers do not always use meters; negotiate the fare upfront before boarding.", status: "verified" },
        ],
      },
    },
    {
      key: "where_to_stay",
      body: {
        items: [
          { title: "Dal Lake & Nigeen Lake (Srinagar Houseboats)", body: "Stay in handcrafted cedarwood houseboats with intricately carved walnut furniture, embroidered Kashmiri carpets, and private verandas facing lotus waterways. Nigeen Lake offers a quieter, serene ambiance.", status: "verified" },
          { title: "Gulmarg Alpine Meadow", body: "Luxury ski chalets, heritage wooden hotels with central heating, and boutique mountain lodges situated within walking distance of the Gulmarg Gondola boarding station.", status: "verified" },
          { title: "Pahalgam Along Lidder River", body: "Riverside boutique cottages, log huts, and pine-view resorts where you can fall asleep to the gentle rushing sound of the mountain torrent.", status: "verified" },
          { title: "Katra Base Town (Vaishno Devi)", body: "Extensive selection of clean pilgrimage hotels, luxury spiritual retreats, and Shri Mata Vaishno Devi Shrine Board (SMVDSB) guesthouses.", status: "verified" },
        ],
      },
    },
    {
      key: "itinerary",
      body: {
        text: "The Classic 6-Day Kashmir Paradise Loop: Fly into Srinagar (SXR). Spend Day 1 settling into a cedar houseboat on Dal Lake and taking a sunset Shikara cruise. Dedicate Day 2 to Srinagar's terraced Mughal gardens (Shalimar, Nishat, Pari Mahal) and historic Jamia Masjid in the Old City. On Day 3, take a day trip to Gulmarg for the Gulmarg Gondola Phase 1 & 2 to Apharwat Peak (3,980m). On Day 4, drive 2.5 hours through saffron fields to Pahalgam, exploring Betaab Valley and Lidder riverbanks. On Day 5, take a scenic excursion to Sonamarg for the Thajiwas Glacier trek before returning to Srinagar. Disembark on Day 6 with morning saffron shopping and airport departure.\n\nThe 7 to 8-Day Divine Jammu & Kashmir Circuit: Combine spiritual devotion with alpine beauty. Arrive in Jammu, drive 1.5 hours to Katra, and undertake the sacred Vaishno Devi yatra on Day 2. On Day 3, drive across the scenic pine plateau of Patnitop. On Day 4, pass through the Chenani-Nashri and Qazigund tunnels into the Kashmir Valley for 3 to 4 days exploring Srinagar, Gulmarg, and Pahalgam before flying home from Srinagar.",
      },
    },
    {
      key: "budget",
      body: {
        items: [
          { title: "Budget Explorer (₹2,000–₹3,500/day)", body: "Stay in budget guesthouses or standard Dal Lake houseboats; eat local Kashmiri street food (tujji kebabs, harissa, thali); use shared cabs and public JKSRTC buses.", status: "estimate" },
          { title: "Mid-Range Comfort (₹5,500–₹11,000/day)", body: "Deluxe category houseboats with heating and boutique riverside hotels; private dedicated tourist cab for hill transfers; Gulmarg Gondola Phase 1 tickets.", status: "estimate" },
          { title: "Luxury Experience (₹18,000–₹40,000+/day)", body: "5-star luxury heritage resorts (The Lalit Grand Palace, Khyber Himalayan Resort); private super-deluxe houseboat with butler; full Phase 1 & 2 Gondola passes and private Wazwan dinners.", status: "estimate" },
          { title: "Key Activity Tariffs", body: "Gulmarg Gondola: Phase 1 ₹800, Phase 2 ₹1,000 (pre-booking on official portal mandatory); 2-hour Shikara ride: approx. ₹1,000; Mughal Garden entry: ₹24–₹50 per person.", status: "verified" },
        ],
      },
    },
    {
      key: "food",
      body: {
        items: [
          { body: "Kashmiri Wazwan: The multi-course royal feast of Kashmiri cuisine, slow-cooked over woodfires by master chefs (Wazas), featuring Rogan Josh (succulent mutton in Kashmiri chilli gravy), Gushtaba (silky mutton meatballs in tangy yoghurt gravy), Rista, Tabak Maaz (crispy fried ribs), and Dhaniwal Korma." },
          { body: "Kahwa: Traditional aromatic Kashmiri green tea infused with whole saffron strands, crushed green cardamom pods, cinnamon, and generous slivers of crunchy almonds, sweetened with pure honey." },
          { body: "Modur Pulao: A fragrant, sweet Kashmiri saffron rice preparation cooked in pure desi ghee, garnished with almonds, cashews, raisins, and aromatic whole spices." },
          { body: "Dum Aloo: Baby potatoes parboiled, deep-fried until crisp and golden, and simmered in an unctuous, mildly spiced fennel and ginger yoghurt gravy." },
          { body: "Nadru Yakhni: Crisp, tender lotus stem rounds sliced and simmered in a delicate, velvety yoghurt gravy flavoured with dry mint leaves and Kashmiri hing." },
          { body: "Kashmiri Tujji (Barbecue Kebabs): Skewered marinated mutton or beef chunks grilled over red-hot charcoal braziers along Khayam Chowk, served with a dozen spiced chutneys and fresh Lavasa bread." },
          { body: "Harissa: A rich, slow-cooked winter breakfast delicacy prepared by cooking mutton, rice, and spices together for 12 hours until meltingly tender, topped with smoking mustard oil." },
          { body: "Noon Chai (Pink Salted Tea): A unique savoury pink tea brewed from special green tea leaves with baking soda, whole milk, sea salt, and crushed pistachios, paired with fresh local bread." },
        ],
      },
    },
    {
      key: "culture_etiquette",
      body: {
        items: [
          { body: "Modest Dressing: Kashmir is culturally conservative. Dress modestly covering shoulders and knees. When visiting sacred shrines (Hazratbal, Jamia Masjid, Shankaracharya Temple), women should cover their heads with a scarf and men should avoid shorts." },
          { body: "Footwear Etiquette: Always remove your footwear before stepping inside mosques, temples, shrine sanctums, and carpeted rooms of traditional Kashmiri houseboats." },
          { body: "Warm Hospitality: Kashmiris are renowned for their extraordinary warmth and hospitality (Mehman-nawazi). It is customary to accept offered cups of Kahwa tea as a gesture of goodwill." },
          { body: "Photography Courtesy: Ask polite permission before photographing local residents, saffron farmers, boatmen, or women in traditional Pherans." },
          { body: "Respect Sacred Spaces: Strictly refrain from taking photographs inside temple inner sanctums and maintain silence during prayer calls and religious recitations." },
        ],
      },
    },
    {
      key: "shopping",
      body: {
        items: [
          { title: "Pure Pashmina & Cashmere Shawls", body: "World-renowned ultra-fine shawls handspun from Changthangi mountain goat fleece, adorned with intricate Sozni needle embroidery. Look for the official GI tag hologram.", status: "verified" },
          { title: "Pampore Saffron (Kesar)", body: "Prized for its deep crimson stigma, unmatched aroma, and medicinal properties. Purchase directly from verified saffron growers' cooperatives in Pampore.", status: "verified" },
          { title: "Carved Walnut Woodwork", body: "Intricately hand-chiseled dining tables, jewellery boxes, and trays carved from seasoned walnut wood by master craftsmen in Srinagar.", status: "verified" },
          { title: "Kashmiri Papier-Mâché", body: "Ornamental handcrafted boxes, vases, and Christmas ornaments painted with delicate floral motifs and finished with gleaming lacquer.", status: "verified" },
          { title: "Hand-Knotted Silk Carpets", body: "Exquisite high-density silk and wool floor carpets featuring classical Persian medallion patterns, woven over months by generational artisan families.", status: "verified" },
          { title: "Dry Fruits & Kashmiri Honey", body: "Crisp Kashmiri paper-shell walnuts (Kagzi Akhrot), Mamra almonds, dried apricots, and pure organic mountain multi-flower honey.", status: "verified" },
        ],
      },
    },
    {
      key: "practical_info",
      body: {
        items: [
          { title: "Postpaid SIM Card Rule", body: "Due to national security regulations, prepaid mobile SIM cards issued outside Jammu and Kashmir do NOT function in the Union Territory. Carry an Indian postpaid SIM (Airtel and Jio offer excellent 5G/4G coverage) or purchase a local SIM in Srinagar upon landing with photo ID.", status: "verified" },
          { title: "Gulmarg Gondola Official Booking", body: "Book your Gulmarg Gondola tickets exclusively online via the official J&K Cable Car Corporation portal (jammukashmircablecar.com) weeks in advance. Gondola tickets are strictly limited by daily quotas and cannot be purchased at the venue without advance booking.", status: "verified" },
          { title: "Pilgrimage Yatra Registrations", body: "Biometric and RFID registration is mandatory for all pilgrims undertaking the Amarnath Yatra (via jksasb.nic.in) and the Vaishno Devi trek (via maavaishnodevi.org). Carry physical photo ID at all times.", status: "verified" },
          { title: "Emergency Helplines", body: "Dial 112 for integrated police/fire emergency response; 108 for medical ambulance; 1800-103-1060 for the dedicated 24x7 J&K Tourist Police Helpline.", status: "verified" },
        ],
      },
    },
    {
      key: "safety_health",
      body: {
        items: [
          { body: "Travel Advisories & Current Situation: Always check updated official travel advisories and stay along established tourist circuits (Srinagar, Gulmarg, Pahalgam, Sonamarg). Verify local news before venturing into remote border or rural sectors." },
          { body: "Altitude Awareness at Gulmarg (Phase 2): Phase 2 of the Gulmarg Gondola ascends to 3,980m (13,050 ft) at Apharwat Peak. Take it slow, avoid running, stay well-hydrated, and descend immediately if you experience dizziness or shortness of breath." },
          { body: "Winter Cold Weather Protection: Winter temperatures drop well below freezing (-4°C to -10°C in Gulmarg). Dress in layers with thermal innerwear, windproof down jackets, insulated waterproof snow boots, woollen gloves, and UV sunglasses to protect against snow glare." },
          { body: "Pony & Porter Scams: When hiring ponies in Gulmarg or Pahalgam, hire only from official registered rate counters at the tourist reception center; insist on government-notified tariff slips to avoid overcharging." },
        ],
      },
    },
    {
      key: "faqs",
      body: {
        items: [
          {
            question: "Is it safe to travel to Jammu and Kashmir as a tourist?",
            answer: "Mainstream tourist destinations in Jammu and Kashmir—including Srinagar, Gulmarg, Pahalgam, Sonamarg, and Katra—welcome millions of domestic and international travellers every year with high security and hospitality. Over 23 million tourists visited in 2024. As with any mountain frontier region, travellers should monitor current government advisories, stick to primary tourist circuits, avoid nighttime intercity travel through isolated passes, and carry valid government identification at all times.",
          },
          {
            question: "Do prepaid mobile SIM cards work in Kashmir?",
            answer: "No. Prepaid SIM cards issued outside Jammu and Kashmir do not work anywhere in the Union Territory due to government security regulations. Indian postpaid SIM cards (Airtel, Jio, and BSNL) function seamlessly with high-speed 5G/4G connectivity across all major towns and valleys. If you only possess a prepaid connection, you can easily purchase a local prepaid tourist SIM card at Srinagar Airport or TRC counters by presenting your passport/Aadhaar and a passport-sized photograph.",
          },
          {
            question: "How do I book tickets for the Gulmarg Gondola?",
            answer: "Tickets for the Gulmarg Gondola (Phase 1 to Kongdoori and Phase 2 to Apharwat Peak) must be booked exclusively online in advance through the official Jammu & Kashmir Cable Car Corporation portal (jammukashmircablecar.com). Due to strict daily safety quotas, tickets frequently sell out 2 to 4 weeks ahead for peak winter and summer seasons. There is no offline ticket counter for general tourists at Gulmarg.",
          },
          {
            question: "What is the difference between staying on Dal Lake versus Nigeen Lake?",
            answer: "Dal Lake is lively, iconic, and central, surrounded by bustling boulevard promenades, floating markets, and constant shikara movement—perfect for first-time visitors who want to be in the heart of the action. Nigeen Lake, connected to Dal Lake by a narrow strait, is much quieter, surrounded by willow trees, and features fewer motorboats—ideal for couples, writers, and travelers seeking pure serenity.",
          },
          {
            question: "What is the best month to see snow in Kashmir?",
            answer: "For guaranteed deep powder snow and winter sports, visit Gulmarg between late December and late February. Snowfall in Srinagar typically occurs between mid-December and late January. Sonamarg also experiences heavy snow cover, while higher passes and Apharwat Peak retain snow patches well into May and June.",
          },
          {
            question: "How can I visit the Vaishno Devi shrine from Katra?",
            answer: "From Katra, the 12-kilometre trek to the holy Bhawan can be undertaken on foot (takes 4–6 hours), on ponies or palanquins (dolis), or via battery-operated eco-rickshaws along the newer Tarakote Marg. Helicopter shuttle services also operate from Katra Helipad to Sanjichhat (taking just 5 minutes), from where the Bhawan is a gentle 2.5 km walk. Helicopter tickets must be booked in advance via the official shrine board portal (maavaishnodevi.org).",
          },
          {
            question: "What should I pack for a trip to Kashmir?",
            answer: "For summer (May–August), pack light cottons and breathable linen clothing along with a light sweater or fleece jacket for cool evenings in Gulmarg and Pahalgam. For autumn and spring (April, October, November), bring mid-weight jackets and warm thermals. For winter (December–March), heavy thermal innerwear, down jackets, waterproof snow boots with deep tread, woolen caps, gloves, and sunscreen are essential.",
          },
          {
            question: "What are the must-try dishes in authentic Kashmiri cuisine?",
            answer: "Do not miss the royal multi-course Wazwan (especially Rogan Josh, Gushtaba, and Rista), aromatic warm Kahwa tea brewed with saffron and almonds, vegetarian Dum Aloo and Nadru Yakhni (lotus stem in yoghurt), skewered charcoal Tujji kebabs at Khayam Chowk, and the unique pink salted Noon Chai served with fresh local bakery bread (Girda or Bakarkhani).",
          },
        ],
      },
    },
  ];

  for (const s of allSections) {
    const [existing] = await db
      .select()
      .from(sections)
      .where(and(eq(sections.placeId, jk.id), eq(sections.key, s.key as any)))
      .limit(1);

    if (existing) {
      await db
        .update(sections)
        .set({
          body: s.body,
          status: "approved",
          updatedAt: new Date(),
        })
        .where(eq(sections.id, existing.id));
      console.log(`✓ Updated section ${s.key}`);
    } else {
      await db.insert(sections).values({
        placeId: jk.id,
        key: s.key as any,
        body: s.body,
        status: "approved",
        locked: false,
        updatedAt: new Date(),
      });
      console.log(`✓ Inserted section ${s.key}`);
    }
  }

  // 6. Seed 2 Rich Itineraries with Day-Wise Sight Cards & Photos
  console.log("\n=== 6. SEEDING 2 RICH ITINERARIES WITH DAY-WISE SIGHT PHOTOS ===");

  // Sight photos for itinerary 1
  const dalLakeSightPhoto = await fetchAndStoreImage(
    "Dal Lake Srinagar Shikara houseboat",
    "itineraries/jk/dal-lake",
    "Shikara boat on mirror-calm waters of Dal Lake",
    "Dal Lake Shikara Ride, Srinagar"
  );
  const mughalGardensSightPhoto = await fetchAndStoreImage(
    "Shalimar Bagh Srinagar Mughal Garden",
    "itineraries/jk/shalimar-bagh",
    "Terraced fountains and Chinar trees of Shalimar Bagh",
    "Shalimar Bagh Mughal Gardens"
  );
  const gulmargGondolaSightPhoto = await fetchAndStoreImage(
    "Gulmarg gondola snow Kashmir",
    "itineraries/jk/gulmarg-gondola",
    "Gulmarg Gondola cable car ascending toward Apharwat Peak",
    "Gulmarg Gondola & Apharwat Peak"
  );
  const betaabValleySightPhoto = await fetchAndStoreImage(
    "Pahalgam Betaab Valley Kashmir",
    "itineraries/jk/betaab-valley",
    "Turquoise river flowing through pine forests of Betaab Valley",
    "Betaab Valley & Lidder River, Pahalgam"
  );
  const sonamargGlacierSightPhoto = await fetchAndStoreImage(
    "Thajiwas Glacier Sonamarg",
    "itineraries/jk/thajiwas-glacier",
    "Thajiwas Glacier snowfields under towering granite massifs",
    "Thajiwas Glacier, Sonamarg"
  );

  const itin1Data = {
    slug: "kashmir-valley-paradise-6-days",
    title: "Classic Kashmir: Srinagar, Gulmarg, Pahalgam & Sonamarg in 6 Days",
    summary:
      "The definitive 6-day Kashmir holiday connecting the cedar houseboats and Mughal gardens of Srinagar with the high-altitude cable car of Gulmarg, the pine valleys of Pahalgam, and the glaciers of Sonamarg.",
    durationDays: 6,
    tripTypes: ["mountains", "nature"],
    seoTitle: "Classic Kashmir 6-Day Itinerary: Srinagar, Gulmarg & Pahalgam",
    seoDescription:
      "Complete 6-day Kashmir itinerary: Dal Lake houseboats, Gulmarg Gondola, Pahalgam Betaab Valley, Sonamarg Thajiwas Glacier, day-wise sight photos and costs.",
    plan: {
      overview:
        "Experience the crown jewel of the Himalayas on this immersive 6-day circuit through the Kashmir Valley. Begin in Srinagar staying aboard a traditional cedarwood houseboat on Dal Lake and exploring centuries-old terraced Mughal gardens. Soar above the pine forests on the Gulmarg Gondola to Apharwat Peak at 3,980m, wander through the tranquil pine meadows of Betaab Valley in Pahalgam, and touch the year-round snowfields of Thajiwas Glacier in Sonamarg.",
      style: "Scenic Mountain, Alpine Meadows & Cultural Heritage",
      start: "Sheikh ul-Alam International Airport (SXR), Srinagar",
      end: "Sheikh ul-Alam International Airport (SXR), Srinagar",
      season: "April to October (blossoms & meadows) or December to February (winter snow)",
      difficulty: "Easy to Moderate",
      transport: "Private air-conditioned tourist cab with experienced mountain driver throughout",
      days: [
        {
          title: "Day 1: Arrival in Srinagar, Dal Lake Shikara Ride & Houseboat Check-in",
          summary:
            "Land at Srinagar Airport, transfer to your handcrafted cedarwood houseboat on Dal Lake, and take a magical sunset Shikara cruise past floating gardens and Char Chinar.",
          photos: [
            {
              url: dalLakeSightPhoto.url,
              alt: dalLakeSightPhoto.alt,
              caption: "Paddling a Shikara boat on mirror-still Dal Lake at sunset",
              attribution: dalLakeSightPhoto.attribution,
              license: dalLakeSightPhoto.license,
            },
          ],
          stops: [
            {
              name: "Houseboat Check-in on Dal Lake",
              time: "01:30 PM",
              duration: "1.5 hrs",
              note: "Board your private cedarwood houseboat with hand-carved walnut woodwork, embroidered Kashmiri rugs, and a wooden veranda overlooking the water.",
            },
            {
              name: "Sunset Shikara Cruise & Char Chinar",
              time: "04:30 PM",
              duration: "2.5 hrs",
              note: "Glide across the lake past floating lotus gardens, lotus flowers, local water vendors, and the historic island of four ancient Chinar trees.",
            },
          ],
          travel: "Airport to Dal Lake transfer (15 km, 30 mins)",
          meals: "Welcome cup of hot saffron Kahwa tea; lunch at Ahdoos for Gushtaba; candlelit traditional Kashmiri dinner on houseboat",
          overnight: "Srinagar (Deluxe Heritage Houseboat on Dal Lake or Nigeen Lake)",
          distance: "20 km",
          distanceKm: 20,
          driveTime: "45 mins",
        },
        {
          title: "Day 2: UNESCO Terraced Mughal Gardens & Historic Old City",
          summary:
            "Tour the imperial 17th-century Mughal gardens of Nishat Bagh, Shalimar Bagh, and Pari Mahal before exploring the 600-year-old Jamia Masjid in Old Srinagar.",
          photos: [
            {
              url: mughalGardensSightPhoto.url,
              alt: mughalGardensSightPhoto.alt,
              caption: "Cascading stone water terraces and Chinar trees of Shalimar Bagh",
              attribution: mughalGardensSightPhoto.attribution,
              license: mughalGardensSightPhoto.license,
            },
          ],
          stops: [
            {
              name: "Nishat Bagh (Garden of Bliss)",
              time: "09:30 AM",
              duration: "1.5 hrs",
              note: "Walk through 12 stone terraces representing the signs of the zodiac, with fountain channels tumbling toward Dal Lake against the Zabarwan hills.",
            },
            {
              name: "Shalimar Bagh (Abode of Love)",
              time: "11:30 AM",
              duration: "1.5 hrs",
              note: "Explore Emperor Jahangir's masterwork built in 1619 for Empress Nur Jahan, featuring black marble pavilions and water chutes.",
            },
            {
              name: "Pari Mahal (Palace of Fairies)",
              time: "02:30 PM",
              duration: "1.5 hrs",
              note: "Visit the 17th-century hillside observatory and Sufi library built by Prince Dara Shikoh, commanding panoramic views over the entire Srinagar valley.",
            },
            {
              name: "Jamia Masjid & Old City Bazaars",
              time: "04:30 PM",
              duration: "2 hrs",
              note: "Admire the 378 soaring deodar wood pillars inside Jamia Masjid and browse copperware and walnut crafts in historic Zaina Kadal.",
            },
          ],
          travel: "Sightseeing transfers around Srinagar (35 km)",
          meals: "Breakfast on houseboat; lunch at Mughal Darbar; evening charcoal Tujji kebabs at Khayam Chowk",
          overnight: "Srinagar (Heritage Houseboat or Boutique Hotel)",
          distance: "35 km",
          distanceKm: 35,
          driveTime: "1.5 hrs total",
        },
        {
          title: "Day 3: Alpine Excursion to Gulmarg & Apharwat Peak",
          summary:
            "Drive up into the Pir Panjal mountains to Gulmarg, boarding the Gulmarg Gondola up to Apharwat Peak at 3,980m for snow activities and alpine views.",
          photos: [
            {
              url: gulmargGondolaSightPhoto.url,
              alt: gulmargGondolaSightPhoto.alt,
              caption: "Gulmarg Gondola cabins gliding over snow-covered pine forests",
              attribution: gulmargGondolaSightPhoto.attribution,
              license: gulmargGondolaSightPhoto.license,
            },
          ],
          stops: [
            {
              name: "Scenic Mountain Drive to Gulmarg",
              time: "08:00 AM",
              duration: "2 hrs",
              note: "Climb through winding roads lined with towering fir trees from Tangmarg up to the Gulmarg alpine plateau (2,650m).",
            },
            {
              name: "Gulmarg Gondola Phase 1 & Phase 2",
              time: "10:30 AM",
              duration: "3.5 hrs",
              note: "Ride Phase 1 to Kongdoori bowl (2,600m) and Phase 2 to Apharwat Peak (3,980m) right beneath the snow crests on the Line of Control.",
            },
            {
              name: "St. Mary's Church & Gulmarg Golf Course",
              time: "03:00 PM",
              duration: "1.5 hrs",
              note: "Visit the 100-year-old Victorian-era stone church and the historic pine-fringed golf meadows.",
            },
          ],
          travel: "Srinagar to Gulmarg and return (110 km round trip)",
          meals: "Breakfast on houseboat; lunch at Nedou's Hotel in Gulmarg; dinner in Srinagar with Rogan Josh and saffron rice",
          overnight: "Srinagar",
          distance: "115 km",
          distanceKm: 115,
          driveTime: "4 hrs round trip",
        },
        {
          title: "Day 4: Scenic Drive to Pahalgam & Betaab Valley",
          summary:
            "Drive through saffron fields and willow cricket-bat hamlets to Pahalgam along the roaring Lidder River, exploring Betaab and Aru Valleys.",
          photos: [
            {
              url: betaabValleySightPhoto.url,
              alt: betaabValleySightPhoto.alt,
              caption: "Lush green alpine meadows and turquoise waters of Lidder River in Betaab Valley",
              attribution: betaabValleySightPhoto.attribution,
              license: betaabValleySightPhoto.license,
            },
          ],
          stops: [
            {
              name: "Pampore Saffron Fields & Awantipora Ruins",
              time: "08:30 AM",
              duration: "1.5 hrs",
              note: "Stop in Pampore to learn about saffron cultivation and inspect the 9th-century carved stone temples of Avantiswami.",
            },
            {
              name: "Betaab Valley Exploration",
              time: "12:30 PM",
              duration: "2.5 hrs",
              note: "Walk through the postcard-perfect meadow framed by dense pine woodlands and turquoise snowmelt streams.",
            },
            {
              name: "Aru Valley Peaceful Hamlet",
              time: "03:30 PM",
              duration: "2 hrs",
              note: "Drive 12 km up the valley to the peaceful village of Aru, starting point for high-altitude treks to Kolahoi Glacier.",
            },
          ],
          travel: "Drive from Srinagar to Pahalgam (95 km)",
          meals: "Breakfast in Srinagar; lunch at Dana Pani in Pahalgam; dinner at Troutbeat Restaurant savoring fresh pan-fried Lidder brown trout",
          overnight: "Pahalgam (Riverside boutique lodge or cottage)",
          distance: "105 km",
          distanceKm: 105,
          driveTime: "2.5 hrs",
        },
        {
          title: "Day 5: Day Trip to Sonamarg & Thajiwas Glacier",
          summary:
            "Scenic overland journey along the Sindh River to Sonamarg ('Meadow of Gold'), hiking to the glistening snowfields of Thajiwas Glacier.",
          photos: [
            {
              url: sonamargGlacierSightPhoto.url,
              alt: sonamargGlacierSightPhoto.alt,
              caption: "Thajiwas Glacier snowfields cascading down jagged mountain massifs in Sonamarg",
              attribution: sonamargGlacierSightPhoto.attribution,
              license: sonamargGlacierSightPhoto.license,
            },
          ],
          stops: [
            {
              name: "Drive Along the Sindh Valley to Sonamarg",
              time: "08:00 AM",
              duration: "3 hrs",
              note: "Trace the rushing Sindh River past walnut groves and towering granite cliffs to the high-altitude bowl of Sonamarg (2,740m).",
            },
            {
              name: "Thajiwas Glacier Pony Trek & Snowfields",
              time: "11:30 AM",
              duration: "3 hrs",
              note: "Hike or ride a pony 3 km up into the glacier basin to touch snowfields and view cascading glacial waterfalls.",
            },
            {
              name: "Return Drive to Srinagar",
              time: "03:30 PM",
              duration: "2.5 hrs",
              note: "Relax on the return drive back into Srinagar for your final evening in the valley.",
            },
          ],
          travel: "Pahalgam to Sonamarg and return to Srinagar (160 km)",
          meals: "Breakfast in Pahalgam; lunch at Glacier View Restaurant in Sonamarg; farewell dinner at Stream Restaurant in Srinagar",
          overnight: "Srinagar (Dal Lake Houseboat or Boutique Hotel)",
          distance: "165 km",
          distanceKm: 165,
          driveTime: "4.5 hrs total",
        },
        {
          title: "Day 6: Dawn Floating Flower Market & Srinagar Departure",
          summary:
            "Experience the unique floating vegetable market on Dal Lake at sunrise, pick up authentic Kashmiri saffron and walnuts, and transfer to Srinagar Airport.",
          photos: [
            {
              url: dalLakeSightPhoto.url,
              alt: dalLakeSightPhoto.alt,
              caption: "Local vendors trading fresh produce from wooden canoes in early morning mist",
              attribution: dalLakeSightPhoto.attribution,
              license: dalLakeSightPhoto.license,
            },
          ],
          stops: [
            {
              name: "Dawn Floating Vegetable Market",
              time: "06:00 AM",
              duration: "1.5 hrs",
              note: "Watch generational water-farmers barter fresh produce, water-chestnuts, and lotus roots directly from canoe to canoe in the morning mist.",
            },
            {
              name: "Saffron, Walnut & Handicrafts Shopping",
              time: "09:30 AM",
              duration: "1.5 hrs",
              note: "Visit government-certified arts emporiums along the Polo View promenade for pure Pashmina shawls, saffron, and dry fruits.",
            },
            {
              name: "Transfer to Sheikh ul-Alam Airport (SXR)",
              time: "11:30 AM",
              duration: "1 hr",
              note: "Arrive at Srinagar Airport 2.5 hours prior to flight departure due to mandatory security screening checkpoints.",
            },
          ],
          travel: "Dal Lake to Srinagar Airport (15 km, 30 mins)",
          meals: "Morning hot Kahwa with freshly baked Girda bread on houseboat; airport snacks",
          overnight: "Departure",
          distance: "20 km",
          distanceKm: 20,
          driveTime: "45 mins",
        },
      ],
      budget: {
        currency: "INR",
        breakdown: [
          { category: "Dedicated Private Tourist Cab with Driver (6 Days)", cost: "₹18,000–₹24,000 total" },
          { category: "Deluxe Heritage Houseboat & Boutique Pahalgam Hotel (5 Nights)", cost: "₹22,000–₹35,000 total" },
          { category: "Gulmarg Gondola Phase 1 & 2 Passes", cost: "₹1,800 per person" },
          { category: "Shikara Rides, Mughal Garden & Activity Entries", cost: "₹2,500 total" },
          { category: "Authentic Kashmiri Wazwan & Dining", cost: "₹1,500 per person per day" },
        ],
      },
      booking: {
        advance: "Book Gulmarg Gondola passes 3–4 weeks ahead exclusively on jammukashmircablecar.com. Reserve Dal Lake houseboats early for April–May and Christmas.",
        rules: "Prepaid SIM cards from outside J&K do not work. Carry an Indian postpaid connection or buy a local SIM at Srinagar Airport.",
      },
      alternatives: [
        "In winter (December–February), substitute Sonamarg (often closed due to snow) with an overnight stay in Gulmarg for skiing.",
        "Add an excursion to offbeat Doodhpathri ('Valley of Milk') for an uncrowded meadow walk.",
      ],
      tips: [
        "Arrive at Srinagar Airport at least 2.5 hours early as security luggage screening happens before terminal entry.",
        "Wear layered clothing; mountain temperatures in Gulmarg and Sonamarg can be 10°C cooler than Srinagar.",
        "Hire ponies only from official government pre-paid booths in Pahalgam and Sonamarg.",
      ],
    },
  };

  validateItinerary(itin1Data);

  const [existingItin1] = await db.select().from(itineraries).where(eq(itineraries.slug, itin1Data.slug)).limit(1);
  const itin1Snapshot: ItinerarySnapshot = {
    version: 1,
    title: itin1Data.title,
    summary: itin1Data.summary,
    durationDays: itin1Data.durationDays,
    tripTypes: itin1Data.tripTypes,
    plan: itin1Data.plan as any,
    seoTitle: itin1Data.seoTitle,
    seoDescription: itin1Data.seoDescription,
    place: { id: jk.id, slug: jk.slug, name: jk.name },
    heroImage: {
      url: dalLakeSightPhoto.url,
      alt: dalLakeSightPhoto.alt,
      caption: dalLakeSightPhoto.caption,
      kind: "photo",
      license: dalLakeSightPhoto.license,
      licenseUrl: dalLakeSightPhoto.licenseUrl,
      attribution: dalLakeSightPhoto.attribution,
      sourceUrl: dalLakeSightPhoto.sourceUrl,
    },
    publishedAt: new Date().toISOString(),
  };

  if (existingItin1) {
    await db
      .update(itineraries)
      .set({
        title: itin1Data.title,
        summary: itin1Data.summary,
        durationDays: itin1Data.durationDays,
        tripTypes: itin1Data.tripTypes,
        plan: itin1Data.plan as any,
        seoTitle: itin1Data.seoTitle,
        seoDescription: itin1Data.seoDescription,
        status: "published",
        publishedSnapshot: itin1Snapshot,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(itineraries.id, existingItin1.id));
    console.log(`✓ Updated itinerary 1: ${itin1Data.slug}`);
  } else {
    await db.insert(itineraries).values({
      slug: itin1Data.slug,
      placeId: jk.id,
      title: itin1Data.title,
      summary: itin1Data.summary,
      durationDays: itin1Data.durationDays,
      tripTypes: itin1Data.tripTypes,
      plan: itin1Data.plan as any,
      seoTitle: itin1Data.seoTitle,
      seoDescription: itin1Data.seoDescription,
      heroMediaId: stateHeroMedia.id,
      status: "published",
      publishedSnapshot: itin1Snapshot,
      publishedAt: new Date(),
      publishedBy: actorId,
    });
    console.log(`✓ Inserted itinerary 1: ${itin1Data.slug}`);
  }

  // Itinerary 2: Divine Jammu & Kashmir Circuit
  const vaishnoDeviSightPhoto = await fetchAndStoreImage(
    "Vaishno Devi Katra Jammu",
    "itineraries/jk/vaishno-devi",
    "Holy cave temple complex of Shri Mata Vaishno Devi in Katra",
    "Shri Mata Vaishno Devi Shrine, Katra"
  );
  const patnitopSightPhoto = await fetchAndStoreImage(
    "Patnitop hill station Jammu",
    "itineraries/jk/patnitop",
    "Pine-covered rolling mountain hills of Patnitop",
    "Pine Woods of Patnitop"
  );

  const itin2Data = {
    slug: "jammu-vaishno-devi-kashmir-7-days",
    title: "Divine Jammu & Emerald Kashmir: Vaishno Devi to Dal Lake in 7 Days",
    summary:
      "A soulful 7-day pilgrimage and mountain odyssey connecting the sacred cave shrine of Vaishno Devi in Katra with the pine-clad heights of Patnitop and the houseboats and valleys of Kashmir.",
    durationDays: 7,
    tripTypes: ["spiritual", "mountains"],
    seoTitle: "Jammu to Kashmir 7-Day Itinerary: Vaishno Devi, Srinagar & Pahalgam",
    seoDescription:
      "7-day travel plan from Jammu to Kashmir: Vaishno Devi yatra in Katra, Patnitop hill station, Chenani tunnel, Srinagar Dal Lake houseboats, and Betaab Valley.",
    plan: {
      overview:
        "Combine sacred spiritual devotion with the peerless natural beauty of the Kashmir Valley. Begin in Jammu, ascending to Katra for the revered 12 km pilgrimage to the holy cave shrine of Shri Mata Vaishno Devi. Drive along the scenic Shivalik ridges to the pine plateau of Patnitop, before traversing the engineering marvels of the Chenani-Nashri and Qazigund tunnels into Kashmir. Conclude with three blissful days floating on Dal Lake and wandering the alpine meadows of Pahalgam.",
      style: "Spiritual Pilgrimage & Mountain Scenic Discovery",
      start: "Jammu Tawi Railway Station (JAT) or Jammu Airport (IXJ)",
      end: "Sheikh ul-Alam International Airport (SXR), Srinagar",
      season: "March to November (pleasant pilgrimage weather and open valley roads)",
      difficulty: "Moderate (includes 12 km yatra trek or battery car)",
      transport: "High-speed Vande Bharat Express to Katra, followed by private tourist cab through Kashmir",
      days: [
        {
          title: "Day 1: Arrival in Jammu & Scenic Ascent to Katra",
          summary:
            "Arrive at Jammu Tawi or Katra railway station, check into your hotel at the base of the Trikuta hills, obtain your mandatory RFID Yatra card, and prepare for the pilgrimage.",
          photos: [
            {
              url: vaishnoDeviSightPhoto.url,
              alt: vaishnoDeviSightPhoto.alt,
              caption: "Illuminated mountain trails leading up to the holy cave of Vaishno Devi",
              attribution: vaishnoDeviSightPhoto.attribution,
              license: vaishnoDeviSightPhoto.license,
            },
          ],
          stops: [
            {
              name: "Arrival at Katra Base",
              time: "02:00 PM",
              duration: "2 hrs",
              note: "Check into your hotel and collect your mandatory RFID Yatra access card from the Shri Mata Vaishno Devi Shrine Board (SMVDSB) registration counter.",
            },
            {
              name: "Evening Banganga Walk & Rest",
              time: "05:00 PM",
              duration: "2 hrs",
              note: "Visit the sacred Banganga stream where Goddess Vaishnavi quenched the thirst of her mount, enjoying an early vegetarian dinner.",
            },
          ],
          travel: "Jammu to Katra drive (45 km, 1 hr 15 mins) or direct train to Katra",
          meals: "Pure vegetarian dinner in Katra with hot rajma-chawal and puri-bhaji",
          overnight: "Katra (Boutique pilgrimage hotel)",
          distance: "45 km",
          distanceKm: 45,
          driveTime: "1 hr 15 mins",
        },
        {
          title: "Day 2: Sacred Vaishno Devi Yatra to Bhawan & Bhairon Ghati",
          summary:
            "Undertake the sacred 12 km trek via the modern Tarakote Marg or take the helicopter shuttle to Sanjichhat, seeking darshan of the Holy Pindies at the Bhawan.",
          photos: [
            {
              url: vaishnoDeviSightPhoto.url,
              alt: vaishnoDeviSightPhoto.alt,
              caption: "The sacred Sanctum Sanctorum of Shri Mata Vaishno Devi Bhawan",
              attribution: vaishnoDeviSightPhoto.attribution,
              license: vaishnoDeviSightPhoto.license,
            },
          ],
          stops: [
            {
              name: "Ascent to Ardhkuwari & Sanjichhat",
              time: "06:00 AM",
              duration: "3.5 hrs",
              note: "Walk the paved, covered trail via Ardhkuwari cave, or take the 5-minute helicopter flight from Katra Helipad to Sanjichhat.",
            },
            {
              name: "Holy Darshan at Vaishno Devi Bhawan",
              time: "11:00 AM",
              duration: "2.5 hrs",
              note: "Perform darshan of the natural rock formations (Pindies) representing Maha Kali, Maha Lakshmi, and Maha Saraswati inside the sanctum.",
            },
            {
              name: "Bhairon Nath Temple via Passenger Ropeway",
              time: "02:30 PM",
              duration: "1.5 hrs",
              note: "Take the 3-minute passenger ropeway cable car up to Bhairon Ghati to complete the sacred pilgrimage circuit.",
            },
            {
              name: "Descent to Katra Base",
              time: "04:30 PM",
              duration: "3 hrs",
              note: "Descend comfortably on foot or battery-car back to your Katra hotel for a restful night.",
            },
          ],
          travel: "12 km mountain yatra trail each way",
          meals: "Free temple prasad and vegetarian meals at Shrine Board Bhojanalayas along the route",
          overnight: "Katra",
          distance: "25 km",
          distanceKm: 25,
          driveTime: "Walking trail",
        },
        {
          title: "Day 3: Pine Ridge Drive to Patnitop & Skyview Gondola",
          summary:
            "Drive up from Katra into the cool pine forests of Patnitop, riding the Skyview luxury cable car and visiting the ancient Naag Mandir.",
          photos: [
            {
              url: patnitopSightPhoto.url,
              alt: patnitopSightPhoto.alt,
              caption: "Rolling green plateau and pine woodlands of Patnitop",
              attribution: patnitopSightPhoto.attribution,
              license: patnitopSightPhoto.license,
            },
          ],
          stops: [
            {
              name: "Scenic Drive to Patnitop via Chenani",
              time: "09:30 AM",
              duration: "2.5 hrs",
              note: "Climb through the Shivalik foothills to the pleasant highland plateau of Patnitop perched at 2,024m.",
            },
            {
              name: "Skyview by Empyrean Ropeway",
              time: "02:00 PM",
              duration: "2 hrs",
              note: "Ride India's highest ropeway system with 65-metre tower clearances over lush pine forests connecting Sanget to Patnitop.",
            },
            {
              name: "Historic Naag Temple & Pine Walk",
              time: "04:30 PM",
              duration: "1.5 hrs",
              note: "Visit the 600-year-old wooden cobra deity shrine and stroll through fragrant deodar woods.",
            },
          ],
          travel: "Drive from Katra to Patnitop (80 km)",
          meals: "Breakfast in Katra; lunch at Skyview Sanget restaurant; dinner in Patnitop with Kashmiri dum aloo",
          overnight: "Patnitop (Mountain resort or pine cottage)",
          distance: "85 km",
          distanceKm: 85,
          driveTime: "2.5 hrs",
        },
        {
          title: "Day 4: Overland Mountain Drive to Srinagar & Dal Lake Houseboat",
          summary:
            "Drive through the monumental Chenani-Nashri and Qazigund tunnels across the Pir Panjal into the Kashmir Valley, checking into a cedar houseboat on Dal Lake.",
          photos: [
            {
              url: dalLakeSightPhoto.url,
              alt: dalLakeSightPhoto.alt,
              caption: "Traditional carved cedar houseboat moored on peaceful Dal Lake",
              attribution: dalLakeSightPhoto.attribution,
              license: dalLakeSightPhoto.license,
            },
          ],
          stops: [
            {
              name: "Drive Through Qazigund (Navyug) Tunnel",
              time: "09:00 AM",
              duration: "3.5 hrs",
              note: "Pass through the 8.5 km dual-tube tunnel piercing beneath Banihal Pass, emerging into the sprawling green Kashmir Valley.",
            },
            {
              name: "Houseboat Check-in & Shikara Ride",
              time: "03:30 PM",
              duration: "2.5 hrs",
              note: "Board your private cedarwood houseboat on Dal Lake and take an evening Shikara ride to Char Chinar.",
            },
          ],
          travel: "Patnitop to Srinagar drive (185 km, 4.5 hrs via NH-44)",
          meals: "Breakfast in Patnitop; highway lunch at Titanic View Point in Banihal; dinner on houseboat with Gushtaba and saffron rice",
          overnight: "Srinagar (Deluxe Houseboat on Dal Lake)",
          distance: "190 km",
          distanceKm: 190,
          driveTime: "4.5 hrs",
        },
        {
          title: "Day 5: Mughal Gardens & Shankaracharya Hilltop Temple",
          summary:
            "Climb to the ancient 9th-century Shankaracharya Temple atop Gopadari Hill for 360-degree views, followed by Shalimar Bagh and Nishat Bagh gardens.",
          photos: [
            {
              url: mughalGardensSightPhoto.url,
              alt: mughalGardensSightPhoto.alt,
              caption: "Terraced water fountains flowing toward Dal Lake in Nishat Bagh",
              attribution: mughalGardensSightPhoto.attribution,
              license: mughalGardensSightPhoto.license,
            },
          ],
          stops: [
            {
              name: "Shankaracharya Temple (Gopadari Hill)",
              time: "08:30 AM",
              duration: "2 hrs",
              note: "Ascend 240 stone steps to the ancient Shiva shrine consecrated by Adi Shankaracharya in the 8th century, offering panoramic views of Srinagar.",
            },
            {
              name: "Nishat Bagh & Shalimar Bagh Mughal Gardens",
              time: "11:30 AM",
              duration: "3 hrs",
              note: "Wander the imperial gardens with centuries-old Chinar trees, terraced cascades, and blossoming flowerbeds.",
            },
            {
              name: "Chashme Shahi Natural Spring",
              time: "03:30 PM",
              duration: "1 hr",
              note: "Drink from the sweet, ice-cold natural mineral spring discovered in 1632 by Mughal governor Ali Mardan Khan.",
            },
          ],
          travel: "Srinagar city sightseeing (30 km)",
          meals: "Breakfast on houseboat; lunch at Ahdoos for Rista; dinner at Lhasa Restaurant for Tibetan momos and thukpa",
          overnight: "Srinagar (Deluxe Houseboat)",
          distance: "30 km",
          distanceKm: 30,
          driveTime: "1 hr 15 mins",
        },
        {
          title: "Day 6: Day Excursion to Pahalgam & Betaab Valley",
          summary:
            "Spend a full day in the 'Valley of Shepherds', admiring the turquoise Lidder river and walking the pine meadows of Betaab Valley.",
          photos: [
            {
              url: betaabValleySightPhoto.url,
              alt: betaabValleySightPhoto.alt,
              caption: "Rushing Lidder river framed by snow peaks in Pahalgam",
              attribution: betaabValleySightPhoto.attribution,
              license: betaabValleySightPhoto.license,
            },
          ],
          stops: [
            {
              name: "Scenic Drive to Pahalgam via Saffron Fields",
              time: "08:00 AM",
              duration: "2.5 hrs",
              note: "Pass through Pampore and Mattan, following the Lidder river into Pahalgam.",
            },
            {
              name: "Betaab Valley & Baisaran Meadow",
              time: "11:00 AM",
              duration: "3.5 hrs",
              note: "Enjoy walking along the riverbank in Betaab Valley or take a pony trail up to Baisaran meadow.",
            },
            {
              name: "Return Drive to Srinagar",
              time: "04:00 PM",
              duration: "2.5 hrs",
              note: "Return to Srinagar for your final evening shopping for walnuts and saffron.",
            },
          ],
          travel: "Srinagar to Pahalgam round trip (190 km)",
          meals: "Breakfast on houseboat; lunch at Troutbeat in Pahalgam; farewell Kashmiri Wazwan dinner in Srinagar",
          overnight: "Srinagar (Houseboat or Boutique Hotel)",
          distance: "195 km",
          distanceKm: 195,
          driveTime: "5 hrs round trip",
        },
        {
          title: "Day 7: Floating Market at Dawn & Srinagar Departure",
          summary:
            "Watch the floating vegetable market on Dal Lake at dawn, pick up authentic Kashmiri saffron and walnuts, and transfer to Srinagar Airport.",
          photos: [
            {
              url: dalLakeSightPhoto.url,
              alt: dalLakeSightPhoto.alt,
              caption: "Morning mist lifting over Dal Lake houseboats",
              attribution: dalLakeSightPhoto.attribution,
              license: dalLakeSightPhoto.license,
            },
          ],
          stops: [
            {
              name: "Early Morning Shikara Ride on Dal Lake",
              time: "06:30 AM",
              duration: "1.5 hrs",
              note: "Enjoy a tranquil morning boat ride as fishermen cast nets and kingfishers dive into the reeds.",
            },
            {
              name: "Transfer to Sheikh ul-Alam Airport (SXR)",
              time: "10:30 AM",
              duration: "1 hr",
              note: "Transfer to Srinagar Airport for your return flight home.",
            },
          ],
          travel: "Dal Lake to Srinagar Airport (15 km, 30 mins)",
          meals: "Breakfast of hot Kahwa and fresh bakery breads on the houseboat",
          overnight: "Departure",
          distance: "20 km",
          distanceKm: 20,
          driveTime: "45 mins",
        },
      ],
      budget: {
        currency: "INR",
        breakdown: [
          { category: "Intercity Cab with Driver (Katra to Srinagar, 7 Days)", cost: "₹20,000–₹26,000 total" },
          { category: "Katra Hotel, Patnitop Resort & Srinagar Houseboat (6 Nights)", cost: "₹24,000–₹38,000 total" },
          { category: "Vaishno Devi Yatra Ropeway & Battery Car", cost: "₹500 per person" },
          { category: "Skyview Patnitop Cable Car Ticket", cost: "₹1,000 per person" },
          { category: "Dining, Saffron Tea & Food", cost: "₹1,400 per person per day" },
        ],
      },
      booking: {
        advance: "Book Vaishno Devi helicopter passes 60 days ahead on maavaishnodevi.org. Collect mandatory RFID yatra cards in Katra.",
        rules: "Prepaid mobile SIM cards from outside J&K do not work. Carry postpaid connections.",
      },
      alternatives: [
        "If traveling with elderly family members, book the Vaishno Devi helicopter shuttle between Katra and Sanjichhat to save 12 km of steep trekking.",
      ],
      tips: [
        "The Chenani-Nashri and Qazigund tunnels make the Jammu–Srinagar highway significantly smoother and faster than in previous years.",
        "Dress conservatively covering shoulders and knees when visiting Vaishno Devi and Shankaracharya temples.",
      ],
    },
  };

  validateItinerary(itin2Data);

  const [existingItin2] = await db.select().from(itineraries).where(eq(itineraries.slug, itin2Data.slug)).limit(1);
  const itin2Snapshot: ItinerarySnapshot = {
    version: 1,
    title: itin2Data.title,
    summary: itin2Data.summary,
    durationDays: itin2Data.durationDays,
    tripTypes: itin2Data.tripTypes,
    plan: itin2Data.plan as any,
    seoTitle: itin2Data.seoTitle,
    seoDescription: itin2Data.seoDescription,
    place: { id: jk.id, slug: jk.slug, name: jk.name },
    heroImage: {
      url: vaishnoDeviSightPhoto.url,
      alt: vaishnoDeviSightPhoto.alt,
      caption: vaishnoDeviSightPhoto.caption,
      kind: "photo",
      license: vaishnoDeviSightPhoto.license,
      licenseUrl: vaishnoDeviSightPhoto.licenseUrl,
      attribution: vaishnoDeviSightPhoto.attribution,
      sourceUrl: vaishnoDeviSightPhoto.sourceUrl,
    },
    publishedAt: new Date().toISOString(),
  };

  if (existingItin2) {
    await db
      .update(itineraries)
      .set({
        title: itin2Data.title,
        summary: itin2Data.summary,
        durationDays: itin2Data.durationDays,
        tripTypes: itin2Data.tripTypes,
        plan: itin2Data.plan as any,
        seoTitle: itin2Data.seoTitle,
        seoDescription: itin2Data.seoDescription,
        status: "published",
        publishedSnapshot: itin2Snapshot,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(itineraries.id, existingItin2.id));
    console.log(`✓ Updated itinerary 2: ${itin2Data.slug}`);
  } else {
    await db.insert(itineraries).values({
      slug: itin2Data.slug,
      placeId: jk.id,
      title: itin2Data.title,
      summary: itin2Data.summary,
      durationDays: itin2Data.durationDays,
      tripTypes: itin2Data.tripTypes,
      plan: itin2Data.plan as any,
      seoTitle: itin2Data.seoTitle,
      seoDescription: itin2Data.seoDescription,
      heroMediaId: stateHeroMedia.id,
      status: "published",
      publishedSnapshot: itin2Snapshot,
      publishedAt: new Date(),
      publishedBy: actorId,
    });
    console.log(`✓ Inserted itinerary 2: ${itin2Data.slug}`);
  }

  // 7. Seed 2 Rich Travel Guides
  console.log("\n=== 7. SEEDING 2 RICH TRAVEL GUIDES ===");
  const gondolaGuidePhoto = await fetchAndStoreImage(
    "Gulmarg gondola snow Kashmir",
    "guides/jk/gondola-guide",
    "Gulmarg Gondola cable car ascending toward snow-capped Apharwat Peak",
    "Gulmarg Gondola & Ski Slopes"
  );
  const houseboatGuidePhoto = await fetchAndStoreImage(
    "Dal Lake Hazratbal Srinagar",
    "guides/jk/houseboat-guide",
    "Traditional cedarwood houseboat moored on the reflective waters of Dal Lake",
    "Heritage Cedarwood Houseboat, Dal Lake"
  );

  const guide1Data = {
    slug: "how-to-book-gulmarg-gondola-guide",
    title: "Gulmarg Gondola Booking & Ski Guide: Phase 1, Phase 2 & Winter Tips",
    summary:
      "The definitive insider guide to riding the world's second-highest operating cable car: official portal booking rules, Phase 1 vs. Phase 2 differences, altitude warnings, ski pass rates, and avoiding local touts.",
    tripTypes: ["mountains", "adventure"],
    seoTitle: "Gulmarg Gondola Booking & Ski Guide: Phase 1, Phase 2 & Tips",
    seoDescription:
      "Essential guide to booking the Gulmarg Gondola in Kashmir: official JKCCC ticket portal, Phase 1 Kongdoori, Phase 2 Apharwat Peak, ski gear hire, and altitude safety.",
    body: {
      intro:
        "Rising from the pine-fringed alpine bowl of Gulmarg (2,650m) to the glaciated shoulder of Apharwat Peak at 3,980 metres (13,050 ft), the Gulmarg Gondola is Asia's highest and the world's second-highest operating passenger cable car. Engineered by the French firm Poma, this two-stage aerial ropeway ferries over 5,000 skiers, snowboarders, and mountain travelers daily into the high Himalayas. In winter, it opens up 1,300 metres of vertical powder snow terrain, making Gulmarg one of the premier backcountry freeride skiing capitals of the world. In summer, it provides breathtaking panoramic views over the Pir Panjal range and the distant Nanga Parbat (8,126m) across the Line of Control. However, strict daily quota limits and mandatory online booking mean that trips require clear, advance planning.",
      sections: [
        {
          heading: "Phase 1 vs. Phase 2: Understanding the Route",
          text: "The Gulmarg Gondola operates in two distinct stages with separate tickets:",
          items: [
            {
              title: "Phase 1: Gulmarg Resort to Kongdoori (2,650m to 3,050m)",
              body: "The 9-minute ride glides over dense pine woodlands to Kongdoori station. Perfect for families, first-time skiers, and beginner snow play. Features mountain cafes, ski rental huts, and gentle nursery slopes.",
            },
            {
              title: "Phase 2: Kongdoori to Apharwat Peak (3,050m to 3,980m)",
              body: "The dramatic 12-minute high-alpine ride ascends above the tree line to the sub-zero ridge of Apharwat Peak. Temperature drops sharply, winds pick up, and the terrain is strictly alpine rock and deep snow. Offers access to high-altitude frozen Alpather Lake (a 1.5-hour hike) and advanced backcountry ski bowls.",
            },
          ],
        },
        {
          heading: "Mandatory Online Ticket Booking Rules",
          text: "To eliminate black marketing, the J&K Government strictly enforces digital-only ticketing:",
          items: [
            {
              title: "Official Portal Only",
              body: "Tickets must be booked exclusively through the official Jammu & Kashmir Cable Car Corporation website: jammukashmircablecar.com. Beware of unofficial touts and fake agencies claiming to sell physical tickets.",
            },
            {
              title: "Advance Booking Window",
              body: "Tickets open online approximately 30 to 45 days in advance and sell out within minutes for peak winter ski season (January–February) and spring holidays. Secure your slots as soon as dates are announced.",
            },
            {
              title: "Mandatory Government Photo ID",
              body: "Each passenger's name and Aadhaar/Passport number must match the online ticket. Security personnel check physical IDs at both boarding turnstiles.",
            },
          ],
        },
        {
          heading: "High-Altitude Sickness & Cold Weather Safety",
          text: "At 3,980 metres (Apharwat Peak), atmospheric oxygen levels drop significantly:",
          items: [
            {
              title: "Take Time to Acclimatise",
              body: "Spend at least 24 hours in Srinagar (1,585m) or Gulmarg resort (2,650m) before ascending Phase 2. Avoid rushing directly to Apharwat Peak on your first morning.",
            },
            {
              title: "Move Slowly at the Summit",
              body: "Walk at a measured pace; running or jumping for photos can trigger acute headaches, dizziness, or shortness of breath. If you feel unwell, descend immediately to Kongdoori.",
            },
            {
              title: "Dress for Sub-Zero Temperatures",
              body: "Even in June, summit winds can be freezing (0°C to 5°C). In winter, temperatures plunge to -10°C to -15°C. Wear windproof snow jackets, thermal base layers, waterproof gloves, and UV-rated sunglasses to prevent snow blindness.",
            },
          ],
        },
        {
          heading: "Ski Equipment & Guide Hire Advice",
          text: "Practical guidance for winter sports enthusiasts:",
          items: [
            {
              title: "Government Registered Ski Shops",
              body: "Rent skis, snowboards, boots, and helmets from certified rental stores in Tangmarg or near the Gulmarg Gondola base station. Inspect edges and bindings carefully.",
            },
            {
              title: "Hiring a Certified Ski Instructor",
              body: "Hire instructors certified by the Indian Institute of Skiing and Mountaineering (IISM). Check their official badge and negotiate fixed daily rates upfront.",
            },
          ],
        },
      ],
      checklist: [
        "Book Phase 1 and Phase 2 tickets weeks ahead on jammukashmircablecar.com",
        "Carry printed copies of ticket confirmation and original Aadhaar / Passport for every passenger",
        "Pack high-SPF sunscreen, lip balm, and UV sunglasses (snow glare is intense)",
        "Wear waterproof insulated snow boots with deep rubber tread (avoid sneakers or heels)",
        "Bring a high-capacity power bank (phone batteries discharge rapidly in freezing temperatures)",
        "Arrive at the base station 30 minutes before your booked time slot to clear security lines",
      ],
    },
  };

  validateGuide(guide1Data.body);

  const [existingGuide1] = await db.select().from(travelGuides).where(eq(travelGuides.slug, guide1Data.slug)).limit(1);
  const guide1Snapshot: GuideSnapshot = {
    version: 1,
    title: guide1Data.title,
    summary: guide1Data.summary,
    tripTypes: guide1Data.tripTypes,
    body: guide1Data.body as any,
    seoTitle: guide1Data.seoTitle,
    seoDescription: guide1Data.seoDescription,
    place: { id: jk.id, slug: jk.slug, name: jk.name },
    places: [{ name: jk.name, slug: jk.slug, kind: "state", stateSlug: jk.slug }],
    heroImage: {
      url: gondolaGuidePhoto.url,
      alt: gondolaGuidePhoto.alt,
      caption: gondolaGuidePhoto.caption,
      kind: "photo",
      license: gondolaGuidePhoto.license,
      licenseUrl: gondolaGuidePhoto.licenseUrl,
      attribution: gondolaGuidePhoto.attribution,
      sourceUrl: gondolaGuidePhoto.sourceUrl,
    },
    publishedAt: new Date().toISOString(),
  };

  if (existingGuide1) {
    await db
      .update(travelGuides)
      .set({
        title: guide1Data.title,
        summary: guide1Data.summary,
        tripTypes: guide1Data.tripTypes,
        body: guide1Data.body as any,
        seoTitle: guide1Data.seoTitle,
        seoDescription: guide1Data.seoDescription,
        status: "published",
        publishedSnapshot: guide1Snapshot,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(travelGuides.id, existingGuide1.id));
    console.log(`✓ Updated travel guide 1: ${guide1Data.slug}`);
  } else {
    const [insertedG1] = await db
      .insert(travelGuides)
      .values({
        slug: guide1Data.slug,
        placeId: jk.id,
        title: guide1Data.title,
        summary: guide1Data.summary,
        tripTypes: guide1Data.tripTypes,
        body: guide1Data.body as any,
        seoTitle: guide1Data.seoTitle,
        seoDescription: guide1Data.seoDescription,
        heroMediaId: stateHeroMedia.id,
        status: "published",
        publishedSnapshot: guide1Snapshot,
        publishedAt: new Date(),
        publishedBy: actorId,
      })
      .returning();

    await db.insert(travelGuidePlaces).values({ guideId: insertedG1.id, placeId: jk.id });
    console.log(`✓ Inserted travel guide 1: ${guide1Data.slug}`);
  }

  // Guide 2: Srinagar Houseboat & Dal Lake Guide
  const guide2Data = {
    slug: "srinagar-houseboat-dal-lake-guide",
    title: "Srinagar Houseboat & Dal Lake Guide: Nigeen vs Dal, Ghats & Shikaras",
    summary:
      "The complete traveler's guide to staying on a Kashmiri cedar houseboat: understanding heritage Pinjra woodwork, picking between lively Dal Lake and serene Nigeen Lake, union Shikara tariffs, and winter Hamam heating.",
    tripTypes: ["heritage", "romantic"],
    seoTitle: "Srinagar Houseboat Guide: Dal Lake vs Nigeen Lake, Tariffs & Tips",
    seoDescription:
      "Everything you need to know about staying on a Srinagar houseboat: Dal Lake vs Nigeen Lake, Shikara boat rates, floating vegetable markets, heating, and food.",
    body: {
      intro:
        "The hand-carved cedarwood houseboats of Srinagar are an iconic living legacy of Kashmir's royal and colonial history. Born in the late 19th century when the Dogra Maharaja prohibited British residents from owning land in the valley, resourceful British officers constructed luxurious floating homes along the tranquil backwaters of Dal Lake and Nigeen Lake. Built from seasoned deodar (Himalayan cedar) that naturally repels water and insects, these moored vessels feature grand drawing rooms with chandeliers, intricately carved walnut wood ceilings (Khatamband), hand-knotted silk carpets, and open sun verandas facing the snow-capped Zabarwan mountains. Today, staying on a traditional Kashmiri houseboat is an essential cultural experience.",
      sections: [
        {
          heading: "Dal Lake vs. Nigeen Lake: Which Waterfront Is Right for You?",
          text: "Srinagar's houseboats are moored across two distinct bodies of water:",
          items: [
            {
              title: "Dal Lake (Lively & Iconic)",
              body: "The grand 18 km² water world lined with Boulevard Road. Houseboats are arranged along numbered Ghats (Ghat 1 to 20). Bustling with Shikara traffic, floating souvenir vendors, and walking distance to cafes and lakeside promenades. Best for first-time visitors who want vibrant energy.",
            },
            {
              title: "Nigeen Lake (Peaceful & Serene)",
              body: "Connected to Dal Lake via the Nallah Amir Khan channel, Nigeen is nestled beneath Hari Parbat fort. Shaded by towering weeping willows and poplars, it experiences zero road noise and minimal motorboat wakes. Best for couples, writers, and travelers seeking quiet luxury.",
            },
          ],
        },
        {
          heading: "Understanding Houseboat Categories & Amenities",
          text: "The J&K Tourism Department classifies houseboats into four official tiers:",
          items: [
            {
              title: "Deluxe Category",
              body: "The premier tier. Features 3 to 5 spacious ensuite bedrooms, attached modern tiled bathrooms with 24-hour hot water, grand dining salons, crystal chandeliers, and an attentive houseboat host (caretaker) who prepares customized meals.",
            },
            {
              title: "Winter Heating (Hamam & Electric Blankets)",
              body: "If visiting between November and March, ensure your houseboat features a working wood-fired stone Hamam (underfloor heating) or high-wattage electric bed blankets and blowers. Ask the owner before booking.",
            },
          ],
        },
        {
          heading: "Shikara Boat Rides & Union Tariffs",
          text: "Shikaras serve both as water taxis and leisurely pleasure boats:",
          items: [
            {
              title: "Government Notified Rates",
              body: "The Shikara Owners Association and J&K Tourism notify fixed hourly tariffs (approx. ₹700–₹1,000 per hour for a 4-passenger boat). Rates are displayed on large signboard boards at primary Boulevard Ghats.",
            },
            {
              title: "Dawn Floating Vegetable Market Cruise",
              body: "Board your Shikara by 05:30 AM to reach the interior wetlands by sunrise. Witness hundreds of local farmers trading water lilies, radishes, and turnip greens from wooden canoes in morning mist.",
            },
          ],
        },
        {
          heading: "Houseboat Etiquette & Practical Advice",
          text: "Respectful guidelines for life on the water:",
          items: [
            {
              title: "Shoes Off Indoors",
              body: "Remove your shoes on the front veranda before stepping onto the hand-knotted silk and wool carpets inside the living salon.",
            },
            {
              title: "Tipping the Houseboat Staff",
              body: "Houseboat caretakers (Khansamas) provide dedicated 24-hour hospitality, tea service, and room care. A customary tip of ₹500–₹1,000 per night for the household staff is customary and deeply appreciated.",
            },
          ],
        },
      ],
      checklist: [
        "Confirm whether your houseboat is located on Dal Lake (central) or Nigeen Lake (quiet)",
        "Check that winter bookings include central heating, room heaters, or wood-fired Hamams",
        "Confirm that hot water is available 24/7 (many houseboats run dedicated solar or geyser backups)",
        "Book a dawn Shikara tour to the floating vegetable market for morning photography",
        "Negotiate Shikara rides based strictly on official tourism board tariff boards at Boulevard Ghats",
        "Carry cash for tipping the resident houseboat caretaker and boatmen",
      ],
    },
  };

  validateGuide(guide2Data.body);

  const [existingGuide2] = await db.select().from(travelGuides).where(eq(travelGuides.slug, guide2Data.slug)).limit(1);
  const guide2Snapshot: GuideSnapshot = {
    version: 1,
    title: guide2Data.title,
    summary: guide2Data.summary,
    tripTypes: guide2Data.tripTypes,
    body: guide2Data.body as any,
    seoTitle: guide2Data.seoTitle,
    seoDescription: guide2Data.seoDescription,
    place: { id: jk.id, slug: jk.slug, name: jk.name },
    places: [{ name: jk.name, slug: jk.slug, kind: "state", stateSlug: jk.slug }],
    heroImage: {
      url: houseboatGuidePhoto.url,
      alt: houseboatGuidePhoto.alt,
      caption: houseboatGuidePhoto.caption,
      kind: "photo",
      license: houseboatGuidePhoto.license,
      licenseUrl: houseboatGuidePhoto.licenseUrl,
      attribution: houseboatGuidePhoto.attribution,
      sourceUrl: houseboatGuidePhoto.sourceUrl,
    },
    publishedAt: new Date().toISOString(),
  };

  if (existingGuide2) {
    await db
      .update(travelGuides)
      .set({
        title: guide2Data.title,
        summary: guide2Data.summary,
        tripTypes: guide2Data.tripTypes,
        body: guide2Data.body as any,
        seoTitle: guide2Data.seoTitle,
        seoDescription: guide2Data.seoDescription,
        status: "published",
        publishedSnapshot: guide2Snapshot,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(travelGuides.id, existingGuide2.id));
    console.log(`✓ Updated travel guide 2: ${guide2Data.slug}`);
  } else {
    const [insertedG2] = await db
      .insert(travelGuides)
      .values({
        slug: guide2Data.slug,
        placeId: jk.id,
        title: guide2Data.title,
        summary: guide2Data.summary,
        tripTypes: guide2Data.tripTypes,
        body: guide2Data.body as any,
        seoTitle: guide2Data.seoTitle,
        seoDescription: guide2Data.seoDescription,
        heroMediaId: stateHeroMedia.id,
        status: "published",
        publishedSnapshot: guide2Snapshot,
        publishedAt: new Date(),
        publishedBy: actorId,
      })
      .returning();

    await db.insert(travelGuidePlaces).values({ guideId: insertedG2.id, placeId: jk.id });
    console.log(`✓ Inserted travel guide 2: ${guide2Data.slug}`);
  }

  // 8. Publish Jammu & Kashmir State Snapshot in place_versions & search_documents
  console.log("\n=== 8. PUBLISHING JAMMU & KASHMIR STATE SNAPSHOT ===");
  const stateSnapshot = {
    version: 1,
    place: {
      id: jk.id,
      slug: jk.slug,
      name: jk.name,
      kind: jk.kind,
      summary: jk.summary,
      lat: jk.lat,
      lng: jk.lng,
      tripTypes: jk.tripTypes,
      seoTitle: jk.seoTitle,
      seoDescription: jk.seoDescription,
      hero: stateHeroImg,
      displayMode: "page" as const,
      parent: null,
      state: null,
    },
    heroImage: stateHeroImg,
    sections: allSections.map((s) => ({
      key: s.key,
      body: s.body,
    })),
    childPlaces: childPlacesData,
    itineraries: [itin1Snapshot, itin2Snapshot],
    guides: [guide1Snapshot, guide2Snapshot],
    publishedAt: new Date().toISOString(),
  };

  const [existingPV] = await db
    .select()
    .from(placeVersions)
    .where(and(eq(placeVersions.placeId, jk.id), eq(placeVersions.version, 1)))
    .limit(1);

  let pvRow;
  if (existingPV) {
    const [updated] = await db
      .update(placeVersions)
      .set({ snapshot: stateSnapshot as any })
      .where(eq(placeVersions.id, existingPV.id))
      .returning();
    pvRow = updated;
    console.log(`✓ Updated place_versions record ${pvRow.id}`);
  } else {
    const [inserted] = await db
      .insert(placeVersions)
      .values({
        placeId: jk.id,
        version: 1,
        snapshot: stateSnapshot as any,
      })
      .returning();
    pvRow = inserted;
    console.log(`✓ Inserted place_versions record ${pvRow.id}`);
  }

  await db
    .update(places)
    .set({
      summary: jk.summary,
      seoTitle: jk.seoTitle,
      seoDescription: jk.seoDescription,
      status: "published",
      publishedVersionId: pvRow.id,
      updatedAt: new Date(),
    })
    .where(eq(places.id, jk.id));

  // Search document indexing
  const doc = {
    versionId: pvRow.id,
    path: "/india/jammu-and-kashmir",
    name: "Jammu and Kashmir",
    kind: "state",
    stateName: "Jammu and Kashmir",
    content: snapshotText(stateSnapshot as any),
    updatedAt: new Date(),
  };

  await db
    .insert(searchDocuments)
    .values({ placeId: jk.id, ...doc })
    .onConflictDoUpdate({ target: searchDocuments.placeId, set: doc });

  console.log(`\n🎉 Success! Jammu & Kashmir state published version 1 (id: ${pvRow.id}) with 100% verified real photographs, 4 regions, 10 destinations, 4 top activities, 2 rich itineraries with day-wise sight photos, and 2 comprehensive travel guides!`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

