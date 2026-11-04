import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import {
  media,
  places,
  placeVersions,
  searchDocuments,
  sections,
  type SnapshotImage,
} from "../src/lib/db/schema.js";
import { storeImage } from "../src/lib/media/storage.js";
import { sniffImage, EXT } from "../src/lib/media/sniff.js";
import { snapshotText } from "../src/lib/places/publish.js";

interface PhotoQuery {
  title: string;
  query: string;
  alt: string;
  caption: string;
  body: string;
}

const REGION_PHOTOS: PhotoQuery[] = [
  {
    title: "Dhundhar and the Pink City",
    query: "Amber Fort Jaipur",
    alt: "Aerial view of Amer Fort and ramparts overlooking Maota Lake near Jaipur",
    caption: "Amer Fort & Maota Lake, Dhundhar",
    body: "The state capital's UNESCO-walled Pink City, Hawa Mahal and astronomical observatory Jantar Mantar; the three hilltop fortresses of Amer, Jaigarh and Nahargarh; and the ancient stepwell of Abhaneri.",
  },
  {
    title: "Mewar and the Southern Lakes",
    query: "Lake Pichola Udaipur City Palace",
    alt: "City Palace reflecting in the waters of Lake Pichola in Udaipur",
    caption: "Lake Pichola & City Palace, Mewar",
    body: "Udaipur's white marble City Palace reflecting in Lake Pichola, the immense 700-acre battlements of Chittorgarh Fortress, Kumbhalgarh's 36 km great perimeter wall, and the hill sanitarium of Mount Abu.",
  },
  {
    title: "Marwar and the Thar Desert",
    query: "Mehrangarh Fort Jodhpur",
    alt: "Mehrangarh Fort rising high above the blue-washed houses of Jodhpur",
    caption: "Mehrangarh Fort & The Blue City, Marwar",
    body: "Jodhpur's soaring Mehrangarh Fort above a sea of blue Brahmin houses; Jaisalmer's living yellow sandstone citadel and sweeping Sam sand dunes on the desert edge.",
  },
  {
    title: "Shekhawati and Bikaner",
    query: "Haveli Mandawa Shekhawati",
    alt: "Ornate fresco-painted merchant haveli in Mandawa, Shekhawati region",
    caption: "Painted Haveli in Mandawa, Shekhawati",
    body: "The world's largest open-air art gallery in Mandawa and Nawalgarh with fresco-painted merchant havelis; Bikaner's unbreached Junagarh Fort and National Camel Research Centre.",
  },
  {
    title: "Hadoti and Ranthambore",
    query: "Tiger Ranthambhore National Park",
    alt: "Royal Bengal Tiger in Ranthambore National Park beneath ancient forest canopies",
    caption: "Royal Bengal Tiger, Ranthambore & Hadoti",
    body: "Premier Royal Bengal tiger territory in Ranthambore National Park beneath 10th-century fort ruins; the stepwell-studded heritage town of Bundi and the deep Chambal River gorge.",
  },
];

interface DestQuery {
  slug: string;
  name: string;
  query: string;
  alt: string;
  caption: string;
}

