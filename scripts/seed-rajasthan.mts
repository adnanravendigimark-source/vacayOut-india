import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import { media, places, placeVersions, searchDocuments, sections, type SnapshotImage, type ItemStatus } from "../src/lib/db/schema.js";
import { storeImage } from "../src/lib/media/storage.js";
import { sniffImage, EXT } from "../src/lib/media/sniff.js";
import { snapshotText } from "../src/lib/places/publish.js";

const REGION_PROMPTS = [
  {
    title: "Dhundhar and the Pink City",
    prompt:
      "A painterly travel-poster illustration of Amer Fort and the Pink City of Jaipur in golden hour light, showing grand sandstone ramparts and Ganesh Pol gate above Maota Lake, with the terracotta-pink latticed facade of Hawa Mahal and distant Aravalli hills. Vintage travel poster aesthetic, warm desert colors, no text, no people in foreground.",
    alt: "Illustration of Amer Fort ramparts above Maota Lake and the Pink City of Jaipur",
    caption: "Dhundhar & The Pink City",
    body: "The state capital's UNESCO-walled Pink City, Hawa Mahal and astronomical observatory Jantar Mantar; the three hilltop fortresses of Amer, Jaigarh and Nahargarh; and the ancient stepwell of Abhaneri.",
  },
  {
    title: "Mewar and the Southern Lakes",
    prompt:
      "A painterly travel-poster illustration of Udaipur and Mewar, featuring the white marble City Palace and Jag Mandir reflecting on the serene waters of Lake Pichola, with the rugged Aravalli hills and the distant great stone wall of Kumbhalgarh on the horizon. Soft sunset glow, romantic aesthetic, no text, no people in foreground.",
    alt: "Illustration of Lake Pichola, City Palace Udaipur, and the Aravalli hills of Mewar",
    caption: "Mewar & Southern Lakes",
    body: "Udaipur's white marble City Palace reflecting in Lake Pichola, the immense 700-acre battlements of Chittorgarh Fortress, Kumbhalgarh's 36 km great perimeter wall, and the hill sanitarium of Mount Abu.",
  },
  {
    title: "Marwar and the Thar Desert",
    prompt:
      "A painterly travel-poster illustration of Marwar and the Great Thar Desert, showing the massive cliff-top Mehrangarh Fort rising above a sea of blue-painted houses in Jodhpur, and golden sand dunes of Jaisalmer with the yellow sandstone Sonar Qila in the distance under a vast starlit desert sky. Cinematic desert colors, no text, no people in foreground.",
    alt: "Illustration of Mehrangarh Fort towering over the Blue City of Jodhpur and Thar sand dunes",
    caption: "Marwar & The Thar Desert",
    body: "Jodhpur's soaring Mehrangarh Fort above a sea of blue Brahmin houses; Jaisalmer's living yellow sandstone citadel and sweeping Sam sand dunes on the desert edge.",
  },
  {
    title: "Shekhawati and Bikaner",
    prompt:
      "A painterly travel-poster illustration of Shekhawati and Bikaner, showing an ornate traditional Rajasthani merchant haveli with intricate colorful fresco murals on its arched courtyard walls, and the unvanquished red sandstone towers of Junagarh Fort in Bikaner under bright desert sunshine. Artistic vintage poster style, no text, no people in foreground.",
    alt: "Illustration of painted fresco merchant havelis of Shekhawati and Junagarh Fort Bikaner",
    caption: "Shekhawati & Bikaner",
    body: "The world's largest open-air art gallery in Mandawa and Nawalgarh with fresco-painted merchant havelis; Bikaner's unbreached Junagarh Fort and National Camel Research Centre.",
  },
  {
    title: "Hadoti and Ranthambore",
    prompt:
      "A painterly travel-poster illustration of Ranthambore and Hadoti, showing a majestic Royal Bengal Tiger resting beside the ancient stone ruins and banyan trees of Ranthambore Fort near Padam Talao lake, with the deep stepwells of Bundi and rocky Chambal River gorge in the distance. Rich wildlife and heritage aesthetic, no text, no people in foreground.",
    alt: "Illustration of a Royal Bengal tiger near ancient stone ruins of Ranthambore and Bundi stepwells",
    caption: "Hadoti & Ranthambore",
    body: "Premier Royal Bengal tiger territory in Ranthambore National Park beneath 10th-century fort ruins; the stepwell-studded heritage town of Bundi and the deep Chambal River gorge.",
  },
];

