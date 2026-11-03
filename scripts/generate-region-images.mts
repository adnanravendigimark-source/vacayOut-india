import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import { media, places, placeVersions, sections, type ItemStatus, type SnapshotImage } from "../src/lib/db/schema.js";
import { storeImage } from "../src/lib/media/storage.js";
import { sniffImage, EXT } from "../src/lib/media/sniff.js";

const REGION_PROMPTS: { title: string; prompt: string; alt: string }[] = [
  {
    title: "Shimla and the Kalka–Shimla line",
    prompt:
      "A painterly travel-poster illustration of the historic red-and-cream Kalka-Shimla toy train crossing a curved stone arch bridge through lush pine-forested Himalayan hills, with colonial Shimla and distant misty peaks in the background. Calm natural daylight, nostalgic travel poster aesthetic, no text, no people in foreground.",
    alt: "Illustration of the Kalka–Shimla toy train and pine-forested hills of Shimla",
  },
  {
    title: "Kullu–Manali and the Parvati valley",
    prompt:
      "A painterly travel-poster illustration of the Kullu-Manali and Parvati valley, showing roaring crystal glacial waters of the Beas River, towering deodar cedar forests, traditional wooden Himachali architecture, and snow-capped Himalayan peaks under a clear alpine sky. No text, no people in foreground.",
    alt: "Illustration of the Beas River and snow-capped peaks of Kullu and Manali",
  },
  {
    title: "Kangra and Dharamshala",
    prompt:
      "A painterly travel-poster illustration of Dharamshala and the Kangra valley, with the dramatic sheer granite and snow-covered wall of the Dhauladhar range rising behind vibrant emerald green tea gardens and a quiet Tibetan Buddhist monastery. Morning mountain light, no text, no people in foreground.",
    alt: "Illustration of Kangra tea gardens and the towering snow-covered Dhauladhar range above Dharamshala",
  },
  {
    title: "Chamba and Dalhousie",
    prompt:
      "A painterly travel-poster illustration of colonial Dalhousie and the rolling saucer-shaped green meadow of Khajjiar ringed by dense deodar forests, overlooking the deep Ravi river valley with ancient tiered wooden temple roofs of Chamba. Soft mountain sunshine, no text, no people in foreground.",
    alt: "Illustration of Khajjiar meadow and the forested ridges of Dalhousie and Chamba",
  },
  {
    title: "Lahaul and Spiti",
    prompt:
      "A painterly travel-poster illustration of the stark, dramatic high-altitude cold desert of Spiti Valley, featuring the whitewashed Key Monastery perched atop a conical rugged cliff, the braided turquoise Spiti River winding through barren gravel plains below, under an intense deep azure Himalayan sky. No text, no people in foreground.",
    alt: "Illustration of Key Monastery perched on the barren cliffs of Spiti Valley",
  },
  {
    title: "Kinnaur",
    prompt:
      "A painterly travel-poster illustration of Kinnaur and Sangla valley, showing the sacred rocky spire of Kinner Kailash illuminated by golden dawn sunlight, rising above blossoming apple orchards, fast-flowing Baspa river, and traditional slate-roofed Kinnauri houses. No text, no people in foreground.",
    alt: "Illustration of Kinner Kailash and blooming apple orchards in Kinnaur",
  },
];

async function generateOne(prompt: string): Promise<Uint8Array> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY missing");

  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/images/generations`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-2.5-flare",
      prompt,
      size: "1536x1024",
      quality: "medium",
      output_format: "jpeg",
      n: 1,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image API failed (${res.status}): ${err}`);
  }

  const json = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data in response");

  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function main() {
  const db = getDb();
  const [hp] = await db.select().from(places).where(eq(places.slug, "himachal-pradesh"));
  if (!hp) throw new Error("Himachal Pradesh not found in DB");

  const [secRow] = await db
    .select()
    .from(sections)
    .where(and(eq(sections.placeId, hp.id), eq(sections.key, "regions")));
  if (!secRow) throw new Error("Regions section not found for HP");

  const [verRow] = await db
    .select()
    .from(placeVersions)
    .where(eq(placeVersions.id, hp.publishedVersionId!));
  if (!verRow) throw new Error("Published version not found for HP");

  const currentItems = (secRow.body?.items ?? []) as {
    title?: string;
    body: string;
    status?: ItemStatus;
    image?: SnapshotImage | null;
  }[];

  console.log(`Generating images for ${REGION_PROMPTS.length} regions of Himachal Pradesh...`);

  const updatedItems = [];

  for (let i = 0; i < REGION_PROMPTS.length; i++) {
    const def = REGION_PROMPTS[i];
    const existing = currentItems.find((it) => it.title === def.title) || currentItems[i];
    console.log(`\n[${i + 1}/${REGION_PROMPTS.length}] Generating image for: "${def.title}"...`);

    const bytes = await generateOne(def.prompt);
    const type = sniffImage(bytes) || "image/jpeg";
    const slug = def.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const stored = await storeImage(
      `places/himachal-pradesh/regions/${slug}-${crypto.randomUUID()}.${EXT[type]}`,
      bytes,
      type
    );

    console.log(`  Stored at: ${stored.url}`);

    await db.insert(media).values({
      placeId: hp.id,
      url: stored.url,
      storageKey: stored.storageKey,
      contentType: type,
      bytes: bytes.length,
      alt: def.alt,
      caption: def.title,
      kind: "ai_generated",
      license: "AI-generated image",
      attribution: "AI-generated illustration",
      sourceUrl: null,
    });

    const snapshotImage = {
      url: stored.url,
      alt: def.alt,
      caption: def.title,
      kind: "ai_generated" as const,
      license: "AI-generated image",
      attribution: "AI-generated illustration",
      sourceUrl: null,
    };

    updatedItems.push({
      ...existing,
      title: def.title,
      image: snapshotImage,
    });
  }

  // Update sections table
  await db
    .update(sections)
    .set({
      body: {
        ...secRow.body,
        items: updatedItems,
      },
      updatedAt: new Date(),
    })
    .where(eq(sections.id, secRow.id));

  console.log("\n✓ Updated sections table row for 'regions'");

  // Update placeVersions snapshot
  const snapshot = verRow.snapshot;
  const snapSections = snapshot.sections.map((s) => {
    if (s.key === "regions") {
      return {
        ...s,
        body: {
          ...s.body,
          items: updatedItems,
        },
      };
    }
    return s;
  });

  await db
    .update(placeVersions)
    .set({
      snapshot: {
        ...snapshot,
        sections: snapSections,
      },
    })
    .where(eq(placeVersions.id, verRow.id));

  console.log("✓ Updated placeVersions published snapshot with region images");
  console.log("All 6 regions successfully updated with generated images!");
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(() => process.exit(0));

