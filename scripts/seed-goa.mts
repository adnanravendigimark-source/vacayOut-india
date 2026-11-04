import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import {
  media,
  places,
  placeVersions,
  searchDocuments,
  sections,
  itineraries,
  type SnapshotImage,
  type ItemStatus,
  type SectionSource,
} from "../src/lib/db/schema.js";
import { storeImage } from "../src/lib/media/storage.js";
import { sniffImage, EXT } from "../src/lib/media/sniff.js";
import { snapshotText } from "../src/lib/places/publish.js";

const REGION_PROMPTS = [
  {
    title: "North Goa: Candolim to Anjuna",
    prompt:
      "A painterly travel-poster illustration of North Goa's golden coast, showing the historic 17th-century stone lighthouse and ramparts of Fort Aguada overlooking the Arabian Sea, with Calangute and Baga beach shacks under swaying coconut palm trees in warm golden sunset light. Vintage travel poster aesthetic, vibrant ocean colors, no text, no people in foreground.",
    alt: "Illustration of Fort Aguada lighthouse overlooking the Arabian Sea and North Goa palm-fringed beaches",
    caption: "North Goa: Candolim to Anjuna",
    body: "One long beach from Sinquerim below Fort Aguada through Candolim and Calangute to Baga — water sports, shacks and nightlife — then rocky Anjuna and Vagator under Chapora Fort.",
  },
  {
    title: "Pernem: Morjim to Arambol",
    prompt:
      "A painterly travel-poster illustration of peaceful Pernem in northern Goa, showing the sweeping wide quiet sands of Morjim and Mandrem beaches where sea turtles nest, with the freshwater sweet lake of Arambol nestled beneath red laterite sea cliffs under soft pastel twilight sky. Artistic vintage travel poster style, no text, no people in foreground.",
    alt: "Illustration of peaceful Morjim beach and Arambol sweet water lake cliffs in Pernem",
    caption: "Pernem: Morjim to Arambol",
    body: "Quieter beaches north of the Chapora river: Morjim and Mandrem, where Olive Ridley turtles nest, Ashwem with no water sports, and Arambol's yoga and sunset crowd.",
  },
  {
    title: "Panaji and Old Goa",
    prompt:
      "A painterly travel-poster illustration of historic Goa, showing the dazzling whitewashed Baroque facade of Our Lady of the Immaculate Conception Church above zigzag steps in Panaji, with colorful Portuguese-era houses of Fontainhas and the ancient red laterite Basilica of Bom Jesus in Old Goa. Vintage travel poster aesthetic, no text, no people in foreground.",
    alt: "Illustration of Immaculate Conception Church Panaji and UNESCO churches of Old Goa",
    caption: "Panaji & Old Goa",
    body: "The capital on the Mandovi — with Fontainhas Latin Quarter and Miramar beach, and the UNESCO churches of Old Goa about 9 km upriver including Basilica of Bom Jesus; ferries cross to Divar Island.",
  },
  {
    title: "Salcete: Margao and Colva",
    prompt:
      "A painterly travel-poster illustration of Salcete in South Goa, showing the expansive pristine white sand beach of Colva and Benaulim with traditional wooden fishing outrigger boats resting on the shore, Portuguese heritage mansions, and endless coconut groves under a gentle tropical sky. Vintage poster style, serene coastal aesthetic, no text.",
    alt: "Illustration of Colva and Benaulim wide white sand beaches with fishing outriggers in Salcete",
    caption: "Salcete: Margao & Colva",
    body: "Goa's commercial capital Margao, and the wide South Goa beaches of Colva, Benaulim, Varca and Cavelossim, with traditional fishing heritage and dolphin trips along the Sal river.",
  },
  {
    title: "Canacona: Palolem and Agonda",
    prompt:
      "A painterly travel-poster illustration of Canacona in far South Goa, showing the sheltered crescent bay of Palolem with colorful rustic wooden beach huts nestled under leaning coconut palms, calm turquoise waters, and dramatic green coastal headlands of Agonda. Vintage travel poster aesthetic, tropical paradise colors, no text.",
    alt: "Illustration of Palolem crescent bay and colourful beach huts in Canacona South Goa",
    caption: "Canacona: Palolem & Agonda",
    body: "The far south in the Kushavati region: the calm crescent bay at Palolem, quiet Patnem and Agonda, the turtle nesting beach at Galgibaga, and the cliff-top ruins of Cabo de Rama Fort.",
  },
  {
    title: "The Hinterland: Ghats & Dudhsagar",
    prompt:
      "A painterly travel-poster illustration of the lush Goan Western Ghats hinterland, showing the immense four-tiered milky-white cascade of Dudhsagar Waterfalls plunging through dense emerald tropical rainforest and mist-clad mountain cliffs of Bhagwan Mahavir Wildlife Sanctuary with a stone railway viaduct. Dramatic vintage travel poster aesthetic, no text.",
    alt: "Illustration of Dudhsagar Waterfalls roaring through lush green Western Ghats jungle",
    caption: "The Hinterland: Ghats & Dudhsagar",
    body: "Ponda's ancient spice plantations and Mangueshi temple, Bhagwan Mahavir Sanctuary and Mollem National Park with the 310-metre Dudhsagar Falls on the eastern mountain border, and Bondla forest reserve.",
  },
];