const DESTINATIONS = [
  {
    name: "Udaipur",
    slug: "udaipur",
    kind: "city",
    summary: "The City of Lakes and romantic white marble palaces of Mewar, centered on the shimmering waters of Lake Pichola.",
    lat: 24.5854,
    lng: 73.7125,
    tripTypes: ["heritage", "romance", "culture"],
    prompt: "A painterly travel-poster illustration of Lake Pichola and the City Palace in Udaipur, with royal boats floating on calm water and the Aravalli hills in the background. Soft sunset pastel tones, no text.",
    alt: "White marble City Palace reflecting in Lake Pichola, Udaipur",
  },
  {
    name: "Jodhpur",
    slug: "jodhpur",
    kind: "city",
    summary: "The Blue City and Sun City of Marwar, anchored by the colossal cliffside ramparts of Mehrangarh Fort.",
    lat: 26.2389,
    lng: 73.0243,
    tripTypes: ["heritage", "culture", "city"],
    prompt: "A painterly travel-poster illustration of Mehrangarh Fort towering on its rocky cliff over the indigo blue houses of Jodhpur. Clear desert morning light, no text.",
    alt: "Mehrangarh Fort rising above the blue-painted houses of Jodhpur",
  },
  {
    name: "Jaisalmer",
    slug: "jaisalmer",
    kind: "town",
    summary: "The Golden City on the edge of the Thar Desert, home to a living medieval sandstone fort and sweeping sand dunes.",
    lat: 26.9157,
    lng: 70.9083,
    tripTypes: ["desert", "heritage", "adventure"],
    prompt: "A painterly travel-poster illustration of the golden sandstone fortress of Jaisalmer glowing in the desert sun with rolling sand dunes. Warm golden tones, no text.",
    alt: "Golden sandstone fort of Jaisalmer rising out of the Thar Desert",
  },
  {
    name: "Pushkar",
    slug: "pushkar",
    kind: "town",
    summary: "Sacred pilgrimage town around a holy lake with 52 bathing ghats, one of the world's rare Brahma temples, and the annual Camel Fair.",
    lat: 26.4897,
    lng: 74.5511,
    tripTypes: ["spiritual", "culture", "heritage"],
    prompt: "A painterly travel-poster illustration of Pushkar holy lake with white ghats, temple spires, and distant sand hills under a gentle pink sky. Serene spiritual atmosphere, no text.",
    alt: "White temple ghats reflecting in the sacred waters of Pushkar Lake",
  },
  {
    name: "Ranthambore",
    slug: "ranthambore",
    kind: "region",
    summary: "Premier wildlife sanctuary and tiger reserve where Royal Bengal Tigers roam among ancient 10th-century fort ruins and lakes.",
    lat: 26.0173,
    lng: 76.5026,
    tripTypes: ["wildlife", "nature", "heritage"],
    prompt: "A painterly travel-poster illustration of a Royal Bengal tiger walking near a scenic lake with ancient banyan trees and the stone towers of Ranthambore Fort. Lush wilderness aesthetic, no text.",
    alt: "Royal Bengal Tiger in Ranthambore National Park near fort ruins and lake",
  },
  {
    name: "Bikaner",
    slug: "bikaner",
    kind: "city",
    summary: "Northern desert citadel known for the unvanquished Junagarh Fort, red sandstone palaces, and the National Camel Research Centre.",
    lat: 28.0229,
    lng: 73.3119,
    tripTypes: ["heritage", "desert", "culture"],
    prompt: "A painterly travel-poster illustration of the ornate red sandstone courtyards of Junagarh Fort in Bikaner with camel caravans in the desert distance. Vibrant desert palette, no text.",
    alt: "Red sandstone courtyards and towers of Junagarh Fort, Bikaner",
  },
  {
    name: "Chittorgarh",
    slug: "chittorgarh",
    kind: "town",
    summary: "India's largest fort complex, a 700-acre UNESCO hill fortress embodying Rajput valour, Vijay Stambh, and Queen Padmini's palace.",
    lat: 24.8887,
    lng: 74.6269,
    tripTypes: ["heritage", "history"],
    prompt: "A painterly travel-poster illustration of the massive stone ramparts and Vijay Stambh Tower of Victory at Chittorgarh Fort on a dramatic plateau. Epic historical aesthetic, no text.",
    alt: "Vijay Stambh and ancient stone battlements of Chittorgarh Fort",
  },
  {
    name: "Kumbhalgarh",
    slug: "kumbhalgarh",
    kind: "town",
    summary: "Impregnable Mewar fortress perched high in the Aravallis, boasting the second-longest continuous stone wall in the world at 36 km.",
    lat: 25.1528,
    lng: 73.5872,
    tripTypes: ["heritage", "nature", "trekking"],
    prompt: "A painterly travel-poster illustration of the massive 36-kilometer stone wall of Kumbhalgarh Fort snaking over rolling forested Aravalli mountain ridges. Dramatic mountain scenery, no text.",
    alt: "The 36 km continuous stone wall of Kumbhalgarh Fort winding along Aravalli ridges",
  },
  {
    name: "Mount Abu",
    slug: "mount-abu",
    kind: "town",
    summary: "Rajasthan's only hill station, set amidst pine and palm forests at 1,220 m, famous for Nakki Lake and intricately carved Dilwara Jain marble temples.",
    lat: 24.5925,
    lng: 72.7156,
    tripTypes: ["mountains", "nature", "heritage"],
    prompt: "A painterly travel-poster illustration of serene Nakki Lake in Mount Abu surrounded by green granite hills, boulders, and temple shikharas. Cool mountain retreat aesthetic, no text.",
    alt: "Nakki Lake surrounded by forested granite hills in Mount Abu",
  },
];