const DESTINATION_PHOTOS: DestQuery[] = [
  {
    slug: "udaipur",
    name: "Udaipur",
    query: "Lake Pichola Udaipur City Palace",
    alt: "City Palace and Lake Pichola waterfront in Udaipur",
    caption: "City Palace & Lake Pichola, Udaipur",
  },
  {
    slug: "jodhpur",
    name: "Jodhpur",
    query: "Mehrangarh Fort Jodhpur",
    alt: "Mehrangarh Fort rising above the Blue City of Jodhpur",
    caption: "Mehrangarh Fort, Jodhpur",
  },
  {
    slug: "jaisalmer",
    name: "Jaisalmer",
    query: "Jaisalmer Fort Golden Fort",
    alt: "The golden sandstone bastions of Jaisalmer Fort at sunset",
    caption: "Sonar Qila (Golden Fort), Jaisalmer",
  },
  {
    slug: "mount-abu",
    name: "Mount Abu",
    query: "Nakki Lake Mount Abu",
    alt: "Boats resting on serene Nakki Lake surrounded by hills in Mount Abu",
    caption: "Nakki Lake, Mount Abu",
  },
  {
    slug: "pushkar",
    name: "Pushkar",
    query: "Pushkar Lake Ghats Brahma",
    alt: "The sacred bathing ghats and white temples surrounding Pushkar Lake",
    caption: "Brahma Ghats, Pushkar Lake",
  },
  {
    slug: "chittorgarh",
    name: "Chittorgarh",
    query: "Chittorgarh Fort Vijay Stambha",
    alt: "Vijay Stambha (Tower of Victory) rising within Chittorgarh Fort",
    caption: "Vijay Stambha, Chittorgarh Fort",
  },
  {
    slug: "ranthambore",
    name: "Ranthambore",
    query: "Tiger Ranthambhore National Park",
    alt: "Royal Bengal Tiger in Ranthambore National Park",
    caption: "Bengal Tiger, Ranthambore National Park",
  },
  {
    slug: "bikaner",
    name: "Bikaner",
    query: "Junagarh Fort Bikaner",
    alt: "The ornate red sandstone courtyards of Junagarh Fort in Bikaner",
    caption: "Junagarh Fort, Bikaner",
  },
  {
    slug: "kumbhalgarh",
    name: "Kumbhalgarh",
    query: "Kumbhalgarh Fort Great Wall",
    alt: "The immense stone ramparts and watchtowers of Kumbhalgarh Fort Wall",
    caption: "Great Wall of Kumbhalgarh Fort",
  },
];

async function searchWiki(query: string) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    query
  )}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url|extmetadata&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "VacayOut/1.0 (travel@vacayout.com)" },
  });
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
}

