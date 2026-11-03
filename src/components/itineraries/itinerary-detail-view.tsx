"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import type { ItinerarySnapshot } from "@/lib/db/schema";
import { routes } from "@/lib/routes";

export type RelatedItinerary = {
  slug: string;
  title: string;
  durationDays: number;
  summary: string;
  heroUrl?: string | null;
  stateSlug?: string | null;
};

interface Props {
  itinerary: ItinerarySnapshot & { publishedAt?: Date | null };
  stopLinks?: Record<string, string>;
  relatedItineraries?: RelatedItinerary[];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const SPITI_GPX_POINTS = [
  { name: "Shimla", lat: 31.1048, lon: 77.1734, ele: 2276, desc: "Expedition starting point; Mall Road & Ridge" },
  { name: "Narkanda / Hatu Peak", lat: 31.2589, lon: 77.4608, ele: 2708, desc: "Himalayan panoramic viewpoint and apple country" },
  { name: "Rampur Bushahr", lat: 31.4497, lon: 77.6300, ele: 1005, desc: "Padam Palace on the banks of Sutlej" },
  { name: "Taranda Dhank Cliff Road", lat: 31.5422, lon: 77.9867, ele: 1520, desc: "Kinnaur Gateway cliff-cut roadway" },
  { name: "Sangla (Baspa Valley)", lat: 31.4251, lon: 78.2570, ele: 2680, desc: "Baspa river, Kamru Fort & apple orchards" },
  { name: "Chitkul", lat: 31.3533, lon: 78.4357, ele: 3450, desc: "Last inhabited Indian village near Tibet border" },
  { name: "Reckong Peo", lat: 31.5398, lon: 78.2748, ele: 2290, desc: "District headquarters of Kinnaur; permit check" },
  { name: "Kalpa", lat: 31.5367, lon: 78.2562, ele: 2960, desc: "Direct vantage of sacred Kinner Kailash peak" },
  { name: "Pooh", lat: 31.7645, lon: 78.5878, ele: 2830, desc: "Orchards and apricot groves on NH-505" },
  { name: "Khab Confluence", lat: 31.8177, lon: 78.6508, ele: 2600, desc: "Confluence of turquoise Spiti & brown Sutlej rivers" },
  { name: "Nako Lake & Village", lat: 31.8797, lon: 78.6276, ele: 3625, desc: "High alpine lake with 11th-century monastery" },
  { name: "Chango / Malling Nallah", lat: 31.9542, lon: 78.5821, ele: 3200, desc: "Active scree zone crossing into upper Spiti" },
  { name: "Gue Mummy Monastery", lat: 31.9892, lon: 78.5284, ele: 3250, desc: "550-year-old preserved monk Sangha Tenzin" },
  { name: "Tabo Monastery", lat: 32.0953, lon: 78.3814, ele: 3280, desc: "Ajanta of the Himalayas, founded 996 CE" },
  { name: "Dhankar Monastery & Fort", lat: 32.0232, lon: 78.2144, ele: 3894, desc: "Perched cliff-edge fortress over Pin-Spiti confluence" },
  { name: "Pin Valley (Mudh Village)", lat: 31.9602, lon: 78.0345, ele: 3750, desc: "Snow leopard territory & ibex habitat" },
  { name: "Kaza (Sub-district Capital)", lat: 32.2276, lon: 78.0710, ele: 3800, desc: "Central expedition base, fuel station, health centre" },
  { name: "Key Monastery", lat: 32.2981, lon: 78.0125, ele: 4166, desc: "Fort-like 1,000-year Gelugpa Buddhist monastery" },
  { name: "Kibber Village", lat: 32.3328, lon: 78.0102, ele: 4270, desc: "High cold-desert village & wildlife reserve" },
  { name: "Chicham Suspension Bridge", lat: 32.3524, lon: 77.9942, ele: 4145, desc: "Asia's highest suspension gorge bridge (150 m deep)" },
  { name: "Hikkim Post Office", lat: 32.2536, lon: 78.1158, ele: 4440, desc: "World's highest operational post office" },
  { name: "Komic Village", lat: 32.2355, lon: 78.1347, ele: 4587, desc: "World's highest motorable village with monastery" },
  { name: "Langza Buddha Statue", lat: 32.2618, lon: 78.0934, ele: 4400, desc: "Giant golden Buddha facing Chau Chau Kang Nilda" },
  { name: "Losar Village", lat: 32.4439, lon: 77.7473, ele: 4080, desc: "Last village before ascending Kunzum Pass" },
  { name: "Kunzum Pass Summit", lat: 32.3968, lon: 77.6369, ele: 4590, desc: "Highest pass on circuit; Kunzum Mata temple" },
  { name: "Batal (Chacha Chachi)", lat: 32.3611, lon: 77.6183, ele: 3960, desc: "Legendary rescue dhaba at foot of Kunzum Pass" },
  { name: "Chandratal Moon Lake", lat: 32.4824, lon: 77.6186, ele: 4250, desc: "Turquoise crescent glacial lake" },
  { name: "Chhatru", lat: 32.3350, lon: 77.3822, ele: 3360, desc: "Chandra river boulder crossing" },
  { name: "Gramphu Junction", lat: 32.3644, lon: 77.2625, ele: 3200, desc: "Leh-Manali highway junction" },
  { name: "Atal Tunnel (North Portal)", lat: 32.3942, lon: 77.1648, ele: 3040, desc: "Engineering marvel connecting Lahaul to Kullu" },
  { name: "Solang Valley", lat: 32.3167, lon: 77.1575, ele: 2560, desc: "Adventure valley in Kullu" },
  { name: "Manali", lat: 32.2396, lon: 77.1887, ele: 2050, desc: "Expedition endpoint; descent into pine forests" },
];

const DEFAULT_GPX_POINTS = [
  { name: "Old Manali", lat: 32.2530, lon: 77.1750, ele: 2080, desc: "Cafes, apple orchards, Manu temple" },
  { name: "Hadimba Temple", lat: 32.2483, lon: 77.1798, ele: 2060, desc: "1553 CE pagoda temple in cedar forest" },
  { name: "Solang Valley", lat: 32.3167, lon: 77.1575, ele: 2560, desc: "Adventure valley and mountain views" },
  { name: "Atal Tunnel South Portal", lat: 32.3129, lon: 77.1420, ele: 2980, desc: "Gateway to Lahaul Valley" },
  { name: "Sissu Waterfall", lat: 32.4764, lon: 77.1235, ele: 3120, desc: "Glacial cascade in Lahaul" },
  { name: "Naggar Castle", lat: 32.1382, lon: 77.1697, ele: 1760, desc: "Himalayan wood-and-stone heritage architecture" },
  { name: "Vashisht Hot Springs", lat: 32.2612, lon: 77.1883, ele: 2100, desc: "Natural sulphur thermal baths" },
];

function buildGpxXml(itinerary: Props["itinerary"], isSpitiRoute: boolean): string {
  const points = isSpitiRoute ? SPITI_GPX_POINTS : DEFAULT_GPX_POINTS;

  const wptsXml = points
    .map(
      (p) => `  <wpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">
    <ele>${p.ele}</ele>
    <name>${escapeXml(p.name)}</name>
    <desc>${escapeXml(p.desc)}</desc>
    <sym>Waypoint</sym>
  </wpt>`
    )
    .join("\n");

  const trkptsXml = points
    .map(
      (p) => `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">
        <ele>${p.ele}</ele>
        <name>${escapeXml(p.name)}</name>
      </trkpt>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VacayOut India (vacayout.in)" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(itinerary.title)}</name>
    <desc>${escapeXml(itinerary.summary)}</desc>
    <author>
      <name>VacayOut India Expeditions</name>
      <link href="https://vacayout.in"/>
    </author>
    <time>${new Date().toISOString()}</time>
  </metadata>
${wptsXml}
  <trk>
    <name>${escapeXml(itinerary.title)} Route Track</name>
    <desc>${escapeXml(itinerary.summary)}</desc>
    <trkseg>
${trkptsXml}
    </trkseg>
  </trk>
</gpx>`;
}

export function ItineraryDetailView({ itinerary, stopLinks = {}, relatedItineraries = [] }: Props) {
  const isSpiti = itinerary.slug.includes("spiti");
  const isManali = itinerary.slug.includes("manali");

  // Day accordion state
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    itinerary.plan.days.forEach((_, idx) => {
      init[idx] = true; // expanded by default
    });
    return init;
  });