async function generateImage(prompt: string): Promise<Uint8Array> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
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
    const text = await res.text();
    throw new Error(`Image API failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as any;
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("No b64_json in response");
  return Buffer.from(b64, "base64");
}

async function main() {
  const db = getDb();

  const [goa] = await db.select().from(places).where(eq(places.slug, "goa")).limit(1);
  if (!goa) throw new Error("Goa place not found!");
  console.log(`Found Goa place: id=${goa.id}`);

  // Fetch current media for Goa hero
  const [goaHeroMedia] = goa.heroMediaId
    ? await db.select().from(media).where(eq(media.id, goa.heroMediaId)).limit(1)
    : [];

  // ==========================================
  // 1. GENERATE REGION ILLUSTRATIONS & UPLOAD
  // ==========================================
  console.log("\n--- Generating Region Illustrations for Goa ---");
  const regionItems = [];

  for (const r of REGION_PROMPTS) {
    console.log(`Generating artwork for: ${r.title}...`);
    try {
      const bytes = await generateImage(r.prompt);
      const type = sniffImage(bytes) || "image/jpeg";
      const slugKey = r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const stored = await storeImage(`places/goa/regions/${slugKey}-${crypto.randomUUID()}.${EXT[type]}`, bytes, type);
      console.log(`  Uploaded to Vercel Blob: ${stored.url}`);

      const [mediaRow] = await db
        .insert(media)
        .values({
          placeId: goa.id,
          url: stored.url,
          storageKey: stored.storageKey,
          contentType: type,
          bytes: bytes.length,
          kind: "ai_generated",
          alt: r.alt,
          caption: r.caption,
          license: "Antigravity Generated",
          attribution: "VacayOut Original Artwork",
          sourceUrl: "https://vacayout.com",
        })
        .returning();

      regionItems.push({
        title: r.title,
        body: r.body,
        status: "verified" as ItemStatus,
        image: {
          url: stored.url,
          alt: r.alt,
          caption: r.caption,
          kind: "ai_generated" as const,
          license: "Antigravity Generated",
          attribution: "VacayOut Original Artwork",
          sourceUrl: "https://vacayout.com",
        },
      });
    } catch (e) {
      console.error(`  Failed generating ${r.title}:`, e);
      regionItems.push({
        title: r.title,
        body: r.body,
        status: "verified" as ItemStatus,
      });
    }
  }

  // ==========================================
  // 2. DEFINE ALL 16 SECTIONS FOR GOA
  // ==========================================
  const allSectionsData = [
    {
      key: "overview",
      body: {
        text: "Goa is India's smallest state by area, hugging 103 kilometres of Arabian Sea coastline between Maharashtra and Karnataka, sheltered to the east by the biodiverse ridges of the Western Ghats. For 451 years—from Alfonso de Albuquerque's 1510 conquest until Operation Vijay in 1961—Goa served as the viceregal capital of Portugal's Estado da Índia, forging a distinctive Indo-Portuguese cultural synthesis found nowhere else on the subcontinent.\n\nTravellers generally divide their journeys between two coastal halves separated by the Mandovi and Zuari river estuaries: North Goa is celebrated for its bustling beach shack culture, water sports, vibrant weekly flea markets, and energetic nightlife stretching from Candolim through Calangute to Arambol; South Goa offers tranquil, palm-shaded white sand expanses, boutique beach huts, traditional fishing villages, and peaceful luxury resorts around Colva, Benaulim, and Palolem.\n\nInland, Goa reveals an equally captivating character: the UNESCO-listed Baroque basilicas of Old Goa housing the sacred relics of St. Francis Xavier, the pastel-colored Portuguese mansions of Panaji's Latin Quarter (Fontainhas), centuries-old organic spice plantations in Ponda, and the roaring four-tiered Dudhsagar Falls cascading 310 metres through Mollem National Park.",
      },
    },
    {
      key: "key_facts",
      body: {
        items: [
          { title: "Best time to visit", body: "November to March for sunny beach weather; June to September for monsoon greenery & waterfalls.", status: "seasonal" as ItemStatus },
          { title: "Trip length", body: "Plan 4–5 days for North or South coast; 7–8 days to explore both halves with Old Goa & waterfalls.", status: "verified" as ItemStatus },
          { title: "Airports", body: "Manohar International Airport at Mopa (GOX) in North Goa; Dabolim Airport (GOI) in South Goa.", status: "verified" as ItemStatus },
          { title: "Railway hubs", body: "Madgaon Junction (MAO) for South Goa & express routes; Thivim (THVM) for North Goa beaches; Karmali (KRMI) for Panaji & Old Goa.", status: "verified" as ItemStatus },
          { title: "State capital", body: "Panaji (Panjim), situated along the Mandovi River estuary.", status: "verified" as ItemStatus },
          { title: "Official language", body: "Konkani (written in Devanagari script); English and Hindi are widely spoken and understood throughout.", status: "verified" as ItemStatus },
          { title: "State coastline", body: "103 km of Arabian Sea coastline, featuring over 30 distinct beaches across two coastal districts.", status: "verified" as ItemStatus },
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
          { title: "UNESCO Heritage of Old Goa", body: "Marvel at the 16th-century Basilica of Bom Jesus, the monumental Se Cathedral, and the Church of St. Francis of Assisi.", status: "verified" as ItemStatus },
          { title: "Fort Aguada & Lighthouse", body: "1612 Portuguese coastal fortress with a 79-gun battery and freshwater spring overlooking Sinquerim Bay.", status: "verified" as ItemStatus },
          { title: "Dudhsagar Waterfalls", body: "One of India's tallest multi-tiered cascades, plunging 310 metres through the misty Western Ghats jungle.", status: "verified" as ItemStatus },
          { title: "Palolem Beach Crescent", body: "Sheltered, calm crescent bay ideal for sea kayaking, dolphin boat trips, and barefoot beachfront dining.", status: "verified" as ItemStatus },
          { title: "Fontainhas Latin Quarter", body: "Asia's only surviving Portuguese Latin quarter, featuring narrow cobblestone lanes, terracotta-tiled roofs, and azulejos ceramic tiles.", status: "verified" as ItemStatus },
          { title: "Flea & Night Markets", body: "The famous Wednesday Anjuna flea market and Saturday Night Market at Arpora with live music and artisanal crafts.", status: "seasonal" as ItemStatus },
        ],
      },
    },
    {
      key: "things_to_do",
      body: {
        items: [
          { title: "Water Sports along Calangute & Baga", body: "Parasailing, jet skiing, banana boat rides, and bumper rides operated by licensed operators.", status: "seasonal" as ItemStatus },
          { title: "Heritage Walk in Fontainhas, Panaji", body: "Wander through colorful 18th-century Portuguese homes, historic bakeries, and art galleries.", status: "verified" as ItemStatus },
          { title: "Scuba Diving at Grande Island", body: "Explore underwater coral reefs and shipwrecks with certified PADI dive operators from Sinquerim or Dona Paula.", status: "seasonal" as ItemStatus },
          { title: "Spice Plantation Tour & Goan Buffet", body: "Walk through Sahakari or Pascoal spice farms in Ponda, smelling fresh cardamom, vanilla, and peri-peri chillies.", status: "verified" as ItemStatus },
          { title: "Mandovi River Sunset Cruise", body: "Evening cruises featuring live Goan Dekhni folk dancing, Konkani music, and sunset views over the Arabian Sea.", status: "verified" as ItemStatus },
          { title: "Olive Ridley Turtle Nesting at Morjim", body: "Witness protected sea turtle nesting sites at Morjim, Mandrem, and Galgibaga during winter months.", status: "seasonal" as ItemStatus },
        ],
      },
    },
    {
      key: "best_time",
      body: {
        text: "Winter (November to March): The peak travel season. Days are warm, dry, and sunny with comfortable sea breezes (28°C–32°C), while evenings cool down to 20°C–22°C. Sea conditions are safe for swimming and all water sports, beach shacks, and night markets operate at full swing.\n\nMonsoon (June to September): A magical green transformation. Torrential tropical downpours breathe life into the Western Ghats; Dudhsagar Falls roars at maximum volume, paddy fields turn vivid emerald, and hotel rates plunge by 40%–60%. Swimming in the sea is strictly prohibited due to dangerous rip currents and high waves.\n\nSummer / Pre-Monsoon (April to May): Warm and humid with daytime temperatures reaching 34°C–36°C. Excellent for budget travellers and water babies who prefer quiet beaches before the monsoon rains arrive.",
      },
    },
    {
      key: "how_to_reach",
      body: {
        text: "By air: Goa is served by two international airports: Manohar International Airport at Mopa (GOX) in North Goa (35 km from Calangute/Anjuna), and Dabolim Airport (GOI) in South Goa (28 km from Panaji, 30 km from Colva). Both handle direct domestic flights from Delhi, Mumbai, Bengaluru, Hyderabad, Chennai, and Kolkata, plus seasonal charters from Europe and the Gulf.\n\nBy rail: The scenic Konkan Railway connects Goa across western India. Madgaon Junction (MAO) in South Goa is the main stop for superfast trains including Mumbai–Goa Vande Bharat Express (7.5 hrs), Tejas Express, and Mangalore/Kerala services. Thivim (THVM) serves North Goa beaches (18 km from Baga), while Karmali (KRMI) sits 12 km from Panaji.\n\nBy road: Goa connects via National Highway 66 (NH-66) north to Mumbai (590 km, 10–11 hrs) and south to Kochi; National Highway 748 (NH-748) links east across Anmod Ghat to Belagavi and Bengaluru (560 km, 10 hrs). Kadamba Transport Corporation (KTC) and private operators run daily AC sleeper coaches from Mumbai, Pune, and Bengaluru.",
      },
    },
    {
      key: "local_transport",
      body: {
        text: "Renting a scooter or motorcycle (Honda Activa, Royal Enfield) is Goa's most popular transport mode, costing ₹300–₹500 per day (petrol extra). Always carry a valid driving licence and wear a helmet—Goa Traffic Police strictly fine violators.\n\nGoaMiles is the state-regulated app-based taxi service offering transparent metered fares across both airports, railway stations, and major tourist hubs. Traditional private tourist taxis do not use meters; always negotiate and agree on the fare before starting.\n\nKadamba Transport Corporation (KTC) buses operate frequent, inexpensive public bus routes connecting Panaji, Mapusa, Margao, Vasco, and Ponda. Yellow-and-black motorcycle pilots offer unique, low-cost single-passenger pillion rides for short hops. Free state-run vehicle ferries cross estuaries like Mandovi to Betim, Ribandar to Chorao Island, and Old Goa to Divar Island.",
      },
    },
    {
      key: "where_to_stay",
      body: {
        text: "North Goa (Candolim, Calangute, Baga): Best for first-timers, families, and party-goers who want walking access to beach shacks, lively water sports, supermarkets, and restaurants.\n\nNorth Coast / Pernem (Anjuna, Vagator, Morjim, Arambol): Favoured by digital nomads, backpackers, yoga enthusiasts, and nightlife lovers who enjoy cliff-top sunset bars and boho cafes.\n\nSouth Goa (Colva, Benaulim, Varca, Cavelossim, Palolem): Best for couples, honeymooners, and travellers seeking peace, uncrowded white sand beaches, and five-star luxury resorts (Taj Exotica, The Leela, Alila Diwa).\n\nPanaji & Fontainhas: Ideal for heritage and culture lovers who appreciate boutique Indo-Portuguese heritage guesthouses, walking access to art galleries, and waterfront dining.",
      },
    },
    {
      key: "itinerary",
      body: {
        text: "3-Day Highlights: Day 1 in Panaji & UNESCO Old Goa churches; Day 2 exploring Fort Aguada, Calangute, and Anjuna sunset; Day 3 day-trip to Dudhsagar Waterfalls or a southern beach relaxing at Colva.\n\n5-Day Balanced Coast: Spend 3 days based in North Goa (Candolim/Anjuna) for forts, water sports, and markets; transfer south for 2 nights at Palolem or Benaulim for quiet beach sunsets and sea kayaking.\n\n7-Day Grand Goa Loop: 3 nights North Goa (beaches, Aguada, Chapora, nightlife), 1 night Panaji Latin Quarter (heritage walk, dining, casino cruise), 2 nights South Goa (Palolem, Cabo de Rama, Agonda), and 1 night inland at a Ponda spice plantation or Mollem nature resort.",
      },
    },
    {
      key: "budget",
      body: {
        text: "Budget Backpacker: ₹1,800 – ₹3,000 ($22 – $36 / day). Clean hostel dorms or budget beach huts, scooter rental, beach shack thalis, and local KTC buses.\n\nComfortable Mid-Range: ₹5,500 – ₹10,000 ($66 – $120 / day). 3-star boutique heritage hotel or resort with pool and breakfast, rental car or GoaMiles cabs, water sports, multi-cuisine dining, and evening beach bar drinks.\n\nLuxury Beachfront: ₹20,000 – ₹55,000+ ($240 – $660+ / day). 5-star beachfront resorts (Taj, Leela, St. Regis, W Goa), private chauffeured SUV, fine-dining Portuguese restaurants, private catamaran charters, and spa treatments.",
      },
    },
    {
      key: "food",
      body: {
        items: [
          { title: "Goan Fish Curry Rice", body: "The quintessential daily meal: Kingfish or pomfret simmered in a tangy coconut, red chilli, and kokum gravy, served with hot rice and kismoor.", status: "verified" as ItemStatus },
          { title: "Pork / Chicken Vindaloo", body: "World-famous dish originating from the Portuguese 'vinha d'alhos', meat marinated in palm vinegar, garlic, ginger, and Kashmiri chillies.", status: "verified" as ItemStatus },
          { title: "Chicken Cafreal", body: "Spicy pan-fried chicken marinated in a vibrant green paste of fresh coriander, green chillies, cloves, cinnamon, and Goan vinegar.", status: "verified" as ItemStatus },
          { title: "Prawn Balchão", body: "Fiery, tangy pickled prawn relish made with dried red chillies, vinegar, and aromatics, eaten with steamed rice or crusty poi bread.", status: "verified" as ItemStatus },
          { title: "Bebinca", body: "Goa's celebrated traditional 7-to-16 layered dessert made with coconut milk, egg yolks, sugar, ghee, and flour, baked layer by layer.", status: "verified" as ItemStatus },
          { title: "Feni", body: "Indigenous Goan spirit distilled from fermented cashew apples (Cashew Feni) or coconut palm sap (Coconut Feni), holding a GI tag.", status: "verified" as ItemStatus },
        ],
      },
    },
    {
      key: "culture_etiquette",
      body: {
        items: [
          { title: "Church & Temple Dress Codes", body: "Cover shoulders and knees when visiting churches like Bom Jesus or temples like Mangueshi. Remove shoes before entering temple premises.", status: "verified" as ItemStatus },
          { title: "Beach Attire & Nudity Laws", body: "Swimwear is normal on beaches and around pools, but wearing bikinis or shirtless walking in village streets, markets, or town centers is offensive and frowned upon.", status: "verified" as ItemStatus },
          { title: "Public Alcohol & Smoking Ban", body: "Drinking alcohol, breaking bottles, and smoking on public beaches is strictly prohibited by law with fines up to ₹5,000. Consume alcohol only inside licensed beach shacks and restaurants.", status: "verified" as ItemStatus },
          { title: "Susegad Lifestyle", body: "Goa embraces 'susegad'—a relaxed, contented state of mind. Shops and small businesses often close for afternoon siesta between 1:30 PM and 4:00 PM.", status: "verified" as ItemStatus },
        ],
      },
    },
    {
      key: "practical_info",
      body: {
        items: [
          { title: "Emergency helpline", body: "Dial 112 for all police, fire, and medical emergencies across Goa.", status: "verified" as ItemStatus },
          { title: "Tourist Police & Assistance", body: "Dial 1364 for 24x7 Goa Tourism assistance and tourist grievance helpline.", status: "verified" as ItemStatus },
          { title: "Drishti Marine Lifeguards", body: "Over 600 trained lifesavers patrol Goa's beaches daily from 07:00 AM to sunset. Always heed their instructions and flag warnings.", status: "verified" as ItemStatus },
          { title: "Hospitals & Healthcare", body: "Goa Medical College (GMC) at Bambolim is the state's apex tertiary hospital; Manipal Hospital in Dona Paula and Victor Hospital in Margao offer private emergency care.", status: "verified" as ItemStatus },
          { title: "ATMs & Mobile Connectivity", body: "Jio, Airtel, and Vi provide excellent 4G/5G coverage across coastal and town areas. Deep forest reserves in Mollem have limited connectivity.", status: "verified" as ItemStatus },
        ],
      },
    },
    {
      key: "safety_health",
      body: {
        items: [
          { title: "Swim Only Between Flags", body: "Red-and-yellow flags indicate safe swimming zones patrolled by lifeguards. A solid Red Flag means NO SWIMMING due to lethal undertows.", status: "verified" as ItemStatus },
          { title: "Monsoon Sea Danger", body: "From June to late September, the Arabian Sea has violent swells and dangerous rip currents. Swimming is strictly banned on all beaches.", status: "seasonal" as ItemStatus },
          { title: "Helmet & Road Safety", body: "Wearing ISI-standard helmets is mandatory for both rider and pillion on two-wheelers. Never drink and drive; police set up night breathalyzer checkpoints.", status: "verified" as ItemStatus },
          { title: "Heat & Hydration", body: "Drink tender coconut water or bottled RO water frequently during hot afternoons; apply broad-spectrum sunscreen and wear sun hats.", status: "verified" as ItemStatus },
        ],
      },
    },
    {
      key: "faqs",
      body: {
        items: [
          { title: "Which is better for a holiday: North Goa or South Goa?", body: "North Goa suits travellers seeking vibrant nightlife, water sports, beach shacks, and shopping. South Goa is perfect for couples, families, and those seeking quiet, clean white sand beaches and luxury resorts.", status: "verified" as ItemStatus },
          { title: "What is the best way to get around Goa?", body: "Renting an automatic scooter (₹300–₹500/day) is ideal for solo travellers and couples. For families and groups, booking app-based GoaMiles taxis or hiring a private self-drive car is safest and most comfortable.", status: "verified" as ItemStatus },
          { title: "Is Goa safe for solo female travellers?", body: "Yes, Goa is widely regarded as one of India's safest destinations for solo women. Stick to populated, well-lit beaches, avoid walking isolated stretches alone after midnight, and use authorized taxis like GoaMiles.", status: "verified" as ItemStatus },
          { title: "Can I visit Dudhsagar Falls during the monsoon?", body: "Jeep safaris through the swollen sanctuary rivers to the base of the falls are closed during the heavy monsoon (June–Sept) for safety. However, you can see the roaring falls from train windows along the Madgaon–Londa railway line.", status: "seasonal" as ItemStatus },
        ],
      },
    },
  ];

  // Insert or update all 16 sections
  console.log("\n--- Seeding All 16 Sections for Goa ---");
  for (const s of allSectionsData) {
    const [existing] = await db
      .select({ id: sections.id })
      .from(sections)
      .where(and(eq(sections.placeId, goa.id), eq(sections.key, s.key)))
      .limit(1);

    if (existing) {
      await db
        .update(sections)
        .set({
          body: s.body as any,
          status: "approved",
          updatedAt: new Date(),
        })
        .where(eq(sections.id, existing.id));
      console.log(`Updated section: ${s.key}`);
    } else {
      await db.insert(sections).values({
        placeId: goa.id,
        key: s.key,
        body: s.body as any,
        status: "approved",
      });
      console.log(`Inserted section: ${s.key}`);
    }
  }

  // ==========================================
  // 3. BUILD AND PUBLISH SNAPSHOT V4 FOR GOA
  // ==========================================
  const nextVer = 4;
  console.log(`\n--- Publishing Goa Version ${nextVer} Snapshot ---`);

  const stateSnapshot = {
    place: {
      id: goa.id,
      kind: "state",
      name: "Goa",
      slug: "goa",
      summary:
        "India's sun-blessed tropical coast: golden beaches from Calangute to Palolem, UNESCO Baroque churches of Old Goa, Portuguese Latin quarters, and lush Western Ghats waterfalls.",
      seoTitle: "Goa Travel Guide: Best Beaches, Forts, Itineraries & Local Food",
      seoDescription:
        "The complete Goa travel guide: compare North vs South beaches, Old Goa heritage churches, Dudhsagar Falls, local transport, verified budgets, and ready-made itineraries.",
      lat: goa.lat ?? 15.2993,
      lng: goa.lng ?? 74.124,
      hero: goaHeroMedia
        ? {
            url: goaHeroMedia.url,
            alt: goaHeroMedia.alt,
            caption: goaHeroMedia.caption,
            kind: goaHeroMedia.kind,
            license: goaHeroMedia.license,
            attribution: goaHeroMedia.attribution,
            sourceUrl: goaHeroMedia.sourceUrl,
          }
        : null,
      parent: null,
    },
    sections: allSectionsData.map((s) => ({
      key: s.key,
      body: s.body,
      status: "approved",
      sources: [] as SectionSource[],
    })),
  };

  const [pvRow] = await db
    .insert(placeVersions)
    .values({
      placeId: goa.id,
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
    .where(eq(places.id, goa.id));

  // Update search document
  const doc = {
    versionId: pvRow.id,
    path: "/india/goa",
    name: "Goa",
    kind: "state",
    stateName: "Goa",
    content: snapshotText(stateSnapshot as any),
    updatedAt: new Date(),
  };
  await db
    .insert(searchDocuments)
    .values({ placeId: goa.id, ...doc })
    .onConflictDoUpdate({ target: searchDocuments.placeId, set: doc });

  console.log(`\n🎉 Success! Goa state published version ${nextVer} (id: ${pvRow.id}) with all 16 sections!`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