async function fetchAndStoreImage(
  query: string,
  prefix: string,
  fallbackAlt: string,
  fallbackCaption: string
): Promise<SnapshotImage> {
  const wiki = await searchWiki(query);
  if (!wiki) {
    throw new Error(`Wikimedia search returned no results for query: "${query}"`);
  }

  console.log(`Downloading real photo for ${prefix} from ${wiki.url.substring(0, 70)}...`);
  const res = await fetch(wiki.url, {
    headers: {
      "User-Agent": "VacayOut/1.0 (travel@vacayout.com; https://vacayout.com)",
      Accept: "image/*",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download ${wiki.url}: HTTP ${res.status}`);
  }

  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const type = sniffImage(bytes);
  if (!type) {
    throw new Error(`Could not determine image type for ${wiki.url}`);
  }

  const stored = await storeImage(`${prefix}.${EXT[type]}`, bytes, type);
  console.log(`✓ Stored real photo in Vercel Blob: ${stored.url}`);

  return {
    url: stored.url,
    storageKey: stored.storageKey,
    contentType: type,
    bytes: bytes.length,
    alt: fallbackAlt || wiki.alt,
    caption: fallbackCaption,
    kind: "photo" as const,
    license: wiki.license,
    licenseUrl: wiki.licenseUrl,
    attribution: wiki.author,
    sourceUrl: wiki.sourceUrl,
  };
}

async function main() {
  const db = getDb();
  const [raj] = await db.select().from(places).where(eq(places.slug, "rajasthan")).limit(1);
  if (!raj) throw new Error("Rajasthan not found");

  console.log("=== 1. DOWNLOADING & STORING REAL PHOTOS FOR RAJASTHAN REGIONS ===");
  const newRegionItems = [];
  for (const reg of REGION_PHOTOS) {
    const slugName = reg.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const img = await fetchAndStoreImage(
      reg.query,
      `places/rajasthan/regions/${slugName}`,
      reg.alt,
      reg.caption
    );

    newRegionItems.push({
      title: reg.title,
      body: reg.body,
      status: "verified" as const,
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

  // Update regions section in DB
  await db
    .update(sections)
    .set({
      content: { items: newRegionItems } as any,
      updatedAt: new Date(),
    })
    .where(eq(sections.placeId, raj.id))
    .then(() => console.log("✓ Updated regions section in database"));

  console.log("\n=== 2. DOWNLOADING & STORING REAL PHOTOS FOR CHILD DESTINATIONS ===");
  for (const dest of DESTINATION_PHOTOS) {
    const [p] = await db.select().from(places).where(eq(places.slug, dest.slug)).limit(1);
    if (!p) {
      console.warn(`Place ${dest.slug} not found in DB, skipping`);
      continue;
    }

    const img = await fetchAndStoreImage(
      dest.query,
      `places/${dest.slug}/hero`,
      dest.alt,
      dest.caption
    );

    // Insert media row
    const [mRow] = await db.insert(media).values({
      placeId: p.id,
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
    }).returning();

    await db.update(places).set({ heroMediaId: mRow.id }).where(eq(places.id, p.id));

    // If destination has a published version, update its snapshot hero image and republish
    if (p.publishedVersionId) {
      const [ver] = await db
        .select()
        .from(placeVersions)
        .where(eq(placeVersions.id, p.publishedVersionId))
        .limit(1);
      if (ver) {
        const snap = ver.snapshot as any;
        snap.heroImage = {
          url: img.url,
          alt: img.alt,
          caption: img.caption,
          kind: img.kind,
          license: img.license,
          licenseUrl: img.licenseUrl,
          attribution: img.attribution,
          sourceUrl: img.sourceUrl,
        };
        await db
          .update(placeVersions)
          .set({ snapshot: snap })
          .where(eq(placeVersions.id, ver.id));
        console.log(`✓ Updated destination ${dest.name} published snapshot with real photo`);
      }
    }
  }

  console.log("\n=== 3. REPUBLISHING RAJASTHAN STATE SNAPSHOT ===");
  // Fetch current published version
  const [curVer] = await db
    .select()
    .from(placeVersions)
    .where(eq(placeVersions.id, raj.publishedVersionId!))
    .limit(1);

  if (!curVer) throw new Error("Current Rajasthan version not found");
  const stateSnapshot = curVer.snapshot as any;

  // Replace regions in snapshot
  const regSecIdx = stateSnapshot.sections.findIndex((s: any) => s.type === "regions");
  if (regSecIdx !== -1) {
    stateSnapshot.sections[regSecIdx].content = { items: newRegionItems };
    console.log("✓ Replaced regions in state snapshot");
  }

  // Update child destinations in state snapshot with their new real hero photos
  const destSlugs = DESTINATION_PHOTOS.map((d) => d.slug);
  const updatedChildPlaces = await db
    .select()
    .from(places)
    .where(inArray(places.slug, destSlugs));

  for (const child of updatedChildPlaces) {
    const [latestMedia] = await db
      .select()
      .from(media)
      .where(eq(media.placeId, child.id))
      .orderBy(desc(media.createdAt))
      .limit(1);

    if (latestMedia) {
      const foundInSnap = stateSnapshot.childPlaces?.find((c: any) => c.slug === child.slug);
      if (foundInSnap) {
        foundInSnap.heroImage = {
          url: latestMedia.url,
          alt: latestMedia.alt || child.name,
          caption: latestMedia.caption || child.name,
          kind: "photo",
          license: latestMedia.license,
          licenseUrl: latestMedia.licenseUrl,
          attribution: latestMedia.attribution,
          sourceUrl: latestMedia.sourceUrl,
        };
        console.log(`✓ Updated child place ${child.name} card image in state snapshot`);
      }
    }
  }

  // Publish new version
  const nextVer = (curVer.version || 1) + 1;
  const [pvRow] = await db
    .insert(placeVersions)
    .values({
      placeId: raj.id,
      version: nextVer,
      snapshot: stateSnapshot as any,
    })
    .returning();

  await db
    .update(places)
    .set({
      summary: stateSnapshot.place.summary,
      seoTitle: stateSnapshot.place.seoTitle,
      seoDescription: stateSnapshot.place.seoDescription,
      status: "published",
      publishedVersionId: pvRow.id,
      updatedAt: new Date(),
    })
    .where(eq(places.id, raj.id));

  // Update search document
  const doc = {
    versionId: pvRow.id,
    path: "/india/rajasthan",
    name: "Rajasthan",
    kind: "state",
    stateName: "Rajasthan",
    content: snapshotText(stateSnapshot as any),
    updatedAt: new Date(),
  };
  await db
    .insert(searchDocuments)
    .values({ placeId: raj.id, ...doc })
    .onConflictDoUpdate({ target: searchDocuments.placeId, set: doc });

  console.log(`\n🎉 Success! Rajasthan published new version ${nextVer} (id: ${pvRow.id}) with 100% real photographs across all regions and destinations!`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