  const [activeElevationDay, setActiveElevationDay] = useState<number | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [gpxDownloaded, setGpxDownloaded] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const toggleDay = (idx: number) => {
    setExpandedDays((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    itinerary.plan.days.forEach((_, idx) => {
      all[idx] = true;
    });
    setExpandedDays(all);
  };

  const collapseAll = () => {
    setExpandedDays({});
  };

  const handleDownloadGpx = () => {
    try {
      const gpxData = buildGpxXml(itinerary, isSpiti);
      const blob = new Blob([gpxData], { type: "application/gpx+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${itinerary.slug}-route.gpx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setGpxDownloaded(true);
      setTimeout(() => setGpxDownloaded(false), 3500);
      setShowDownloadModal(false);
    } catch (e) {
      console.error("Error exporting GPX track:", e);
    }
  };

  const handleDownloadPdf = () => {
    setIsPdfGenerating(true);
    setShowDownloadModal(false);
    expandAll();
    const prevTitle = typeof document !== "undefined" ? document.title : "";
    if (typeof document !== "undefined") {
      document.title = `${itinerary.title} - VacayOut Travel Dossier`;
    }
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.print();
      }
      if (typeof document !== "undefined") {
        document.title = prevTitle;
      }
      setIsPdfGenerating(false);
    }, 200);
  };

  // Quick stats definitions
  const quickStats = isSpiti
    ? [
        { label: "DURATION", value: "9 Days / 8 Nights" },
        { label: "PEAK ALTITUDE", value: "4,590 m (Kunzum Pass)" },
        { label: "BEST SEASON", value: "Mid-Jun – Early Oct" },
        { label: "ROUTE LENGTH", value: "1,180 km" },
        { label: "START / FINISH", value: "Shimla / Manali" },
        { label: "DIFFICULTY", value: "Moderate to High" },
      ]
    : isManali
    ? [
        { label: "DURATION", value: `${itinerary.durationDays} Days / ${itinerary.durationDays - 1} Nights` },
        { label: "PEAK ALTITUDE", value: "3,978 m (Rohtang Pass)" },
        { label: "BEST SEASON", value: "May – Jun & Sep – Oct" },
        { label: "ROUTE LENGTH", value: "~180 km in Valley" },
        { label: "START / FINISH", value: "Manali / Manali" },
        { label: "DIFFICULTY", value: "Easy to Moderate" },
      ]
    : [
        { label: "DURATION", value: `${itinerary.durationDays} Days / ${itinerary.durationDays - 1} Nights` },
        { label: "PEAK ALTITUDE", value: "2,500 m+" },
        { label: "BEST SEASON", value: "Mar – Jun & Sep – Nov" },
        { label: "ROUTE LENGTH", value: `${itinerary.durationDays * 75} km approx` },
        { label: "START / FINISH", value: itinerary.place.name },
        { label: "DIFFICULTY", value: "Moderate" },
      ];

  // Elevation progression data for Acclimatization Gradient
  const elevationData = isSpiti
    ? [
        { day: 1, stop: "Shimla", alt: 2276, note: "Start: Colonial capital" },
        { day: 2, stop: "Sangla", alt: 2680, note: "Baspa valley orchards" },
        { day: 3, stop: "Kalpa", alt: 2960, note: "Faces Kinner Kailash" },
        { day: 4, stop: "Nako", alt: 3625, note: "High altitude alpine lake" },
        { day: 5, stop: "Tabo", alt: 3280, note: "1,000-year monastery" },
        { day: 6, stop: "Kaza", alt: 3800, note: "Sub-divisional capital" },
        { day: 7, stop: "Kunzum Pass", alt: 4590, isPeak: true, note: "Highest vehicle pass" },
        { day: 8, stop: "Chandratal", alt: 4250, note: "Crescent moon lake" },
        { day: 9, stop: "Manali", alt: 2050, note: "Descent through Atal Tunnel" },
      ]
    : [
        { day: 1, stop: "Base / Arrival", alt: 1800, note: "Initial altitude" },
        { day: 2, stop: "Mid Valley", alt: 2400, note: "Scenic viewpoint" },
        { day: 3, stop: "High Pass / Ridge", alt: 3400, isPeak: true, note: "Highest point of trek" },
        { day: 4, stop: "Return Valley", alt: 2050, note: "Descent to base" },
      ];

  // Segment metadata for Spiti or general
  const spitiDaysMeta = [
    {
      eyebrow: "DAY 01 · 175 KM · 6–7 HRS DRIVE",
      title: "Shimla to Narkanda & Sangla",
      elevationBadge: "Elevation Gain: +404 m",
      statusBadge: "Open (Summer)",
      permitBadge: "Permits: None",
      narrative:
        "Depart Shimla early heading east on the **Hindustan-Tibet Road (NH-5)**. Wind through dense cedar forests of Narkanda with views of the snow-clad Greater Himalayas. Descend steeply toward the roaring **Sutlej River gorge** at Rampur Bushahr, the historic trading gateway. Continue past Karcham where the emerald Baspa River meets the Sutlej, turning into the dramatic Kinnaur Valley to reach picturesque **Sangla**.",
      overnightStay: "Sangla (2,680 m) — Riverside guest houses or luxury Swiss tents",
      roadConditions: "Smooth tarmac NH-5 up to Rampur; rough patches & gravel along Baspa river",
      keyAttractions: "Hatu Peak, Sutlej river gorge, Kamru Fort & temple, apple orchards",
      criticalLogistics: "Rampur is the last reliable major bank & ATM cluster. Fill vehicle tank before entering Baspa Valley.",
    },
    {
      eyebrow: "DAY 02 · 75 KM · 3–4 HRS DRIVE",
      title: "Sangla & Chitkul to Kalpa",
      elevationBadge: "Elevation Gain: +280 m",
      statusBadge: "Open (Summer)",
      permitBadge: "Permits: None",
      narrative:
        "Drive 24 km further up the valley to **Chitkul (3,450 m)**, the last inhabited village on the Indian border with Tibet. Walk amidst traditional slate-roof wooden houses and potato farms framed by jagged granite peaks. After lunch, backtrack down to Karcham and climb 13 km above Reckong Peo to the apple-scented ridge village of **Kalpa**, famous for its spellbinding direct sunset views of the sacred **Kinner Kailash peak**.",
      overnightStay: "Kalpa (2,960 m) — Heritage homestays or HPTDC hotel facing Kinner Kailash",
      roadConditions: "Narrow mountain curves; single-lane sections prone to falling rocks past Powari",
      keyAttractions: "Chitkul border post, Mathi Devi Temple, Roghi cliff suicide point, Kinner Kailash sunset",
      criticalLogistics: "Foreign nationals should verify their Inner Line Permit (ILP) at the Reckong Peo DC office if not issued earlier.",
    },
    {
      eyebrow: "DAY 03 · 130 KM · 5–6 HRS DRIVE",
      title: "Kalpa to Nako & Gue Mummy",
      elevationBadge: "Elevation Gain: +665 m",
      statusBadge: "Open (Summer)",
      permitBadge: "ILP Required (Foreigners)",
      narrative:
        "A stark transition from Kinnaur's forested slopes to the cold desert of lower Spiti. Follow the cliff-carved NH-5 through the barren gorges of Pooh and Khab, where the **Sutlej and Spiti rivers merge**. Negotiate the hairpin bends of the notorious Ka Loops before reaching **Nako**, clustered around a high-altitude willow-fringed sacred lake. Make a side detour to **Gue village** to witness the miraculously preserved 500-year-old mummified Buddhist monk.",
      overnightStay: "Nako (3,625 m) — Local stone homestays or lake-view camps",
      roadConditions: "Mix of smooth highway and loose scree; Malling Nallah water crossing can be tricky after rain",
      keyAttractions: "Khab confluence bridge, sacred Nako Lake, 550-year-old natural Gue Monk Mummy",
      criticalLogistics: "Checkpost at Akpa and Sumdo: Keep 5 physical passport/ID photocopies ready for military registration.",
    },
    {
      eyebrow: "DAY 04 · 90 KM · 3–4 HRS DRIVE",
      title: "Nako to Tabo & Dhankar",
      elevationBadge: "Elevation Gain: -345 m (Descent)",
      statusBadge: "Open (Summer)",
      permitBadge: "Permits: None",
      narrative:
        "Descend slightly into the wide gravel riverbed of Spiti. Arrive at **Tabo Monastery**, founded in 996 AD and often referred to as the 'Ajanta of the Himalayas' for its invaluable 10th-century mud-plaster murals and stucco statues. Later, ascend the precipitous road to **Dhankar Gompa**, an astonishing fortress monastery perched dramatically on a razor-sharp cliff 300 meters above the confluence of the Spiti and Pin rivers.",
      overnightStay: "Tabo or Dhankar (3,280 m / 3,894 m) — Monastery guest rooms or village homestays",
      roadConditions: "Widened paved road with occasional gravel chutes; steep climb to Dhankar",
      keyAttractions: "Tabo UNESCO-tentative ancient complex, Dhankar fort ruins, Dhankar Lake hike",
      criticalLogistics: "Tabo has strict preservation guidelines: no flash photography inside ancient sanctums.",
    },
    {
      eyebrow: "DAY 05 · 65 KM · 3 HRS DRIVE",
      title: "Dhankar to Mudh (Pin Valley National Park)",
      elevationBadge: "Elevation Gain: +470 m",
      statusBadge: "Open (Summer)",
      permitBadge: "Permits: None",
      narrative:
        "Cross the Spiti River at Attargoo and enter the untouched realm of **Pin Valley**, renowned for its sub-zero alpine ecology, rare Himalayan ibex, and Tibetan wolves. Pass the ancient Nyingmapa sect **Kungri Monastery** before driving to **Mudh**, the last roadhead village framed by towering pastel-hued scree cliffs and glacial streams, serving as the terminus for the famous Pin-Parvati trek.",
      overnightStay: "Mudh Village (3,750 m) — Simple community homestays with home-cooked seabuckthorn tea",
      roadConditions: "Unpaved dirt and river gravel; low-clearance vehicles must proceed slowly through shallow brooks",
      keyAttractions: "Kungri Monastery tantric murals, Pin Valley National Park wildlife trails, Parahio riverbed",
      criticalLogistics: "Zero mobile network in Mudh. Temperatures plunge below 0°C at night even in midsummer.",
    },
    {
      eyebrow: "DAY 06 · 80 KM · 4–5 HRS DRIVE",
      title: "Pin Valley to Kaza, Ki Monastery & Kibber",
      elevationBadge: "Elevation Gain: +500 m",
      statusBadge: "Open (Summer)",
      permitBadge: "Permits: None",
      narrative:
        "Drive down the valley to **Kaza**, the administrative center of Spiti. After checking in, ascend the hill to **Ki Monastery (4,166 m)**, an iconic fort-like monastic citadel stacked with whitewashed monk cells overlooking the braided river. Continue across the breathtaking **Chicham Bridge**—Asia's highest suspension bridge spanning a 1,000-foot chasm—to the fossil-strewn villages of **Kibber**, **Hikkim** (world's highest post office), and **Komic** (highest motorable village).",
      overnightStay: "Kaza (3,800 m) — Boutique hotels, eco-lodges, or cafes with high-speed Wi-Fi",
      roadConditions: "Well-paved tarmac around Kaza; narrow high-altitude tarmac to Ki, Kibber, and Chicham",
      keyAttractions: "Ki Monastery prayer halls, Chicham gorge bridge, Hikkim post office (send a postcard), Komic monastery",
      criticalLogistics: "Kaza houses the world's highest retail fuel station (Indian Oil). Top up tank and spare jerrycans fully.",
    },
    {
      eyebrow: "DAY 07 · 95 KM · 5–6 HRS DRIVE",
      title: "Kaza to Chandratal via Kunzum Pass (4,590 m)",
      elevationBadge: "Peak Pass: 4,590 m",
      statusBadge: "High Altitude Alert",
      permitBadge: "4x4 Strongly Advised",
      narrative:
        "The most rugged and awe-inspiring day of the expedition. Ascend out of Kaza past Losar village toward the mighty **Kunzum Pass (4,590 m)**, where colorful Buddhist prayer flags flutter against towering glaciers. Pay homage at the Kunzum Mata shrine before taking the rough, single-lane 14 km cliff track toward **Chandratal (The Moon Lake)**. Hike the final 1.5 km to the pristine crescent lake, its turquoise waters mirroring barren glaciated peaks.",
      overnightStay: "Chandratal Campsite (4,250 m) — Fixed seasonal luxury Swiss camps (located 2.5 km outside lake basin)",
      roadConditions: "High mountain dirt tracks with large boulders, loose scree, and multiple glacial water crossings (Pagal Nallahs)",
      keyAttractions: "Kunzum Pass summit (4,590 m), Chandratal turquoise crescent lake, night astrophotography & Milky Way views",
      criticalLogistics: "Strictly no camping at the lake edge (ecologically protected). Portable oxygen cans recommended for sleeping at 4,250m.",
    },
    {
      eyebrow: "DAY 08 · 125 KM · 6–7 HRS DRIVE",
      title: "Chandratal to Manali via Atal Tunnel",
      elevationBadge: "Elevation Drop: -2,200 m",
      statusBadge: "Open (Summer)",
      permitBadge: "Permits: None",
      narrative:
        "Begin at daybreak tackling the infamous **Batal-to-Gramphu boulder track**, navigating roaring glacial runoffs including the dreaded Chhota Dhara. Reach Gramphu and enter the smooth, double-lane NH-3. Pass under the Himalayan barrier through the engineering marvel of the **Atal Tunnel (9.02 km)**, instantly emerging from the barren Tibetan desert of Lahaul into the lush, pine-scented temperate wonderland of Manali.",
      overnightStay: "Manali (2,050 m) — Luxury alpine resort or riverside wooden cottage in Old Manali",
      roadConditions: "Batal to Gramphu is raw unpaved riverbed and gravel; Gramphu through Atal Tunnel to Manali is world-class tarmac",
      keyAttractions: "Chandra River gorge, historic Chacha-Chachi dhaba at Batal, Atal Tunnel south portal, Solang Valley",
      criticalLogistics: "Have vehicle tires, suspension, and underbody inspected in Manali after surviving the Chandra riverbed.",
    },
    {
      eyebrow: "DAY 09 · 290 KM · 7–8 HRS DRIVE",
      title: "Manali to Chandigarh / Delhi Departure",
      elevationBadge: "Elevation Drop: -1,700 m",
      statusBadge: "Open All Year",
      permitBadge: "Permits: None",
      narrative:
        "Enjoy a relaxed mountain breakfast before cruising down the newly completed four-lane Kiratpur-Manali highway along the Beas River. Pass through Mandi, Sundernagar, and Bilaspur, bypassing historic bottle-necks through modern tunnels. Arrive in **Chandigarh** by late afternoon to catch evening connections to Delhi or Mumbai, completing one of the world's most epic overland mountain loops.",
      overnightStay: "Departure — Onward flight from Chandigarh (IXC) or overnight Volvo / train to New Delhi",
      roadConditions: "Fast 4-lane expressway and multi-tunnel mountain bypass corridor",
      keyAttractions: "Kullu shawl workshops, Beas river valley views, Pandoh Dam reservoir",
      criticalLogistics: "Book Chandigarh flights departing after 18:30 to account for occasional highway transit delays.",
    },
  ];

  // Preparation cards
  const prepCards = [
    {
      title: "Inner Line Permits (ILP)",
      category: "GOVERNMENT REGULATIONS",
      content:
        "Indian nationals do not require an Inner Line Permit for the Spiti circuit, but must carry a valid Aadhaar/Voter ID. Foreign nationals require an Inner Line Permit (ILP) for the stretch between Akpa/Jangi and Sumdo (Kinnaur/Spiti border), issued by the DC/SDM office in Shimla, Reckong Peo, or Kaza. Passports and visa copies are verified at military checkpoints.",
    },
    {
      title: "Fuel & Range Planning",
      category: "LOGISTICS & RANGE",
      content:
        "Long stretches exist with zero fuel. After Powari/Reckong Peo in Kinnaur, there is NO petrol pump for over 200 km until Kaza. Kaza houses the world's highest retail outlet (Indian Oil at 3,740 m), but fuel availability depends on supply tankers. Always top up your tank to full and carry 10–20L in leak-proof metal jerrycans for safety.",
    },
    {
      title: "AMS & Oxygen Protocol",
      category: "ALTITUDE MEDICINE",
      content:
        "Acute Mountain Sickness (AMS) can affect anyone above 3,000m regardless of fitness. The counter-clockwise route via Kinnaur provides natural acclimatization. Drink 3.5 to 4.5 liters of water daily. Carry Diamox (after consulting your physician) and 2–3 portable oxygen canisters. If severe headache, nausea, or breathlessness persists, descent is mandatory.",
    },
    {
      title: "Vehicle Preparation & 4x4",
      category: "MECHANICAL SAFETY",
      content:
        "A minimum ground clearance of 200 mm is mandatory. The Batal-to-Gramphu stretch involves navigating deep glacial water crossings (Pagal Nallahs) and boulder-strewn riverbeds where hatchbacks and low sedans routinely suffer underbody damage. 4x4 or high-clearance AWD SUVs with all-terrain tires are strongly recommended.",
    },
    {
      title: "Thermal Packing & Gear",
      category: "EQUIPMENT CHECKLIST",
      content:
        "Sub-zero temperatures occur at night even in July and August at Chandratal and Kaza (-3°C to 5°C). Pack high-grade windproof thermal base layers, a 650+ fill down jacket, polarized UV400 sunglasses (UV index is extreme above 3,500m), water-resistant hiking boots, cold-weather sleeping liners, and high-SPF sunscreen.",
    },
    {
      title: "Money & Connectivity",
      category: "TELECOM & CASH",
      content:
        "Only BSNL and Jio postpaid connections operate in the Spiti Valley. Airtel drops completely past Reckong Peo. At Chandratal and high passes, there is zero signal. ATMs in Kaza frequently run out of cash or lose power grid connection during storms. Carry at least ₹15,000 to ₹25,000 hard cash per person for fuel, homestays, and emergency meals.",
    },
  ];

  // Budget comparison tiers
  const budgetTiers = [
    {
      name: "BUDGET BACKPACKER",
      total: "₹22,000 / person",
      subtitle: "HRTC public transport & village homestays",
      items: [
        "Transport: HRTC ordinary & semi-deluxe buses + shared Sumos (₹4,500)",
        "Stays: Traditional family homestays & dorm beds @ ₹700–900/night (₹6,800)",
        "Food: Local dhabas, dal-bhat, thukpa, momos & tea (₹5,200)",
        "Monastery fees, local permits & emergency buffer (₹3,500)",
        "Best for: Solo explorers and budget travelers with flexible schedules",
      ],
    },
    {
      name: "MID-RANGE TRAVELLER",
      total: "₹42,000 / person",
      subtitle: "Private SUV hire & heritage boutique stays",
      featured: true,
      items: [
        "Transport: Dedicated Scorpio/Innova with experienced mountain driver (₹18,000 split)",
        "Stays: Premium boutique homestays & Swiss lake tents (₹14,500)",
        "Food: Cafe dining, Tibetan specialties & fresh river trout (₹8,000)",
        "Permit processing, museum admissions & Rohtang green cess (₹3,500)",
        "Best for: Couples and small groups wanting reliable comfort & autonomy",
      ],
    },
    {
      name: "PREMIUM 4x4 EXPEDITION",
      total: "₹78,000 / person",
      subtitle: "Dedicated 4x4 Thar/Fortuner & luxury glamping",
      items: [
        "Transport: Dedicated 4x4 vehicle with veteran mountain expedition chauffeur (₹36,000 split)",
        "Stays: Handpicked luxury eco-lodges & VIP glamping with heating (₹26,000)",
        "Food: All meals, organic farm dining & portable espresso (₹12,000)",
        "Full concierge: Oxygen support, satellite check-ins, all permits included",
        "Best for: Photography groups and travelers demanding maximum comfort & safety",
      ],
    },
  ];

  // FAQ list
  const faqs = [
    {
      q: "Can we complete the Spiti circuit in reverse from Manali to Shimla?",
      a: "While physically possible from July to October when Kunzum Pass opens, traveling clockwise from Manali jumps your altitude from 2,050m to 4,590m within hours, triggering high rates of acute mountain sickness (AMS) in unacclimatized travelers. The Shimla-to-Manali counter-clockwise route is universally recommended by doctors and mountain guides because it provides 5 days of gradual acclimatization.",
    },
    {
      q: "When do the Kunzum Pass and Chandratal roads open each year?",
      a: "Kunzum Pass (4,590 m) is cleared of winter snow by the Border Roads Organisation (BRO) typically between mid-June and late June, and remains open until early to mid-October. The road to Chandratal opens around the same time. During winter and spring (November to May), Spiti is only accessible as an in-and-out route via Shimla and Kinnaur.",
    },
    {
      q: "Which vehicle is best suited for the circuit, and is 4x4 strictly mandatory?",
      a: "High ground clearance (minimum 200 mm) is mandatory. While experienced drivers can navigate the Kaza-to-Manali stretch in a high-clearance 2WD SUV (like a Scorpio or Bolero) in dry summer conditions, a 4x4 vehicle is strongly recommended due to deep water crossings (Pagal Nallahs) and loose scree at Batal and Gramphu.",
    },
    {
      q: "How reliable are mobile networks and internet connectivity along the route?",
      a: "Mobile signal is sparse. Jio and BSNL have 4G connectivity in Reckong Peo, Sangla, Kaza, and Tabo, but network outages lasting 24–48 hours are common during power cuts or fiber line breaks. Airtel ceases past Reckong Peo. Chandratal has zero signal. Download offline maps and inform family of communication blackouts.",
    },
  ];

  // Route segment summary table
  const routeSegments = [
    { day: "Day 1", segment: "Shimla → Sangla", dist: "175 km", time: "6–7 hrs", surface: "Tarmac / Good", status: "Open" },
    { day: "Day 2", segment: "Sangla → Chitkul → Kalpa", dist: "75 km", time: "3–4 hrs", surface: "Narrow / Cliff curves", status: "Open" },
    { day: "Day 3", segment: "Kalpa → Nako → Gue", dist: "130 km", time: "5–6 hrs", surface: "Paved / Scree Chutes", status: "ILP Req." },
    { day: "Day 4", segment: "Nako → Tabo → Dhankar", dist: "90 km", time: "3–4 hrs", surface: "Paved highway", status: "Open" },
    { day: "Day 5", segment: "Dhankar → Mudh (Pin Valley)", dist: "65 km", time: "3 hrs", surface: "Gravel / Dirt tracks", status: "Open" },
    { day: "Day 6", segment: "Pin Valley → Kaza → Ki & Kibber", dist: "80 km", time: "4–5 hrs", surface: "High tarmac & passes", status: "Open" },
    { day: "Day 7", segment: "Kaza → Kunzum Pass → Chandratal", dist: "95 km", time: "5–6 hrs", surface: "Rough Boulders / 4x4", status: "High Pass" },
    { day: "Day 8", segment: "Chandratal → Atal Tunnel → Manali", dist: "125 km", time: "6–7 hrs", surface: "Riverbed → Tunnel Expressway", status: "Open" },
    { day: "Day 9", segment: "Manali → Mandi → Chandigarh", dist: "290 km", time: "7–8 hrs", surface: "4-Lane Mountain Highway", status: "Open" },
  ];

  return (
    <article className="min-h-screen bg-white text-ink pb-20 selection:bg-coral/20 selection:text-coral">
      {/* PRINT-ONLY EXPEDITION DOSSIER HEADER */}
      <div className="hidden print:block p-6 mb-6 border-b-2 border-black">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-gray-600">VacayOut India — Official Expedition Dossier</p>
            <h1 className="text-2xl font-serif font-bold text-black mt-1">{itinerary.title}</h1>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p className="font-bold text-black text-sm">vacayout.in</p>
            <p>Verified Offline Route Guide</p>
          </div>
        </div>
        <p className="text-xs text-gray-700 mt-2">{itinerary.summary}</p>
        <div className="mt-4 grid grid-cols-4 gap-3 text-xs border-t border-gray-300 pt-3">
          <div><span className="font-bold">Duration:</span> {itinerary.durationDays} Days / {itinerary.durationDays - 1} Nights</div>
          <div><span className="font-bold">Peak Altitude:</span> {isSpiti ? "4,590 m (Kunzum Pass)" : "High Mountain"}</div>
          <div><span className="font-bold">Route Length:</span> {isSpiti ? "1,180 km" : `${itinerary.durationDays * 75} km`}</div>
          <div><span className="font-bold">Region:</span> {itinerary.place.stateName || "Himachal Pradesh"}</div>
        </div>
      </div>

      {/* 1. HERO HEADER */}
      <section className="border-b border-[#E5E2DC] bg-white pt-8 pb-10">
        <div className="container-site max-w-6xl">
          {/* Breadcrumb & Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-muted">
              <Link href="/india" className="hover:text-coral transition-colors">India</Link>
              <span>›</span>
              {itinerary.place.stateSlug ? (
                <>
                  <Link href={`/india/${itinerary.place.stateSlug}`} className="hover:text-coral transition-colors">
                    {itinerary.place.stateName ?? "Himachal Pradesh"}
                  </Link>
                  <span>›</span>
                </>
              ) : null}
              <Link href="/itineraries" className="hover:text-coral transition-colors">Itineraries</Link>
            </nav>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
              {isSpiti ? "High-Altitude Overland Expedition" : `${itinerary.durationDays}-Day Curated Mountain Route`}
            </span>
          </div>

          {/* Title & Action Bar */}
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="font-serif text-[clamp(2.2rem,4vw,3.25rem)] font-medium leading-[1.12] text-ink tracking-tight">
                {isSpiti ? "The Complete 9-Day Spiti Valley Circuit" : itinerary.title}
              </h1>
              <p className="mt-3 max-w-3xl text-[1.0625rem] leading-relaxed text-[#444]">
                {isSpiti
                  ? "A classic Himalayan overland journey starting from Shimla through Kinnaur, crossing Kunzum Pass at 4,590 m, and concluding in Manali. Built for adventurers seeking high-altitude monasteries, moonscapes, and remote Himalayan culture."
                  : itinerary.summary}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-2.5 no-print">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isPdfGenerating}
                className="inline-flex items-center gap-2 rounded-lg bg-[#BA4A38] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#A33F2F] active:scale-[0.98] cursor-pointer"
                title="Download complete day-by-day itinerary PDF dossier"
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                {isPdfGenerating ? "Preparing Dossier..." : "Download PDF"}
              </button>

              <button
                type="button"
                onClick={handleDownloadGpx}
                className="inline-flex items-center gap-2 rounded-lg border border-[#D5D1C7] bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-xs transition hover:bg-[#FAF9F6] hover:border-ink active:scale-[0.98] cursor-pointer"
                title="Download route GPX for Garmin, Komoot, AllTrails & Google Earth"
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity="0.2" />
                </svg>
                {gpxDownloaded ? "GPX Downloaded ✓" : "Route GPX"}
              </button>

              <Link
                href={routes.chatWithPrompt(`Customize this ${itinerary.title} itinerary for my trip dates, budget and group`)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1C2524] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
              >
                <Icon name="sparkles" size={15} />
                Customize with AI Planner
              </Link>
            </div>
          </div>

          {/* Quick Stats Ribbon */}
          <div className="mt-8 rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-4 sm:p-5 shadow-xs">
            <div className="grid grid-cols-2 divide-y divide-[#E5E2DC] sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6 lg:divide-x lg:divide-[#E5E2DC]">
              {quickStats.map((st, i) => (
                <div key={i} className={`p-2.5 sm:px-4 ${i === 0 ? "pt-0 sm:pt-2.5 lg:pl-0" : ""}`}>
                  <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">{st.label}</p>
                  <p className="mt-1 text-sm font-bold text-ink">{st.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Asymmetric 3-Photo Hero Collage */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl md:col-span-8 md:aspect-auto md:h-[420px] bg-slate-100">
              <Image
                src={itinerary.hero?.url ?? "/images/destinations/spiti.jpg"}
                alt={itinerary.hero?.alt ?? "High altitude panoramic landscape of Spiti Valley"}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 66vw"
                className="object-cover transition-transform duration-700 hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Scenic Vantage</p>
                <p className="font-serif text-lg font-medium">Key Monastery & The Spiti Riverbed</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:col-span-4 md:grid-cols-1">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl md:aspect-auto md:h-[202px] bg-slate-100">
                <Image
                  src="/images/destinations/rohtang-pass.jpg"
                  alt="Glacial turquoise waters of Chandratal Lake"
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 text-white">
                  <p className="text-xs font-medium">Chandratal Moon Lake (4,250 m)</p>
                </div>
              </div>

              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl md:aspect-auto md:h-[202px] bg-slate-100">
                <Image
                  src="/images/destinations/himachal-hero.jpg"
                  alt="Rugged cliff road through Kinnaur gorge"
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 text-white">
                  <p className="text-xs font-medium">Kinnaur Cliff Road on NH-5</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE ACCLIMATIZATION GRADIENT */}
      <section className="border-b border-[#E5E2DC] py-14 bg-white">
        <div className="container-site max-w-6xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#BA4A38]">ALTITUDE & PHYSIOLOGY PROFILE</p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-medium text-ink">The Acclimatization Gradient</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#555]">
              Acclimatization is non-negotiable on this route. Ascending gradually via Kinnaur allows your body to produce red blood cells and adapt before crossing Kunzum Pass at 4,590 m. Never rush the initial three days.
            </p>
          </div>

          {/* SVG Elevation Timeline Graph */}
          <div className="mt-8 overflow-x-auto rounded-2xl border border-[#E5E2DC] bg-[#FAF9F6] p-6 shadow-xs">
            <div className="min-w-[720px]">
              {/* Header inside graph */}
              <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3 text-xs">
                <div className="flex items-center gap-2 font-semibold text-ink">
                  <span className="size-2 rounded-full bg-coral" />
                  <span>Elevation Profile: Day 1 to Day {elevationData.length}</span>
                </div>
                <div className="flex items-center gap-4 text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 bg-coral" /> Route Elevation
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="h-0.5 w-4 border-b border-dashed border-amber-600" /> AMS Caution Line (3,000 m)
                  </span>
                </div>
              </div>

              {/* Chart SVG */}
              <div className="relative mt-6 h-56 w-full">
                <svg className="h-full w-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#BA4A38" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#BA4A38" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  {/* 4,500m */}
                  <line x1="0" y1="20" x2="800" y2="20" stroke="#E5E2DC" strokeDasharray="3 3" />
                  <text x="5" y="16" fill="#888" fontSize="10">4,500 m</text>

                  {/* 3,000m AMS Line */}
                  <line x1="0" y1="100" x2="800" y2="100" stroke="#D97706" strokeDasharray="4 4" strokeWidth="1.2" />
                  <text x="5" y="96" fill="#D97706" fontSize="10" fontWeight="600">3,000 m (AMS Caution Threshold)</text>

                  {/* 2,000m */}
                  <line x1="0" y1="160" x2="800" y2="160" stroke="#E5E2DC" strokeDasharray="3 3" />
                  <text x="5" y="156" fill="#888" fontSize="10">2,000 m</text>

                  {/* Dynamic path based on elevationData */}
                  {(() => {
                    const minAlt = 1800;
                    const maxAlt = 4800;
                    const points = elevationData.map((d, idx) => {
                      const x = 50 + (idx * (700 / (elevationData.length - 1)));
                      const y = 180 - ((d.alt - minAlt) / (maxAlt - minAlt)) * 160;
                      return { x, y, ...d };
                    });

                    const pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
                    const areaD = `${pathD} L ${points[points.length - 1].x} 195 L ${points[0].x} 195 Z`;

                    return (
                      <>
                        <path d={areaD} fill="url(#elevationGrad)" />
                        <path d={pathD} fill="none" stroke="#BA4A38" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {points.map((p, idx) => (
                          <g key={idx} className="cursor-pointer group" onMouseEnter={() => setActiveElevationDay(idx)} onMouseLeave={() => setActiveElevationDay(null)}>
                            {p.isPeak ? (
                              <circle cx={p.x} cy={p.y} r="7" fill="#DC2626" stroke="#FFFFFF" strokeWidth="3" />
                            ) : (
                              <circle cx={p.x} cy={p.y} r="5" fill="#BA4A38" stroke="#FFFFFF" strokeWidth="2" />
                            )}
                            {/* Altitude label */}
                            <text
                              x={p.x}
                              y={p.y - 12}
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight={p.isPeak ? "700" : "600"}
                              fill={p.isPeak ? "#DC2626" : "#1F2937"}
                            >
                              {p.alt}m
                            </text>
                            {/* Stop name */}
                            <text x={p.x} y="195" textAnchor="middle" fontSize="11" fontWeight="600" fill="#4B5563">
                              D{p.day}: {p.stop}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* Peak indicator highlight callout */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-900">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-red-700">Highest Point:</span>
                  <span className="font-semibold">
                    {activeElevationDay !== null && elevationData[activeElevationDay]
                      ? `Day ${elevationData[activeElevationDay].day} — ${elevationData[activeElevationDay].stop} (${elevationData[activeElevationDay].alt} m) · ${elevationData[activeElevationDay].note}`
                      : "Day 7 — Kunzum Pass (4,590 m)"}
                  </span>
                </div>
                <span className="text-red-700">Descend promptly to lower altitude if experiencing persistent dizziness</span>
              </div>
            </div>
          </div>

          {/* Sub Callout Cards */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#E5E2DC] bg-[#FAF9F6] p-5 sm:p-6">
              <div className="flex items-center gap-2.5 text-ink font-semibold text-base">
                <span className="flex size-7 items-center justify-center rounded-full bg-coral/10 text-coral">
                  <Icon name="compass" size={16} />
                </span>
                Why Counter-Clockwise Matters
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-[#555]">
                Climbing from Shimla via Kinnaur gives your body 5 continuous days to adapt below 3,600 m before sleeping at extreme heights in Kaza and Chandratal. Entering clockwise from Manali forces a rapid 2,500 m jump in 6 hours directly over Kunzum Pass, resulting in acute mountain sickness for over 60% of unprepared travelers.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5E2DC] bg-[#FAF9F6] p-5 sm:p-6">
              <div className="flex items-center gap-2.5 text-ink font-semibold text-base">
                <span className="flex size-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-700">
                  <Icon name="shield" size={16} />
                </span>
                Critical Altitude Thresholds
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-[#555]">
                Above the 3,000 m threshold (Nako onwards), increase sleeping altitude by no more than 500 m daily. Maintain 3.5 to 4.5 liters of hydration per day. Avoid heavy exertion on Day 4. If severe throbbing headache or breathlessness persists at rest, immediate descent to lower altitude is mandatory.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE SEGMENT BREAKDOWN (DAY-BY-DAY) */}
      <section className="py-14 bg-white border-b border-[#E5E2DC]">
        <div className="container-site max-w-6xl">
          {/* Section Header with controls */}
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E2DC] pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#BA4A38]">DAY-BY-DAY ITINERARY</p>
              <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-medium text-ink">
                The {itinerary.durationDays}-Day Segment Breakdown
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-[#555]">
              <button type="button" onClick={expandAll} className="hover:text-coral transition-colors underline underline-offset-4">
                Expand All
              </button>
              <span>·</span>
              <button type="button" onClick={collapseAll} className="hover:text-coral transition-colors underline underline-offset-4">
                Collapse All
              </button>
            </div>
          </div>

          {/* Days Stack */}
          <div className="mt-8 space-y-6">
            {itinerary.plan.days.map((day, idx) => {
              const meta = isSpiti && spitiDaysMeta[idx] ? spitiDaysMeta[idx] : null;
              const isExpanded = !!expandedDays[idx];

              return (
                <div
                  key={idx}
                  className="overflow-hidden rounded-2xl border border-[#E5E2DC] bg-white shadow-xs transition hover:border-[#D1CDC7]"
                >
                  {/* Card Header Bar */}
                  <div
                    onClick={() => toggleDay(idx)}
                    className="flex cursor-pointer flex-wrap items-center justify-between gap-3 border-b border-[#E5E2DC] bg-[#FAF9F6] p-4 sm:px-6 transition hover:bg-[#F5F3EF]"
                  >
                    <div>
                      <p className="text-xs font-mono font-bold tracking-wider text-muted">
                        {meta ? meta.eyebrow : `DAY 0${idx + 1} · ${day.travel ? day.travel.split(".")[0] : "LOCAL TRANSIT"}`}
                      </p>
                      <h3 className="mt-1 font-serif text-xl font-medium text-ink">
                        {meta ? meta.title : `Day ${idx + 1}: ${day.title.replace(/^day\s*\d+\s*[:.–-]\s*/i, "")}`}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {meta ? (
                        <>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {meta.elevationBadge}
                          </span>
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
                            {meta.statusBadge}
                          </span>
                          <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">
                            {meta.permitBadge}
                          </span>
                        </>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {day.stops.length} Highlights
                        </span>
                      )}

                      <span className="ml-2 text-muted transition-transform duration-200">
                        <svg
                          aria-hidden="true"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={isExpanded ? "rotate-180" : ""}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 space-y-6">
                      {/* Narrative */}
                      <p className="text-[0.9375rem] leading-relaxed text-[#374151]">
                        {meta ? (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: meta.narrative.replace(/\*\*(.*?)\*\*/g, '<strong class="text-ink font-semibold">$1</strong>'),
                            }}
                          />
                        ) : (
                          day.summary || "Explore the local monuments, mountain viewpoints, and regional trails."
                        )}
                      </p>

                      {/* Stops list */}
                      <div className="rounded-xl border border-[#E5E2DC] bg-[#FAF9F6]/50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Planned Stops & Route Milestones</p>
                        <div className="space-y-3">
                          {day.stops.map((stop, sIdx) => {
                            const href = stop.placeSlug ? stopLinks[stop.placeSlug] ?? null : null;
                            return (
                              <div key={sIdx} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 text-sm">
                                <span className="w-28 shrink-0 text-xs font-mono font-bold uppercase text-coral">
                                  {stop.time || `Stop ${sIdx + 1}`}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-baseline gap-2">
                                    {href ? (
                                      <Link href={href} className="font-semibold text-ink underline-offset-2 hover:underline hover:text-coral">
                                        {stop.name}
                                      </Link>
                                    ) : (
                                      <span className="font-semibold text-ink">{stop.name}</span>
                                    )}
                                    {stop.duration ? (
                                      <span className="text-xs text-muted">· {stop.duration}</span>
                                    ) : null}
                                  </div>
                                  {stop.note ? <p className="mt-0.5 text-xs text-[#555]">{stop.note}</p> : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4-Column Logistics Meta Grid */}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
                        {/* 1. Overnight */}
                        <div className="rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-3.5">
                          <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                            <Icon name="bed" size={13} className="text-coral" /> Overnight Stay
                          </p>
                          <p className="mt-1 text-xs leading-snug font-medium text-ink">
                            {meta ? meta.overnightStay : day.overnight || "Local hotel or guesthouse"}
                          </p>
                        </div>

                        {/* 2. Road Conditions */}
                        <div className="rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-3.5">
                          <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                            <Icon name="car" size={13} className="text-coral" /> Road Conditions
                          </p>
                          <p className="mt-1 text-xs leading-snug font-medium text-ink">
                            {meta ? meta.roadConditions : day.travel || "Paved state highway"}
                          </p>
                        </div>

                        {/* 3. Key Attractions */}
                        <div className="rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-3.5">
                          <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                            <Icon name="compass" size={13} className="text-coral" /> Key Viewpoints
                          </p>
                          <p className="mt-1 text-xs leading-snug font-medium text-ink">
                            {meta ? meta.keyAttractions : day.stops.map((s) => s.name).join(", ")}
                          </p>
                        </div>

                        {/* 4. Critical Logistics (Highlighted Card) */}
                        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5">
                          <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-amber-900">
                            <Icon name="shield" size={13} className="text-amber-700" /> Critical Logistics & Notes
                          </p>
                          <p className="mt-1 text-xs leading-snug font-medium text-amber-950">
                            {meta ? meta.criticalLogistics : "Keep photo IDs handy and carry sufficient local currency."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. EXPEDITION LOOP SCHEMATIC (MAP & TABLE) */}
      <section className="py-14 bg-white border-b border-[#E5E2DC]">
        <div className="container-site max-w-6xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#BA4A38]">ROUTE GEOGRAPHY & NAVIGATION</p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-medium text-ink">Expedition Loop Schematic</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#555]">
              The full 1,180 km circuit starting in Shimla, threading the Hindustan–Tibet Highway across Kinnaur, traversing Spiti from east to west, and exiting into Kullu via the Atal Tunnel.
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            {/* Visual Schematic Diagram */}
            <div className="rounded-2xl border border-[#E5E2DC] bg-[#FAF9F6] p-6 lg:col-span-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink mb-4">Topological Waypoint Loop</p>
                
                {/* Visual SVG Waypoint Loop Schematic */}
                <div className="relative aspect-[4/3] w-full rounded-xl bg-white border border-[#E5E2DC] p-4 flex items-center justify-center">
                  <svg viewBox="0 0 400 300" className="w-full h-full">
                    {/* Circuit Outline */}
                    <path
                      d="M 80 250 L 160 230 L 250 200 L 330 160 L 320 90 L 240 60 L 160 80 L 100 130 Z"
                      fill="none"
                      stroke="#BA4A38"
                      strokeWidth="3"
                      strokeDasharray="6 4"
                    />

                    {/* High Pass Ridge */}
                    <line x1="160" y1="80" x2="240" y2="60" stroke="#DC2626" strokeWidth="4" />

                    {/* Nodes */}
                    {/* Shimla */}
                    <circle cx="80" cy="250" r="6" fill="#1C2524" />
                    <text x="75" y="275" fontSize="11" fontWeight="700" fill="#1C2524">Shimla (Start)</text>

                    {/* Sangla */}
                    <circle cx="160" cy="230" r="5" fill="#BA4A38" />
                    <text x="160" y="248" fontSize="10" fontWeight="600" fill="#555">Sangla</text>

                    {/* Kalpa */}
                    <circle cx="250" cy="200" r="5" fill="#BA4A38" />
                    <text x="255" y="215" fontSize="10" fontWeight="600" fill="#555">Kalpa</text>

                    {/* Nako */}
                    <circle cx="330" cy="160" r="5" fill="#BA4A38" />
                    <text x="335" y="165" fontSize="10" fontWeight="600" fill="#555">Nako (3,625m)</text>

                    {/* Kaza */}
                    <circle cx="320" cy="90" r="6" fill="#BA4A38" />
                    <text x="325" y="85" fontSize="11" fontWeight="700" fill="#1C2524">Kaza (3,800m)</text>

                    {/* Kunzum Pass */}
                    <circle cx="200" cy="70" r="7" fill="#DC2626" stroke="#fff" strokeWidth="2" />
                    <text x="200" y="50" textAnchor="middle" fontSize="10" fontWeight="800" fill="#DC2626">Kunzum Pass (4,590m)</text>

                    {/* Chandratal */}
                    <circle cx="160" cy="80" r="5" fill="#2563EB" />
                    <text x="110" y="75" fontSize="10" fontWeight="600" fill="#2563EB">Chandratal</text>

                    {/* Manali */}
                    <circle cx="100" cy="130" r="6" fill="#1C2524" />
                    <text x="50" y="135" fontSize="11" fontWeight="700" fill="#1C2524">Manali (Exit)</text>
                  </svg>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#E5E2DC] text-xs text-muted">
                <span className="font-semibold text-ink">Total Elevation Gain:</span> +8,400 m across 9 high passes & gorges.
              </div>
            </div>

            {/* Segment Table */}
            <div className="overflow-hidden rounded-2xl border border-[#E5E2DC] bg-white lg:col-span-7">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#FAF9F6] text-[0.6875rem] font-bold uppercase tracking-wider text-muted border-b border-[#E5E2DC]">
                  <tr>
                    <th className="py-3 px-4">Day</th>
                    <th className="py-3 px-4">Route Leg</th>
                    <th className="py-3 px-4">Distance</th>
                    <th className="py-3 px-4">Drive Time</th>
                    <th className="py-3 px-4">Road Surface</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DC]">
                  {routeSegments.map((row, i) => (
                    <tr key={i} className="hover:bg-[#FAF9F6]/50">
                      <td className="py-2.5 px-4 font-mono font-bold text-coral">{row.day}</td>
                      <td className="py-2.5 px-4 font-semibold text-ink">{row.segment}</td>
                      <td className="py-2.5 px-4 text-muted">{row.dist}</td>
                      <td className="py-2.5 px-4 text-muted">{row.time}</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                          {row.surface}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PERMITS, FUEL & MEDICAL PREPARATION */}
      <section className="py-14 bg-white border-b border-[#E5E2DC]">
        <div className="container-site max-w-6xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#BA4A38]">PRE-TRIP ESSENTIALS</p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-medium text-ink">Permits, Fuel & Medical Preparation</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#555]">
              Everything required to successfully prepare your vehicle, permits, and physiological readiness before hitting the high passes.
            </p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {prepCards.map((card, i) => (
              <div key={i} className="rounded-2xl border border-[#E5E2DC] bg-[#FAF9F6] p-5 sm:p-6 border-l-4 border-l-[#BA4A38]">
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-coral">{card.category}</p>
                <h3 className="mt-1 font-serif text-lg font-medium text-ink">{card.title}</h3>
                <p className="mt-2.5 text-xs leading-relaxed text-[#555]">{card.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. ESTIMATED BUDGET CALCULATION */}
      <section className="py-14 bg-white border-b border-[#E5E2DC]">
        <div className="container-site max-w-6xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#BA4A38]">FINANCIAL PLANNING</p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-medium text-ink">Estimated Budget Calculation</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#555]">
              Based on a 9-day circuit per person (twin sharing). Fuel costs calculated for standard diesel SUV. High-season pricing applies July through September.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {budgetTiers.map((tier, i) => (
              <div
                key={i}
                className={`relative flex flex-col justify-between rounded-2xl border p-6 ${
                  tier.featured
                    ? "border-[#BA4A38] bg-[#FAF9F6] shadow-md ring-1 ring-[#BA4A38]"
                    : "border-[#E5E2DC] bg-white shadow-xs"
                }`}
              >
                {tier.featured ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-[#BA4A38] px-3 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider text-white">
                    Most Popular
                  </span>
                ) : null}

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{tier.name}</p>
                  <p className="mt-2 font-serif text-3xl font-medium text-ink">{tier.total}</p>
                  <p className="mt-1 text-xs text-muted">{tier.subtitle}</p>

                  <ul className="mt-6 space-y-3 border-t border-[#E5E2DC] pt-5 text-xs leading-relaxed text-[#444]">
                    {tier.items.map((it, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className="mt-0.5 text-coral font-bold">✓</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E5E2DC]">
                  <Link
                    href={routes.chatWithPrompt(`Help me plan a ${tier.name} budget for ${itinerary.title}`)}
                    className={`block w-full rounded-lg py-2.5 text-center text-xs font-semibold transition ${
                      tier.featured
                        ? "bg-[#BA4A38] text-white hover:bg-[#A33F2F]"
                        : "bg-ink text-white hover:bg-black"
                    }`}
                  >
                    Calculate exact cost with AI
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section className="py-14 bg-white border-b border-[#E5E2DC]">
        <div className="container-site max-w-6xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#BA4A38]">TRAVEL ADVISORY</p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-medium text-ink">Frequently Asked Questions</h2>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-2xl border border-[#E5E2DC] bg-[#FAF9F6] p-5 sm:p-6">
                <h3 className="font-serif text-base font-semibold text-ink">{faq.q}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#555]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CONNECTED EXPEDITIONS */}
      {relatedItineraries.length > 0 && (
        <section className="py-14 bg-white border-b border-[#E5E2DC]">
          <div className="container-site max-w-6xl">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#BA4A38]">MORE EXPEDITIONS</p>
                <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-medium text-ink">Connected Himachal Expeditions</h2>
              </div>
              <Link href="/itineraries" className="text-xs font-semibold text-coral hover:underline">
                View all itineraries →
              </Link>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedItineraries.slice(0, 4).map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/itineraries/${rel.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#E5E2DC] bg-white transition hover:border-coral hover:shadow-card"
                >
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    <Image
                      src={rel.heroUrl || "/images/destinations/himachal-hero.jpg"}
                      alt={rel.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-white backdrop-blur-sm">
                      {rel.durationDays} Days
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif text-sm font-semibold text-ink group-hover:text-coral transition-colors line-clamp-2">
                        {rel.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted line-clamp-2">{rel.summary}</p>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-coral flex items-center gap-1">
                      View itinerary <Icon name="arrowRight" size={12} />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 9. OFFLINE DOSSIER DOWNLOAD CTA BANNER */}
      <section className="py-14 bg-white no-print">
        <div className="container-site max-w-6xl">
          <div className="rounded-2xl border border-[#E5E2DC] bg-[#FAF9F6] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-coral">OFFLINE READINESS</p>
              <h2 className="mt-1 font-serif text-2xl font-medium text-ink">Download Offline Expedition Dossier</h2>
              <p className="mt-1 text-sm text-[#555] max-w-xl">
                Get the printable day-by-day logistics sheet, waypoint GPX track for Garmin/Google Earth, and high-altitude emergency SOS coordinates.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isPdfGenerating}
                className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs font-semibold text-white hover:bg-black transition shadow-sm cursor-pointer"
              >
                <Icon name="fileText" size={14} />
                {isPdfGenerating ? "Preparing Dossier..." : "Download / Save PDF"}
              </button>
              <button
                type="button"
                onClick={handleDownloadGpx}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E5E2DC] bg-white px-4 py-2.5 text-xs font-semibold text-ink hover:bg-[#FAF9F6] transition shadow-xs cursor-pointer"
              >
                <Icon name="compass" size={14} />
                {gpxDownloaded ? "GPX Downloaded ✓" : "Download GPX Track"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* DOWNLOAD MODAL */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm no-print">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E2DC] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2DC]">
              <h3 className="font-serif text-lg font-medium text-ink">Download Offline Dossier</h3>
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                className="text-muted hover:text-ink text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[#555]">
              Download high-altitude offline resources for <strong>{itinerary.title}</strong> before leaving mobile network zones.
            </p>

            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isPdfGenerating}
                className="flex w-full items-center justify-between rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-3 text-left hover:border-coral transition cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold text-ink">Printable Route Guide (PDF)</p>
                  <p className="text-[0.6875rem] text-muted">Complete segment logs, elevations, stays &amp; SOS contacts</p>
                </div>
                <span className="text-coral text-xs font-semibold">
                  {isPdfGenerating ? "Preparing..." : "Download PDF →"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadGpx}
                className="flex w-full items-center justify-between rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-3 text-left hover:border-coral transition cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold text-ink">GPX Track for Garmin &amp; Google Earth</p>
                  <p className="text-[0.6875rem] text-muted">Connected tracks &amp; waypoints for passes, monasteries, and fuel</p>
                </div>
                <span className="text-coral text-xs font-semibold">
                  {gpxDownloaded ? "Downloaded ✓" : "Download GPX →"}
                </span>
              </button>
            </div>

            <div className="mt-5 text-right">
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-black cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