async function generateImage(prompt: string): Promise<Uint8Array> {
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
  const json = (await res.json()) as { data?: { url?: string; b64_json?: string }[] };
  const item = json.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item?.url) {
    const dl = await fetch(item.url);
    if (!dl.ok) throw new Error(`Download failed: ${dl.status}`);
    return new Uint8Array(await dl.arrayBuffer());
  }
  throw new Error("No image data returned");
}

async function main() {
  const db = getDb();
  console.log("Starting comprehensive Rajasthan seeding...");

  // 1. Get Rajasthan State record
  const [raj] = await db.select().from(places).where(eq(places.slug, "rajasthan")).limit(1);
  if (!raj) throw new Error("Rajasthan place record not found!");
  console.log("Found Rajasthan state:", raj.id);

  // 2. Generate Region Images
  console.log("\n--- Generating Region Images ---");
  const regionItems = [];
  for (const r of REGION_PROMPTS) {
    console.log(`Generating image for region: ${r.title}...`);
    try {
      const bytes = await generateImage(r.prompt);
      const type = sniffImage(bytes) || "image/jpeg";
      const slugKey = r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const stored = await storeImage(`places/rajasthan/regions/${slugKey}-${crypto.randomUUID()}.${EXT[type]}`, bytes, type);
      console.log(`  Uploaded to Vercel Blob: ${stored.url}`);

      const img: SnapshotImage = {
        url: stored.url,
        alt: r.alt,
        caption: r.caption,
        kind: "ai_generated",
        license: "AI-generated image",
        sourceUrl: null,
        attribution: "AI-generated illustration for VacayOut",
      };

      regionItems.push({
        title: r.title,
        body: r.body,
        status: "verified" as ItemStatus,
        image: img,
      });
    } catch (err) {
      console.error(`  Failed for ${r.title}:`, err);
      regionItems.push({
        title: r.title,
        body: r.body,
        status: "verified" as ItemStatus,
      });
    }
  }

  // 3. Seed Child Destinations
  console.log("\n--- Seeding Child Destinations ---");
  for (const d of DESTINATIONS) {
    console.log(`Processing destination: ${d.name}...`);
    let [place] = await db.select().from(places).where(and(eq(places.slug, d.slug), eq(places.stateId, raj.id))).limit(1);
    if (!place) {
      [place] = await db
        .insert(places)
        .values({
          kind: d.kind as any,
          name: d.name,
          slug: d.slug,
          parentId: raj.id,
          stateId: raj.id,
          summary: d.summary,
          lat: d.lat,
          lng: d.lng,
          seoTitle: `${d.name} Travel Guide: Forts, Places to Visit & Trip Planning`,
          seoDescription: `Complete travel guide to ${d.name}, Rajasthan. Discover attractions, best time to visit, heritage stays, and itineraries.`,
          status: "published",
          displayMode: "page",
          tripTypes: d.tripTypes,
        })
        .returning();
      console.log(`  Created place: ${d.name} (${place.id})`);
    } else {
      await db
        .update(places)
        .set({
          name: d.name,
          summary: d.summary,
          lat: d.lat,
          lng: d.lng,
          status: "published",
          displayMode: "page",
          tripTypes: d.tripTypes,
        })
        .where(eq(places.id, place.id));
      console.log(`  Updated place: ${d.name} (${place.id})`);
    }

    // Hero image for destination
    let hero: SnapshotImage | null = null;
    try {
      console.log(`  Generating hero image for ${d.name}...`);
      const bytes = await generateImage(d.prompt);
      const type = sniffImage(bytes) || "image/jpeg";
      const stored = await storeImage(`places/${d.slug}/${crypto.randomUUID()}.${EXT[type]}`, bytes, type);
      const [mediaRow] = await db
        .insert(media)
        .values({
          placeId: place.id,
          url: stored.url,
          storageKey: stored.storageKey,
          contentType: type,
          bytes: bytes.length,
          alt: d.alt,
          caption: `${d.name}, Rajasthan`,
          kind: "ai_generated",
          license: "AI-generated image",
          attribution: "AI-generated illustration for VacayOut",
        })
        .returning();
      await db.update(places).set({ heroMediaId: mediaRow.id }).where(eq(places.id, place.id));
      hero = {
        url: stored.url,
        alt: d.alt,
        caption: `${d.name}, Rajasthan`,
        kind: "ai_generated",
        license: "AI-generated image",
        sourceUrl: null,
        attribution: "AI-generated illustration for VacayOut",
      };
    } catch (e) {
      console.warn(`  Hero image generation skipped for ${d.name}:`, e);
    }

    // Create a published snapshot for the child destination
    const childSnapshot = {
      place: {
        id: place.id,
        kind: d.kind,
        name: d.name,
        slug: d.slug,
        summary: d.summary,
        lat: d.lat,
        lng: d.lng,
        seoTitle: `${d.name} Travel Guide`,
        seoDescription: d.summary,
        state: { name: raj.name, slug: raj.slug },
        parent: { name: raj.name, slug: raj.slug, kind: "state" },
        displayMode: "page",
        hero,
      },
      sections: [
        {
          key: "overview",
          body: { text: d.summary },
        },
      ],
    };

    const [vRow] = await db
      .insert(placeVersions)
      .values({
        placeId: place.id,
        version: 1,
        snapshot: childSnapshot as any,
      })
      .returning();

    await db.update(places).set({ publishedVersionId: vRow.id }).where(eq(places.id, place.id));
    console.log(`  Published snapshot created for ${d.name}`);
  }

  // 4. Define all 16 Sections for Rajasthan State
  console.log("\n--- Preparing 16 Sections for Rajasthan State ---");
  const allSections: { key: string; body: any }[] = [
    {
      key: "overview",
      body: {
        text: "Rajasthan climbs from the Aravalli hills across sweeping scrub forests to the rolling yellow sand dunes of the Great Thar Desert on the Pakistan border. Diagonally bisected by the ancient Aravalli Range—one of the oldest geological fold mountain systems in the world—the state transitions from the fertile Chambal and Banas river basins in the south-east to the arid desert plains of Marwar in the west. Jaipur is the state capital, with high-altitude courts and administrative hubs centered in Jodhpur and Udaipur.\n\nMost journeys trace historic royal circuits: the Golden Triangle gateway of Jaipur with its hilltop amber citadels; the Blue City of Jodhpur dominated by the sheer ramparts of Mehrangarh; the romantic lakeside marble palaces of Udaipur; the living desert citadel of Jaisalmer; the birding wetlands of Keoladeo; and the royal Bengal tiger sanctuaries of Ranthambore. Six dramatic hill fortresses—Amber, Chittorgarh, Kumbhalgarh, Jaisalmer, Ranthambore, and Gagron—are collectively recognized as a UNESCO World Heritage Site.\n\nFormed in 1949 from the unification of 22 Rajput kingdoms and principalities, Rajasthan preserves deep-rooted chivalric folklore, hereditary artisan traditions, and vibrant cultural celebrations. In 2024, the state welcomed over 230 million domestic and 2.07 million international travellers. Beyond its majestic forts and sand dunes, Rajasthan is a living mosaic of camel caravans, vibrant tie-dye turbans, sacred ghats in Pushkar, and hospitable desert hamlets.",
      },
    },
    {
      key: "key_facts",
      body: {
        items: [
          { title: "Best time", body: "Oct–Mar for forts & desert · Jul–Sep for Mewar lakes", status: "seasonal" },
          { title: "Trip length", body: "Plan 7–10 days for classic circuits · 14 days for the grand desert loop", status: "estimate" },
          { title: "Terrain", body: "Thar Desert sand dunes, rocky Aravalli ridges & fertile river plains", status: "verified" },
          { title: "State capital", body: "Jaipur (The Pink City), 260 km south-west of New Delhi", status: "verified" },
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
          { body: "Pushkar Camel Fair — October/November, thousands of decorated camels, horse traders, and holy bathing on Kartik Purnima.", status: "seasonal" },
          { body: "Jaisalmer Desert Festival — February, three days of folk music, turban tying, and camel races at Sam Sand Dunes.", status: "seasonal" },
          { body: "Teej Festival, Jaipur — July/August, grand royal processions celebrating the arrival of the monsoon.", status: "seasonal" },
          { body: "Gangaur Festival, Jaipur & Udaipur — March/April, women carry colourful effigies of Gauri through city streets.", status: "seasonal" },
          { body: "Marwar Festival, Jodhpur — October, folk music and ballads celebrating Rajput chivalry at Mehrangarh and Mandore.", status: "seasonal" },
          { body: "Bikaner Camel Festival — January, colourful camel parades, folk dances, and fire performances against Junagarh Fort.", status: "seasonal" },
          { body: "Kumbhalgarh Classical Dance Festival — December, renowned classical performers against the illuminated 15th-century fortress.", status: "seasonal" },
        ],
      },
    },
    {
      key: "things_to_do",
      body: {
        items: [
          { body: "Spend a night under the stars in the Thar Desert at Sam or Khuri dunes, complete with camel treks and soulful Kalbelia folk performances." },
          { body: "Track Royal Bengal Tigers in Ranthambore National Park across early morning and late afternoon Gypsy game drives." },
          { body: "Walk the battlements of Mehrangarh Fort in Jodhpur, admiring royal howdahs, miniature paintings, and the blue old city panorama." },
          { body: "Take a sunset boat cruise on Lake Pichola in Udaipur, gliding past the illuminated Lake Palace and Jag Mandir." },
          { body: "Climb through the fortified gateways of Amer Fort and discover the mirror-inlaid Sheesh Mahal and subterranean tunnels leading to Jaigarh." },
          { body: "Descend the dizzying geometric steps of Chand Baori in Abhaneri, an 8th-century architectural masterpiece 13 storeys deep." },
          { body: "Float above the Aravalli hills and Amer Fort in a sunrise hot air balloon over Jaipur's rural perimeter." },
          { body: "Explore the fresco-painted merchant mansions of Shekhawati in Mandawa and Nawalgarh, capturing century-old pigment murals." },
        ],
      },
    },
    {
      key: "best_time",
      body: {
        text: "Winter (October–March): The ideal season across the state. Daytime temperatures remain pleasant between 18°C and 28°C, with crisp sunny skies perfect for exploring sun-baked stone forts and city markets. Nights in the open desert (Jaisalmer, Bikaner) drop sharply to 4°C–8°C, requiring warm jackets. This is the peak season for major cultural fairs including the Pushkar Camel Fair and the Jaisalmer Desert Festival.\n\nSummer (April–June): Arid and scorching. Temperatures routinely soar between 40°C and 48°C across the desert plains, accompanied by dry, hot winds known locally as the 'Loo'. Sightseeing must be confined to the early mornings (6:00 AM to 9:30 AM) and after sunset. While general tourism dwindles, wildlife enthusiasts visit Ranthambore as tiger sightings spike around drying watering holes. Mount Abu offers a cooler hill respite.\n\nMonsoon (July–September): Southern Rajasthan and Mewar undergo a dramatic green rejuvenation. Udaipur's lakes fill up, seasonal waterfalls cascade off the Aravalli hills around Kumbhalgarh, and temperatures drop to a comfortable 28°C–34°C. While humidity rises, rainfall is generally moderate compared to coastal India. The Teej and Gangaur monsoon festivals bring vibrant royal processions to Jaipur.",
      },
    },
    {
      key: "how_to_reach",
      body: {
        text: "By air: Rajasthan is served by major domestic and international airports. Jaipur International Airport (JAI) has daily direct connections with Delhi, Mumbai, Bengaluru, Hyderabad, and Kolkata, as well as direct flights to Dubai and Sharjah. Maharana Pratap Airport in Udaipur (UDR) and Jodhpur Airport (JDH) operate heavy daily schedules to Delhi and Mumbai. Seasonal domestic flights link Jaisalmer (JSA) from October to March, while Kishangarh Airport (KQH) connects Ajmer and Pushkar.\n\nBy rail: The state has a comprehensive broad-gauge railway network operated by North Western Railway. The semi-high-speed Vande Bharat Express connects Delhi Cantonment to Jaipur and Ajmer in under 4.5 hours. Daily Shatabdi, Rajdhani, and express trains link Delhi, Mumbai, and Kolkata with Jaipur, Jodhpur, Bikaner, and Udaipur. The legendary luxury heritage train Palace on Wheels offers week-long curated circuits through the state's royal hubs.\n\nBy road: The high-speed Delhi–Mumbai Expressway (NE-4) connects New Delhi to Jaipur and Dausa in approximately 3.5 hours. National Highway 48 (NH-48) provides a multi-lane expressway corridor linking Delhi, Jaipur, Ajmer, and Udaipur into Gujarat. Rajasthan State Road Transport Corporation (RSRTC) and private operators run comfortable Volvo and Scania air-conditioned multi-axle sleeper buses round the clock between Delhi (ISBT Kashmiri Gate, Bikaner House) and all major Rajasthani cities.",
      },
    },
    {
      key: "local_transport",
      body: {
        text: "Hiring an air-conditioned private taxi with an experienced driver is the most popular, reliable way to navigate Rajasthan's intercity circuits (such as Jaipur–Jodhpur–Udaipur), allowing spontaneous stops at rural stepwells, fort ruins, and dhabas. Pre-agree on all-inclusive daily rates covering fuel, tolls, and driver allowances.\n\nFor intercity hops between far-apart desert towns, superfast trains (such as the Jodhpur–Jaisalmer Express) are comfortable, reliable, and scenic.\n\nInside cities: Jaipur features a clean, elevated-and-underground Metro line linking Mansarovar directly to Badi Chaupar at the edge of the historic Pink City. Auto-rickshaws, e-rickshaws, and app-based cabs (Uber and Ola) operate widely in Jaipur, Udaipur, and Jodhpur. In historic quarters—including Jaipur's walled bazaars, Jodhpur's blue Navchokiya lanes, and Jaisalmer's living fort—walking is the only way to navigate narrow cobblestone alleys.",
      },
    },
    {
      key: "where_to_stay",
      body: {
        text: "In Jaipur: Stay in heritage havelis in Bani Park, Civil Lines, or C-Scheme for peaceful, authentic atmosphere away from bazaar traffic; luxury travellers can choose converted royal estates such as the Rambagh Palace or Jai Mahal Palace.\n\nIn Udaipur: The eastern banks of Lake Pichola (Lal Ghat, Chandpole, and Hanuman Ghat) provide boutique havelis and rooftop dining overlooking the water; romantic luxury options include island palace retreats like the Taj Lake Palace and Jagmandir.\n\nIn Jodhpur: Boutique guesthouses within the blue-painted lanes of Navchokiya and the Clock Tower district offer direct views of towering Mehrangarh; upscale resorts and royal suites are clustered around Ratanada and Umaid Bhawan.\n\nIn Jaisalmer: Choose atmospheric golden-stone heritage rooms inside the living Fort or along the outer perimeter bastions; for desert nights, book licensed Swiss luxury camps on the fringes of Sam or Khuri dunes.\n\nIn Ranthambore: Eco-lodges, boutique jungle camps, and luxury tented resorts line Ranthambore Road in Sawai Madhopur, well situated for early morning safari departures.",
      },
    },
    {
      key: "itinerary",
      body: {
        items: [
          {
            title: "Day 1–3: The Golden Triangle Gateway — Jaipur",
            body: "Arrive in Jaipur via the expressway or airport. Day 1: Explore the Pink City, visiting Hawa Mahal, City Palace, and Jantar Mantar observatory, followed by evening tea at Nahargarh Fort. Day 2: Ascend Amer Fort in the morning, tour Jaigarh's ancient cannon foundry, and visit Panna Meena stepwell. Day 3: Shop for block prints in Johari and Bapu Bazaars, and taste authentic Pyaaz Kachoris.",
          },
          {
            title: "Day 4–5: The Blue Citadel & Desert Gates — Jodhpur",
            body: "Board an early morning express train or take a scenic drive to Jodhpur (330 km, 5.5 hrs). Day 4: Check into a blue-quarter haveli and tour the museum and battlements of Mehrangarh Fort before sunset at Jaswant Thada. Day 5: Wander the indigo lanes of Navchokiya, sample Makhania Lassi at the Clock Tower, and explore the cenotaphs of Mandore Gardens.",
          },
          {
            title: "Day 6–7: White Marble & Lake Romance — Udaipur",
            body: "Drive south to Udaipur via the 15th-century marble marvel of Ranakpur Jain Temple (260 km, 5 hrs). Day 6: Tour the vast courtyards of the City Palace and take an evening boat cruise on Lake Pichola past Jag Mandir. Day 7: Visit Saheliyon-ki-Bari, watch a traditional Dharohar folk dance at Bagore Ki Haveli, and watch the sun dip below the Aravallis from Sajjangarh Monsoon Palace.",
          },
        ],
      },
    },
    {
      key: "budget",
      body: {
        text: "Estimates assume a comfortable mid-range traveller visiting major heritage sights, dining in vetted restaurants, and taking private cabs for intercity segments during the peak winter season (October–March). Summer and monsoon rates are 25–40% lower.",
        items: [
          { title: "Heritage haveli hotel (mid-range)", body: "₹3,500–₹8,000 per night for an authentic heritage room with breakfast" },
          { title: "Luxury palace suite", body: "₹25,000–₹75,000+ per night at converted royal palace properties" },
          { title: "Daily meals & dining", body: "₹800–₹2,000 per person per day for local thalis and rooftop dining" },
          { title: "Chauffeured car rental (intercity)", body: "₹3,500–₹5,000 per day for an air-conditioned sedan including fuel and tolls" },
          { title: "Jaipur Composite Monument Ticket", body: "₹400 for Indians / ₹1,000 for foreign visitors (valid 2 days across 6 monuments)" },
          { title: "Ranthambore Tiger Safari", body: "₹1,200–₹1,800 (Canter seat) / ₹2,000–₹3,200 (Gypsy seat) via official SSO portal" },
          { title: "Thar Desert camel & dune safari", body: "₹1,500–₹3,500 per person including sunset ride and cultural dinner" },
        ],
      },
    },
    {
      key: "food",
      body: {
        items: [
          { body: "Dal Baati Churma: Crisp whole-wheat dough balls baked over charcoal, dipped in pure ghee, and served with spicy mixed lentils and sweet powdered churma." },
          { body: "Laal Maas: A legendary royal Rajput mutton curry slow-cooked with fiery, smoked Mathania red chillies and fragrant whole spices." },
          { body: "Ker Sangri: A quintessential desert delicacy made from dried wild beans (sangri) and desert berries (ker) stir-fried with mustard oil and spices." },
          { body: "Gatte ki Sabzi: Tender gram flour (besan) dumplings simmered in a spiced, tangy yogurt-based gravy, best enjoyed with hot rotis." },
          { body: "Pyaaz Kachori: Golden, flaky deep-fried pastry generously stuffed with spicy, caramelized onion filling; an iconic Jaipur breakfast staple." },
          { body: "Ghevar: A disc-shaped honeycomb sweet made from flour and ghee, soaked in saffron sugar syrup and topped with rich mawa and dry fruits." },
        ],
      },
    },
    {
      key: "culture_etiquette",
      body: {
        items: [
          { body: "Dress modestly when visiting active temples (such as Brahma Temple in Pushkar or Eklingji), ensuring shoulders and knees are covered, and remove footwear outside." },
          { body: "Always ask permission before photographing local residents, folk artists, and women in rural villages and desert settlements." },
          { body: "Negotiate taxi and auto-rickshaw fares politely prior to starting the journey, or insist on app-based booking where available." },
          { body: "Respect holy water bodies: avoid washing clothes, swimming, or wearing leather accessories around the sacred ghats of Pushkar and Lake Pichola." },
          { body: "Support traditional master artisans directly by purchasing block prints, blue pottery, and miniature paintings from certified cooperative workshops rather than tour-commission shops." },
        ],
      },
    },
    {
      key: "practical_info",
      body: {
        items: [
          { title: "Visas", body: "Foreign visitors must possess a valid passport with at least 6 months validity and an Indian e-Visa applied online at least 4 days prior to travel.", status: "verified" },
          { title: "Currency & UPI", body: "Indian Rupee (INR). Digital payments via UPI QR codes are universally accepted even in small street stalls; carry cash for remote desert dunes and rural toll gates.", status: "verified" },
          { title: "Mobile connectivity", body: "Jio and Airtel provide excellent 5G and 4G coverage across all towns and highways; connectivity drops only in remote pockets of deep Thar sand dunes.", status: "verified" },
          { title: "Border permits (ILP)", body: "Indian and foreign tourists do not need permits for standard tourist cities. An Inner Line Permit (ILP) from the Jaisalmer District Magistrate / BSF is required only for visits to restricted border posts like Longewala and Tanot.", status: "verified" },
        ],
      },
    },
    {
      key: "safety_health",
      body: {
        items: [
          { title: "Emergency numbers", body: "Dial 112 for all-in-one Police, Fire and Ambulance emergencies. Dial 1363 for the national multi-lingual 24x7 Tourist Helpline.", status: "verified" },
          { title: "Heat & hydration", body: "Even in winter, the midday desert sun is strong. Carry drinking water, wear wide-brimmed hats and sunglasses, and hydrate frequently with fresh lime water (nimbu pani).", status: "verified" },
          { title: "Drinking water", body: "Drink only bottled mineral water with unbroken seals or water filtered by reverse osmosis (RO); avoid tap water and unpasteurized raw juices from roadside carts.", status: "verified" },
          { title: "Common scams", body: "Politely decline unsolicited 'gemstone export deals' in Jaipur and persistent self-proclaimed priests pushing overpriced blessing rituals (*puja*) at Pushkar ghats.", status: "verified" },
        ],
      },
    },
    {
      key: "faqs",
      body: {
        items: [
          {
            title: "How many days are recommended for a first trip to Rajasthan?",
            body: "For a first visit, 7 to 9 days is recommended to comfortably cover the 'Classic Triangle' of Jaipur, Jodhpur, and Udaipur without feeling rushed. If you wish to include Jaisalmer's desert dunes and a tiger safari at Ranthambore, plan a 12 to 14-day overland journey.",
          },
          {
            title: "What is the best way to travel between cities in Rajasthan?",
            body: "For multi-city routes like Jaipur–Jodhpur–Udaipur, hiring a private air-conditioned car with a professional driver provides maximum flexibility to visit en-route attractions like Ranakpur, Kumbhalgarh, or Chand Baori. Fast intercity trains (like Vande Bharat and express lines) are also comfortable and punctual.",
          },
          {
            title: "Is Rajasthan safe for solo female travellers?",
            body: "Yes, Rajasthan is one of India's most visited states and is accustomed to international and solo travellers. Use registered prepaid transport, dress respectfully in conservative rural areas, stay in reputed heritage havelis, and avoid wandering poorly lit desert or bazaar alleys late at night.",
          },
          {
            title: "Can you visit the Thar Desert without taking a touristy camel tour?",
            body: "Yes. While Sam Sand Dunes is famous for commercial camel rides and loud evening camp shows, quieter and more pristine dunes can be found around Khuri village (50 km from Jaisalmer) and Osian (near Jodhpur), offering authentic stargazing and peaceful desert walks.",
          },
          {
            title: "Do I need to book Ranthambore tiger safaris in advance?",
            body: "Yes, advance booking is critical. Forest Department safari permits for Ranthambore (especially core Zones 1 through 5) open 90 days in advance on the official Rajasthan SSO portal and sell out rapidly for peak winter weekends.",
          },
        ],
      },
    },
  ];

  // 5. Upsert all sections into the DB
  for (const s of allSections) {
    const [existing] = await db.select().from(sections).where(and(eq(sections.placeId, raj.id), eq(sections.key, s.key))).limit(1);
    if (existing) {
      await db.update(sections).set({ body: s.body, status: "approved", updatedAt: new Date() }).where(eq(sections.id, existing.id));
      console.log(`  Updated section: ${s.key}`);
    } else {
      await db.insert(sections).values({ placeId: raj.id, key: s.key, body: s.body, status: "approved", locked: false });
      console.log(`  Inserted section: ${s.key}`);
    }
  }

  // 6. Get Hero Image for Rajasthan
  const [heroRow] = raj.heroMediaId ? await db.select().from(media).where(eq(media.id, raj.heroMediaId)).limit(1) : [];
  const heroImage: SnapshotImage = heroRow
    ? {
        url: heroRow.url,
        alt: heroRow.alt,
        caption: heroRow.caption,
        kind: heroRow.kind,
        license: heroRow.license,
        licenseUrl: heroRow.licenseUrl,
        attribution: heroRow.attribution,
        sourceUrl: heroRow.sourceUrl,
      }
    : {
        url: "https://gilubn4ezj1jsudg.public.blob.vercel-storage.com/places/rajasthan/a2ad2a04-2542-4afa-bc8b-5a3de2f89a30-8JtztNI3t5ezWozbzgbvQRpxQXGTN8.jpg",
        alt: "Aerial view of Amer Fort on its hillside above Maota Lake near Jaipur, Rajasthan",
        caption: "Amer Fort above Maota Lake, Jaipur",
        kind: "photo",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        attribution: "APS Kondhera via Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:A_bird_eye_view_of_Amer_Fort_Jaipur,_India.jpg",
      };

  // 7. Build Frozen Published Snapshot
  console.log("\n--- Building and Publishing Rajasthan State Snapshot ---");
  const stateSnapshot = {
    place: {
      id: raj.id,
      kind: "state",
      name: "Rajasthan",
      slug: "rajasthan",
      summary: "India's largest state: the hill forts of Jaipur, the blue alleys of Jodhpur, the romantic lakes of Udaipur, the Thar Desert of Jaisalmer, and tiger country at Ranthambore.",
      lat: 26.5728,
      lng: 73.8389,
      seoTitle: "Rajasthan Travel Guide: Forts, Palaces, Desert & Lakes",
      seoDescription: "Plan a trip to Rajasthan: Jaipur's pink city & hill forts, Udaipur's lakes, Jodhpur's blue city, Jaisalmer dunes, Ranthambore tigers, best time, and practical info.",
      state: null,
      parent: null,
      displayMode: "page",
      hero: heroImage,
    },
    sections: allSections.map((s) => ({
      key: s.key,
      body: s.body,
    })),
  };

  // Check version count
  const versions = await db.select({ version: placeVersions.version }).from(placeVersions).where(eq(placeVersions.placeId, raj.id));
  const nextVer = (versions.length ? Math.max(...versions.map((v) => v.version)) : 0) + 1;

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
  await db.insert(searchDocuments).values({ placeId: raj.id, ...doc }).onConflictDoUpdate({ target: searchDocuments.placeId, set: doc });

  console.log(`\n🎉 Success! Rajasthan state published version ${nextVer} (id: ${pvRow.id}) with all 16 sections!`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

