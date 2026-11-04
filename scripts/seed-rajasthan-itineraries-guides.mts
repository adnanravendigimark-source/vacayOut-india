import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import {
  itineraries,
  travelGuides,
  travelGuidePlaces,
  places,
  media,
  users,
  type ItinerarySnapshot,
  type GuideSnapshot,
  type SnapshotImage,
} from "../src/lib/db/schema.js";
import { validateItinerary } from "../src/lib/itineraries/plan.js";
import { validateGuide } from "../src/lib/guides/body.js";

const imageOf = (m: any): SnapshotImage | null =>
  m
    ? {
        url: m.url,
        alt: m.alt,
        caption: m.caption,
        kind: m.kind,
        license: m.license,
        licenseUrl: m.licenseUrl,
        attribution: m.attribution,
        sourceUrl: m.sourceUrl,
      }
    : null;

async function main() {
  const db = getDb();

  // 1. Fetch Rajasthan state place
  const [raj] = await db.select().from(places).where(eq(places.slug, "rajasthan")).limit(1);
  if (!raj) {
    throw new Error("Rajasthan state place not found in database!");
  }
  console.log(`Found Rajasthan: id=${raj.id}`);

  // Fetch an admin user for publishedBy
  const [adminUser] = await db.select().from(users).limit(1);
  const actorId = adminUser?.id ?? raj.id; // fallback to place id if no user

  // Fetch child destination places for linking
  const childPlaces = await db
    .select({ id: places.id, slug: places.slug, name: places.name, heroMediaId: places.heroMediaId })
    .from(places)
    .where(eq(places.parentId, raj.id));
  const placeMap = new Map(childPlaces.map((p) => [p.slug, p]));
  console.log(`Found ${childPlaces.length} child destinations`);

  // Fetch media for hero
  const [rajMedia] = raj.heroMediaId
    ? await db.select().from(media).where(eq(media.id, raj.heroMediaId)).limit(1)
    : [];

  const jaipurPlace = placeMap.get("jaipur");
  const jodhpurPlace = placeMap.get("jodhpur");
  const udaipurPlace = placeMap.get("udaipur");
  const jaisalmerPlace = placeMap.get("jaisalmer");
  const bikanerPlace = placeMap.get("bikaner");
  const pushkarPlace = placeMap.get("pushkar");
  const ranthamborePlace = placeMap.get("ranthambore");

  const [jaipurMedia] = jaipurPlace?.heroMediaId
    ? await db.select().from(media).where(eq(media.id, jaipurPlace.heroMediaId)).limit(1)
    : [];
  const [udaipurMedia] = udaipurPlace?.heroMediaId
    ? await db.select().from(media).where(eq(media.id, udaipurPlace.heroMediaId)).limit(1)
    : [];
  const [jaisalmerMedia] = jaisalmerPlace?.heroMediaId
    ? await db.select().from(media).where(eq(media.id, jaisalmerPlace.heroMediaId)).limit(1)
    : [];

  // ==========================================
  // ITINERARY 1: Classic Rajasthan 7 Days
  // ==========================================
  const itin1Data = {
    slug: "rajasthan-classic-7-days",
    title: "Classic Rajasthan: Jaipur, Jodhpur & Udaipur in 7 Days",
    summary:
      "The definitive week-long royal circuit connecting the Pink City, the towering Blue City fortress of Mehrangarh, and the romantic white marble palaces of Lake Pichola.",
    durationDays: 7,
    tripTypes: ["heritage", "romantic"],
    seoTitle: "Classic Rajasthan 7-Day Itinerary: Jaipur, Jodhpur & Udaipur",
    seoDescription:
      "A complete 7-day Rajasthan itinerary connecting Jaipur, Jodhpur, and Udaipur with verified driving times, palace visits, heritage stays, and local tips.",
    plan: {
      overview:
        "This classic one-week route is the quintessential introduction to Rajasthan, linking three contrasting royal realms: the planned geometric pink sandstone avenues and hilltop forts of Jaipur (Dhundhar), the sun-drenched cobalt blue quarters and dramatic cliff-top fortress of Jodhpur (Marwar), and the tranquil lakeside palaces and wooded Aravalli hills of Udaipur (Mewar). With modern express highways and scenic mountain passes, travel times between hubs are comfortable and filled with magnificent en-route stops.",
      style: "Classic Heritage & Palaces",
      start: "Jaipur International Airport (JAI)",
      end: "Udaipur Maharana Pratap Airport (UDR)",
      season: "October to March (crisp sunny days, cool evenings)",
      difficulty: "Easy (chauffeured vehicle / express trains)",
      transport: "Private chauffeur-driven air-conditioned sedan or SUV",
      days: [
        {
          title: "Day 1: Arrive in Jaipur – The Pink City Core",
          summary:
            "Touch down at Jaipur Airport, check into your heritage haveli, and spend the afternoon discovering Maharaja Sawai Jai Singh II's UNESCO-listed 18th-century royal capital.",
          stops: [
            {
              name: "Hawa Mahal (Palace of Winds)",
              placeSlug: "jaipur",
              time: "02:00 PM",
              duration: "45 mins",
              note: "Admire the five-storey honeycombed sandstone facade with 953 jharokha windows overlooking Sireh Deori Bazaar.",
            },
            {
              name: "City Palace Jaipur & Jantar Mantar",
              placeSlug: "jaipur",
              time: "03:00 PM",
              duration: "2.5 hrs",
              note: "Walk through the Chandra Mahal courtyards and inspect the world's largest stone sundial at Jantar Mantar observatory.",
            },
            {
              name: "Johari Bazaar & Bapu Bazaar",
              placeSlug: "jaipur",
              time: "06:00 PM",
              duration: "2 hrs",
              note: "Explore traditional gem cutters, bandhani tie-dye textiles, and mojari leather slippers in the old walled lanes.",
            },
          ],
          travel: "Short local intra-city transfers (12 km total)",
          meals: "Lunch at 1135 AD or The Grand Peacock; dinner at LMB (Laxmi Misthan Bhandar) for authentic Rajasthani thali",
          overnight: "Jaipur (Heritage haveli in Bani Park or C-Scheme)",
          distance: "15 km",
          distanceKm: 15,
          driveTime: "45 mins within city",
        },
        {
          title: "Day 2: Hilltop Fortresses of Amer, Jaigarh & Nahargarh",
          summary:
            "Ascend the dramatic Aravalli ridges north of Jaipur to explore royal Rajput-Mughal military architecture and evening sunset ramparts.",
          stops: [
            {
              name: "Amer Fort & Palace",
              placeSlug: "jaipur",
              time: "08:30 AM",
              duration: "3 hrs",
              note: "Arrive early to beat tour crowds. Explore Ganesh Pol, the glittering Sheesh Mahal mirror palace, and view Maota Lake.",
            },
            {
              name: "Panna Meena Ka Kund",
              placeSlug: "jaipur",
              time: "12:00 PM",
              duration: "45 mins",
              note: "16th-century geometric stepwell with interlocking criss-cross staircases near Amer town.",
            },
            {
              name: "Jal Mahal Viewpoint",
              placeSlug: "jaipur",
              time: "02:30 PM",
              duration: "30 mins",
              note: "Photo stop along Amer Road of the water palace floating on the calm waters of Man Sagar Lake.",
            },
            {
              name: "Nahargarh Fort Sunset Ramparts",
              placeSlug: "jaipur",
              time: "05:00 PM",
              duration: "2 hrs",
              note: "Watch golden hour illuminate Jaipur's grid city layout from the high fortress ridge at Padao open-air cafe.",
            },
          ],
          travel: "Scenic winding uphill drive into the Aravalli range",
          meals: "Lunch at 1135 AD within Amer Fort; dinner in Jaipur",
          overnight: "Jaipur",
          distance: "35 km",
          distanceKm: 35,
          driveTime: "1.5 hrs round trip",
        },
        {
          title: "Day 3: Jaipur to Jodhpur via Ajmer & Sacred Pushkar",
          summary:
            "Drive west towards the Thar Desert threshold along NH-48 and NH-25, pausing in holy Pushkar around the sacred lake before reaching the Blue City.",
          stops: [
            {
              name: "Pushkar Brahma Temple & Holy Sarovar Lake",
              placeSlug: "pushkar",
              time: "11:30 AM",
              duration: "2 hrs",
              note: "Visit one of the world's few sanctified Brahma temples and walk down the 52 ghats circling sacred Pushkar Lake.",
            },
            {
              name: "Clock Tower & Sardar Market Jodhpur",
              placeSlug: "jodhpur",
              time: "05:30 PM",
              duration: "1.5 hrs",
              note: "Arrive in Jodhpur and explore bustling spice stalls, Mathania red chili shops, and crisp mirchi vada vendors around Ghanta Ghar.",
            },
          ],
          travel: "Smooth multi-lane highway transition from fertile plains into arid Marwar",
          meals: "Traditional kachori and lassi breakfast in Pushkar; dinner at Indique or Pal Haveli rooftop overlooking lit-up Mehrangarh",
          overnight: "Jodhpur (Heritage haveli near Makrana Mohalla or Gulab Sagar)",
          distance: "335 km",
          distanceKm: 335,
          driveTime: "About 5.5 to 6 hrs by road",
        },
        {
          title: "Day 4: Jodhpur – The Mighty Citadel of Mehrangarh",
          summary:
            "Devote the day to Marwar's invincible cliffside fortress, marble cenotaphs, and a guided walking tour through the indigo-hued Brahmin alleys of Navchokiya.",
          stops: [
            {
              name: "Mehrangarh Fort Citadel & Museum",
              placeSlug: "jodhpur",
              time: "09:00 AM",
              duration: "3 hrs",
              note: "Explore Phool Mahal, Moti Mahal, palanquin collections, and artillery ramparts 125 metres above the blue roofs.",
            },
            {
              name: "Jaswant Thada Royal Cenotaphs",
              placeSlug: "jodhpur",
              time: "12:30 PM",
              duration: "1 hr",
              note: "Intricately carved translucent Makrana white marble memorial built in 1899 by Maharaja Sardar Singh.",
            },
            {
              name: "Navchokiya Blue City Heritage Walk",
              placeSlug: "jodhpur",
              time: "04:00 PM",
              duration: "2 hrs",
              note: "Guided exploration of steep, winding alleys painted in vibrant indigo copper-sulphate wash to ward off desert heat and insects.",
            },
          ],
          travel: "Short inner-city taxi or tuk-tuk rides",
          meals: "Lunch at Gypsy Dining Hall for authentic Marwari thali; dinner at Stepwell Cafe overlooking the restored Toorji Ka Jhalra",
          overnight: "Jodhpur",
          distance: "20 km",
          distanceKm: 20,
          driveTime: "1 hr within city",
        },
        {
          title: "Day 5: Jodhpur to Udaipur via Ranakpur & Kumbhalgarh",
          summary:
            "Journey south through the verdant wooded ridges of the southern Aravalli hills, stopping at the world-renowned marble Jain temple complex of Ranakpur.",
          stops: [
            {
              name: "Ranakpur Jain Temple Complex",
              placeSlug: "udaipur",
              time: "12:00 PM",
              duration: "2 hrs",
              note: "Marvel at the 15th-century Chaumukha Temple with 1,444 individually carved marble pillars, no two of which are identical.",
            },
            {
              name: "Kumbhalgarh Fort Vista",
              placeSlug: "kumbhalgarh",
              time: "03:30 PM",
              duration: "1.5 hrs",
              note: "Inspect the formidable 36-km fortified perimeter wall—the second longest continuous wall in the world after the Great Wall of China.",
            },
          ],
          travel: "Picturesque, winding mountain road through lush valleys of Godwar and Mewar",
          meals: "Pure vegetarian Rajasthani lunch at Ranakpur temple bhojanshala or King's Abode; lakeside dinner in Udaipur",
          overnight: "Udaipur (Lakeside heritage hotel along Lake Pichola)",
          distance: "260 km",
          distanceKm: 260,
          driveTime: "About 5.5 to 6 hrs with temple stop",
        },
        {
          title: "Day 6: Udaipur – City Palace & Lake Pichola",
          summary:
            "Experience the Venice of the East with a morning tour of Rajasthan's largest royal palace complex followed by an atmospheric evening boat ride on Pichola.",
          stops: [
            {
              name: "City Palace Udaipur & Museum",
              placeSlug: "udaipur",
              time: "09:30 AM",
              duration: "3 hrs",
              note: "A 400-year architectural marvel combining Rajput and Mughal styles, featuring Peacock Courtyard (Mor Chowk) and crystal galleries.",
            },
            {
              name: "Jagdish Temple & Old City Bazaars",
              placeSlug: "udaipur",
              time: "01:00 PM",
              duration: "1 hr",
              note: "1651 carved stone Vishnu temple, followed by walking through miniature painting workshops in the surrounding lanes.",
            },
            {
              name: "Sunset Boat Cruise on Lake Pichola to Jag Mandir",
              placeSlug: "udaipur",
              time: "04:45 PM",
              duration: "1.5 hrs",
              note: "Board boats from Rameshwar Ghat to cruise past the Lake Palace and explore the island palace of Jag Mandir.",
            },
            {
              name: "Dharohar Folk Dance at Bagore Ki Haveli",
              placeSlug: "udaipur",
              time: "07:00 PM",
              duration: "1 hr",
              note: "High-energy evening Rajasthani folk music, Chari fire dance, and Bhavai earthen pot balancing performance.",
            },
          ],
          travel: "Mostly on foot around Pichola waterfront and old city lanes",
          meals: "Lunch at Jheel's Gingerfield Rooftop Cafe; romantic dinner at Ambrai or Upre overlooking lit palace facades",
          overnight: "Udaipur",
          distance: "10 km",
          distanceKm: 10,
          driveTime: "30 mins",
        },
        {
          title: "Day 7: Udaipur – Gardens, Monsoon Palace & Departure",
          summary:
            "Visit the royal maidens' gardens and the hilltop Monsoon Palace before catching your flight home from Maharana Pratap Airport.",
          stops: [
            {
              name: "Saheliyon-ki-Bari (Courtyard of the Maidens)",
              placeSlug: "udaipur",
              time: "09:00 AM",
              duration: "1.5 hrs",
              note: "Walk through royal ornamental gardens featuring marble elephant fountains, lotus pools, and shaded pavilions.",
            },
            {
              name: "Sajjangarh (Monsoon Palace)",
              placeSlug: "udaipur",
              time: "11:00 AM",
              duration: "1.5 hrs",
              note: "Perched 944 metres atop Bansdara Peak, offering sweeping 360-degree vistas across Udaipur's lakes and surrounding mountains.",
            },
          ],
          travel: "Drive to Maharana Pratap Airport (UDR) located 24 km east of city center",
          meals: "Early lunch at Tribute Restaurant near Lake Fateh Sagar",
          overnight: "Departure flight home",
          distance: "40 km",
          distanceKm: 40,
          driveTime: "1 hr to airport",
        },
      ],
      budget: {
        assumptions:
          "Estimated per couple for 7 days / 6 nights. Includes private chauffeured AC sedan, mid-to-upscale heritage hotels, monument composite tickets, boat cruises, and all meals.",
        lines: [
          { label: "Heritage Havelis & Boutique Hotels (6 Nights)", amount: "₹42,000 – ₹72,000", basis: "₹7,000 – ₹12,000/night with breakfast" },
          { label: "Private Dedicated Sedan & Driver (7 Days)", amount: "₹28,000 – ₹35,000", basis: "All tolls, parking, fuel, inter-city allowances included" },
          { label: "Monument Entries, Audio Guides & Boat Cruise", amount: "₹6,500 – ₹10,000", basis: "Palace composite tickets, audio headsets, Jag Mandir boat" },
          { label: "Dining, Street Food & Rooftop Dinners", amount: "₹18,000 – ₹28,000", basis: "Mix of local thalis, cafes, and scenic dinner spots" },
          { label: "Total Estimated Trip Cost (2 Travellers)", amount: "₹94,500 – ₹1,45,000", basis: "Comfortable mid-to-upscale independent travel" },
        ],
      },
      booking: [
        { item: "Amer Fort & City Palace", detail: "Buy composite tickets online via Rajasthan Tourism to skip main entry queues." },
        { item: "Lake Pichola Sunset Boat Cruise", detail: "Book 1 day in advance at City Palace jetty during October–March peak season." },
        { item: "Heritage Havelis in Udaipur & Jodhpur", detail: "Reserve boutique lake-view or fort-view rooms 4–8 weeks ahead for winter months." },
        { item: "Bagore Ki Haveli Dharohar Show", detail: "Ticket counter opens at 05:30 PM for 07:00 PM show; arrive early as seating is limited." },
      ],
      alternatives: [
        "Take the morning Vande Bharat Express from Jaipur to Jodhpur instead of driving if you wish to bypass Pushkar.",
        "Add an extra night in Kumbhalgarh or Mount Abu if you prefer deeper nature hikes in the Aravallis.",
        "For luxury travellers, replace boutique havelis with Taj Lake Palace (Udaipur), Umaid Bhawan Palace (Jodhpur), and Rambagh Palace (Jaipur).",
      ],
      tips: [
        "Hire official ASI guides wearing government ID badges inside Amer Fort and City Palace Udaipur; agree on rate beforehand (₹500–₹800).",
        "Dress respectfully with covered shoulders and knees at Pushkar Ghats and Ranakpur Jain Temple (leather items must be deposited at temple entrance).",
        "Keep small cash notes (₹10, ₹20, ₹50) handy for shoe-keeping counters, tips, and street delicacies.",
      ],
      prep: [
        {
          title: "Weather & Packing",
          body: "Winter months (Nov–Feb) bring warm 25°C sunny afternoons but nights drop to 8°C–12°C. Pack layers, light woollens, sunglasses, sun hat, and comfortable walking shoes for cobbled stone inclines.",
        },
        {
          title: "Transport & Driving",
          body: "Hiring a private car with driver from Jaipur to Udaipur is the smoothest option; drivers know the best highway refreshment dhabas and handle parking near walled city gates.",
        },
      ],
      faqs: [
        {
          q: "Is 7 days enough for Jaipur, Jodhpur, and Udaipur?",
          a: "Yes, 7 days is the ideal minimum timeframe to explore Rajasthan's 'Golden Triangle extension' without feeling rushed, dedicating 2 nights to Jaipur, 2 nights to Jodhpur, and 2 nights to Udaipur.",
        },
        {
          q: "What is the best way to travel between these cities?",
          a: "A private chauffeur-driven vehicle offers maximum flexibility to visit en-route jewels like Pushkar, Ranakpur, and Kumbhalgarh that cannot be easily reached by train.",
        },
      ],
    },
  };

  // ==========================================
  // ITINERARY 2: Grand Desert 10 Days
  // ==========================================
  const itin2Data = {
    slug: "rajasthan-grand-desert-10-days",
    title: "Grand Desert & Forts: Jaipur, Bikaner, Jaisalmer & Jodhpur in 10 Days",
    summary:
      "A 10-day desert odyssey tracing royal trade routes across Dhundhar, the painted merchant havelis of Shekhawati, the golden dunes of Jaisalmer, and the sun fortress of Marwar.",
    durationDays: 10,
    tripTypes: ["heritage", "adventure"],
    seoTitle: "Rajasthan 10-Day Grand Desert Itinerary: Jaipur to Jaisalmer",
    seoDescription:
      "Follow this complete 10-day Rajasthan desert route guide linking Jaipur, Shekhawati havelis, Bikaner Junagarh Fort, Jaisalmer Thar dunes, and Jodhpur Mehrangarh.",
    plan: {
      overview:
        "For travellers seeking the vast, atmospheric mystery of the Thar Desert, this 10-day expedition ventures deep into Rajasthan's desert outposts. Journey from Jaipur through the open-air fresco galleries of Shekhawati to the unvanquished desert bastion of Bikaner, before crossing the heart of the Great Thar to Jaisalmer's golden living citadel and undulating sand dunes, culminating beneath the colossal cliff walls of Jodhpur.",
      style: "Desert Odyssey & Fortresses",
      start: "Jaipur (JAI)",
      end: "Jodhpur (JDH)",
      season: "October to March (desert nights are cold and star-filled; avoid summer heat)",
      difficulty: "Moderate (longer road journeys across desert plains)",
      transport: "Private chauffeur-driven SUV (Innova Crysta recommended for desert routes)",
      days: [
        {
          title: "Day 1: Arrive Jaipur – Walled Pink City Gateways",
          summary: "Arrive in Jaipur, settle into your hotel, and begin with the vibrant old city bazaars and Hawa Mahal facade.",
          stops: [
            { name: "Hawa Mahal & Johari Bazaar", placeSlug: "jaipur", time: "03:00 PM", duration: "3 hrs", note: "Introduction to Pink City street life and heritage markets." },
          ],
          travel: "Airport to hotel transfer",
          overnight: "Jaipur",
          distance: "15 km",
          distanceKm: 15,
          driveTime: "40 mins",
        },
        {
          title: "Day 2: Jaipur – Amer Citadel & Jaigarh Cannon",
          summary: "Full day dedicated to the medieval royal fortresses guarding the northern approaches to Jaipur.",
          stops: [
            { name: "Amer Fort & Sheesh Mahal", placeSlug: "jaipur", time: "09:00 AM", duration: "3 hrs", note: "Hilltop Rajput palace with ornate courtyards." },
            { name: "Jaigarh Fort & Jaivana Cannon", placeSlug: "jaipur", time: "01:30 PM", duration: "2 hrs", note: "Fortress perched above Amer housing the world's largest wheeled cannon." },
          ],
          travel: "Short mountain drives north of Jaipur",
          overnight: "Jaipur",
          distance: "30 km",
          distanceKm: 30,
          driveTime: "1 hr",
        },
        {
          title: "Day 3: Jaipur to Shekhawati (Mandawa) – Painted Havelis",
          summary: "Drive northwest into the Shekhawati region, renowned as the world's largest open-air art gallery of merchant mansions.",
          stops: [
            { name: "Mandawa & Nawalgarh Havelis", placeSlug: "jaipur", time: "02:00 PM", duration: "3.5 hrs", note: "Examine vibrant wall frescoes depicting mythology, train locomotives, and British colonial scenes on merchant courtyards." },
          ],
          travel: "Smooth rural highway through arid landscape (170 km, 3.5 hrs)",
          overnight: "Mandawa / Shekhawati (Restored heritage haveli)",
          distance: "170 km",
          distanceKm: 170,
          driveTime: "3.5 hrs",
        },
        {
          title: "Day 4: Mandawa to Bikaner – Junagarh Fort & Camel Research Centre",
          summary: "Head west into the desert city of Bikaner, founded by Rao Bika in 1488, famous for its red sandstone fort and savoury snacks.",
          stops: [
            { name: "Junagarh Fort", placeSlug: "bikaner", time: "01:30 PM", duration: "2.5 hrs", note: "One of the few major forts in Rajasthan not built on a hill, never captured by invaders, boasting dazzling Anup Mahal gold leaf work." },
            { name: "National Camel Research Centre", placeSlug: "bikaner", time: "04:30 PM", duration: "1.5 hrs", note: "Asia's only camel breeding station; sample fresh camel milk ice cream." },
          ],
          travel: "Drive west via Fatehpur (190 km, 3.5 hrs)",
          overnight: "Bikaner (Heritage hotel e.g. Bhanwar Niwas or Laxmi Niwas Palace)",
          distance: "190 km",
          distanceKm: 190,
          driveTime: "3.5 hrs",
        },
        {
          title: "Day 5: Bikaner to Jaisalmer – Across the Great Thar",
          summary: "Embark on an epic drive through the stark beauty of the deep Thar Desert toward the fabled Golden City on the ancient Silk Route.",
          stops: [
            { name: "Karni Mata Temple Deshnoke (Optional stop)", placeSlug: "bikaner", time: "08:30 AM", duration: "1 hr", note: "Famed rat temple 30 km south of Bikaner housing revered sacred white rats." },
            { name: "First View of Jaisalmer Golden Citadel", placeSlug: "jaisalmer", time: "04:30 PM", duration: "1 hr", note: "Golden sandstone battlements rising like a mirage above the desert horizon." },
          ],
          travel: "Vast desert highways across Pokhran (330 km, 5.5 hrs)",
          overnight: "Jaisalmer (Haveli within or overlooking the fort)",
          distance: "330 km",
          distanceKm: 330,
          driveTime: "5.5 hrs",
        },
        {
          title: "Day 6: Jaisalmer – The Living Golden Citadel & Merchant Mansions",
          summary: "Walk the narrow flagstone streets of Sonar Qila, where one-fourth of Jaisalmer's population still resides inside the medieval ramparts.",
          stops: [
            { name: "Jaisalmer Fort (Sonar Qila) & Jain Temples", placeSlug: "jaisalmer", time: "09:00 AM", duration: "3 hrs", note: "12th-century living fort with 7 interconnected yellow sandstone Jain temples dating from the 12th to 15th centuries." },
            { name: "Patwon Ki Haveli", placeSlug: "jaisalmer", time: "02:00 PM", duration: "1.5 hrs", note: "Cluster of five ornate merchant mansions with intricate jali stonework resembling delicate lace." },
            { name: "Gadisar Lake at Sunset", placeSlug: "jaisalmer", time: "05:30 PM", duration: "1.5 hrs", note: "Historic rainwater reservoir ringed by carved chhatris and pavilions." },
          ],
          travel: "Short rides or walking in pedestrianized old city",
          overnight: "Jaisalmer",
          distance: "15 km",
          distanceKm: 15,
          driveTime: "30 mins",
        },
        {
          title: "Day 7: Thar Desert – Sam Sand Dunes & Starlit Camp",
          summary: "Venture 40 km west of Jaisalmer toward the rolling rippled sand dunes for a camel trek, sunset, and overnight luxury Swiss tent glamping.",
          stops: [
            { name: "Kuldhara Abandoned Village", placeSlug: "jaisalmer", time: "02:00 PM", duration: "1 hr", note: "Mysterious 13th-century Paliwal Brahmin ghost town abandoned overnight in 1825." },
            { name: "Sam Sand Dunes Camel Safari & Sunset", placeSlug: "jaisalmer", time: "04:30 PM", duration: "2.5 hrs", note: "Ride camels across wind-sculpted sand dunes as the desert horizon turns fiery crimson." },
            { name: "Kalbelia Folk Performance & Campfire", placeSlug: "jaisalmer", time: "07:30 PM", duration: "2 hrs", note: "Traditional desert gypsy dance and Manganiyar musical recitals beneath starry desert skies." },
          ],
          travel: "Drive west into the Thar dunes (45 km, 1 hr)",
          overnight: "Thar Desert Luxury Camp (Sam or Khuri Dunes)",
          distance: "50 km",
          distanceKm: 50,
          driveTime: "1 hr",
        },
        {
          title: "Day 8: Jaisalmer to Jodhpur – Marwar Gateway",
          summary: "Depart the desert dunes and travel east to Jodhpur, stopping at the 8th-century sculpted temples of Osian on the desert fringe.",
          stops: [
            { name: "Osian Sun Temple & Sachiya Mata Complex", placeSlug: "jodhpur", time: "01:30 PM", duration: "1.5 hrs", note: "Ancient desert oasis settlement with finely carved Gurjara-Pratihara temples." },
            { name: "Toorji Ka Jhalra Stepwell Jodhpur", placeSlug: "jodhpur", time: "05:30 PM", duration: "1 hr", note: "Restored 1740s geometric stepwell in the heart of Jodhpur's old bazaar." },
          ],
          travel: "Smooth desert highway eastward (280 km, 4.5 hrs)",
          overnight: "Jodhpur",
          distance: "280 km",
          distanceKm: 280,
          driveTime: "4.5 hrs",
        },
        {
          title: "Day 9: Jodhpur – The Blue City & Mehrangarh Citadel",
          summary: "Explore the towering ramparts of Mehrangarh, Jaswant Thada, and the cobalt-blue painted lanes of Navchokiya.",
          stops: [
            { name: "Mehrangarh Fort & Museum", placeSlug: "jodhpur", time: "09:00 AM", duration: "3 hrs", note: "Towering cliff-top fortress with world-class miniature paintings and armoury." },
            { name: "Jaswant Thada & Rao Jodha Desert Rock Park", placeSlug: "jodhpur", time: "02:30 PM", duration: "2.5 hrs", note: "Translucent marble memorial and restored native Thar Desert ecology park." },
          ],
          travel: "Inner-city transfers",
          overnight: "Jodhpur",
          distance: "20 km",
          distanceKm: 20,
          driveTime: "1 hr",
        },
        {
          title: "Day 10: Jodhpur – Bishnoi Village Safari & Departure",
          summary: "Conclude with an morning jeep safari to indigenous Bishnoi eco-communities and traditional weavers before heading to Jodhpur Airport.",
          stops: [
            { name: "Bishnoi Village Safari (Guda Bishnoiyan)", placeSlug: "jodhpur", time: "08:30 AM", duration: "3 hrs", note: "Learn about the legendary 29 tenets of the Bishnoi ecology creed, spot blackbuck antelopes, and meet durrie rug weavers." },
          ],
          travel: "Transfer to Jodhpur Civil Airport (JDH)",
          overnight: "Departure flight",
          distance: "40 km",
          distanceKm: 40,
          driveTime: "1 hr to airport",
        },
      ],
      budget: {
        assumptions:
          "Estimated per couple for 10 days / 9 nights. Includes private chauffeured AC SUV, mix of heritage havelis and 1 night luxury desert camp, all monument tickets, safaris, and meals.",
        lines: [
          { label: "Heritage Hotels & Luxury Desert Camp (9 Nights)", amount: "₹65,000 – ₹1,10,000", basis: "Quality heritage havelis + full Swiss tent camp with dinner" },
          { label: "Private Dedicated SUV & Driver (10 Days)", amount: "₹45,000 – ₹55,000", basis: "Innova Crysta covering ~1,200 km desert route with all permits" },
          { label: "Camel Safaris, Jeep Safari & Monuments", amount: "₹12,000 – ₹18,000", basis: "Sam dune camel ride, Bishnoi jeep, fort tickets & audio guides" },
          { label: "Meals & Traditional Desert Dining", amount: "₹25,000 – ₹40,000", basis: "Dal Baati Churma, Ker Sangri, and local dhabas" },
          { label: "Total Estimated Trip Cost (2 Travellers)", amount: "₹1,47,000 – ₹2,23,000", basis: "High-comfort desert exploration trip" },
        ],
      },
      booking: [
        { item: "Desert Camp in Sam or Khuri", detail: "Book reputable eco-camps (e.g. Damodra Desert Camp or The Serai) well ahead for December & January." },
        { item: "Junagarh Fort & Mehrangarh Audio Guides", detail: "Available at fort ticketing booths; widely rated among the finest audio tours in India." },
      ],
      alternatives: [
        "Extend by 2 days into Hadoti to visit Bundi's stepwells and Ranthambore tiger safaris.",
        "Include the sacred rat temple at Deshnoke on Day 4 or 5 if interested in unique spiritual traditions.",
      ],
      tips: [
        "Desert nights between December and January can reach 3°C–6°C; carry thermal base layers and a warm windproof jacket for the desert camp.",
        "Opt for a camel safari at sunrise or sunset rather than noon to avoid direct sun exposure and get the best desert photography light.",
      ],
      prep: [
        {
          title: "Desert Roads & Vehicle Choice",
          body: "Distances between desert towns are substantial (300+ km). Hire a comfortable vehicle with good air conditioning and reliable tyres.",
        },
        {
          title: "Cash & Connectivity in Desert Areas",
          body: "While Jaipur and Jodhpur have excellent 5G and card acceptance, deep desert camps around Sam have intermittent signal; carry ₹5,000 in cash.",
        },
      ],
      faqs: [
        {
          q: "Is it safe to stay overnight in the Jaisalmer desert?",
          a: "Yes, established luxury desert camps in Sam and Khuri are safe, gated, and fully serviced with attached private western bathrooms and security.",
        },
        {
          q: "Can this circuit be done by train?",
          a: "While Jaipur, Bikaner, Jaisalmer, and Jodhpur are connected by express trains, having a private car allows you to explore Shekhawati havelis, Osian temples, and desert camps seamlessly.",
        },
      ],
    },
  };

  // Validate both itineraries
  const v1 = validateItinerary({
    slug: itin1Data.slug,
    title: itin1Data.title,
    summary: itin1Data.summary,
    durationDays: itin1Data.durationDays,
    tripTypes: itin1Data.tripTypes,
    seoTitle: itin1Data.seoTitle,
    seoDescription: itin1Data.seoDescription,
    plan: itin1Data.plan,
  });
  if (!v1.ok) {
    throw new Error(`Itinerary 1 validation failed: ${v1.error}`);
  }
  console.log("✓ Itinerary 1 validated successfully!");

  const v2 = validateItinerary({
    slug: itin2Data.slug,
    title: itin2Data.title,
    summary: itin2Data.summary,
    durationDays: itin2Data.durationDays,
    tripTypes: itin2Data.tripTypes,
    seoTitle: itin2Data.seoTitle,
    seoDescription: itin2Data.seoDescription,
    plan: itin2Data.plan,
  });
  if (!v2.ok) {
    throw new Error(`Itinerary 2 validation failed: ${v2.error}`);
  }
  console.log("✓ Itinerary 2 validated successfully!");

  // Insert or update Itinerary 1
  const itin1Snapshot: ItinerarySnapshot = {
    slug: itin1Data.slug,
    title: itin1Data.title,
    summary: itin1Data.summary,
    durationDays: itin1Data.durationDays,
    tripTypes: itin1Data.tripTypes,
    seoTitle: itin1Data.seoTitle,
    seoDescription: itin1Data.seoDescription,
    plan: itin1Data.plan as any,
    sources: [],
    hero: imageOf(udaipurMedia || rajMedia),
    place: {
      name: raj.name,
      slug: raj.slug,
      kind: "state",
      stateSlug: raj.slug,
      stateName: raj.name,
      path: `/india/${raj.slug}`,
    },
  };

  const [existingItin1] = await db.select().from(itineraries).where(eq(itineraries.slug, itin1Data.slug)).limit(1);
  if (existingItin1) {
    await db
      .update(itineraries)
      .set({
        placeId: raj.id,
        title: itin1Data.title,
        summary: itin1Data.summary,
        durationDays: itin1Data.durationDays,
        tripTypes: itin1Data.tripTypes,
        plan: itin1Data.plan as any,
        seoTitle: itin1Data.seoTitle,
        seoDescription: itin1Data.seoDescription,
        heroMediaId: udaipurPlace?.heroMediaId || raj.heroMediaId,
        status: "published",
        publishedSnapshot: itin1Snapshot,
        publishedAt: new Date(),
        publishedBy: actorId,
        updatedAt: new Date(),
      })
      .where(eq(itineraries.id, existingItin1.id));
    console.log(`Updated published itinerary 1 (${itin1Data.slug})`);
  } else {
    await db.insert(itineraries).values({
      slug: itin1Data.slug,
      placeId: raj.id,
      title: itin1Data.title,
      summary: itin1Data.summary,
      durationDays: itin1Data.durationDays,
      tripTypes: itin1Data.tripTypes,
      plan: itin1Data.plan as any,
      seoTitle: itin1Data.seoTitle,
      seoDescription: itin1Data.seoDescription,
      heroMediaId: udaipurPlace?.heroMediaId || raj.heroMediaId,
      status: "published",
      publishedSnapshot: itin1Snapshot,
      publishedAt: new Date(),
      publishedBy: actorId,
    });
    console.log(`Inserted published itinerary 1 (${itin1Data.slug})`);
  }

  // Insert or update Itinerary 2
  const itin2Snapshot: ItinerarySnapshot = {
    slug: itin2Data.slug,
    title: itin2Data.title,
    summary: itin2Data.summary,
    durationDays: itin2Data.durationDays,
    tripTypes: itin2Data.tripTypes,
    seoTitle: itin2Data.seoTitle,
    seoDescription: itin2Data.seoDescription,
    plan: itin2Data.plan as any,
    sources: [],
    hero: imageOf(jaisalmerMedia || rajMedia),
    place: {
      name: raj.name,
      slug: raj.slug,
      kind: "state",
      stateSlug: raj.slug,
      stateName: raj.name,
      path: `/india/${raj.slug}`,
    },
  };

  const [existingItin2] = await db.select().from(itineraries).where(eq(itineraries.slug, itin2Data.slug)).limit(1);
  if (existingItin2) {
    await db
      .update(itineraries)
      .set({
        placeId: raj.id,
        title: itin2Data.title,
        summary: itin2Data.summary,
        durationDays: itin2Data.durationDays,
        tripTypes: itin2Data.tripTypes,
        plan: itin2Data.plan as any,
        seoTitle: itin2Data.seoTitle,
        seoDescription: itin2Data.seoDescription,
        heroMediaId: jaisalmerPlace?.heroMediaId || raj.heroMediaId,
        status: "published",
        publishedSnapshot: itin2Snapshot,
        publishedAt: new Date(),
        publishedBy: actorId,
        updatedAt: new Date(),
      })
      .where(eq(itineraries.id, existingItin2.id));
    console.log(`Updated published itinerary 2 (${itin2Data.slug})`);
  } else {
    await db.insert(itineraries).values({
      slug: itin2Data.slug,
      placeId: raj.id,
      title: itin2Data.title,
      summary: itin2Data.summary,
      durationDays: itin2Data.durationDays,
      tripTypes: itin2Data.tripTypes,
      plan: itin2Data.plan as any,
      seoTitle: itin2Data.seoTitle,
      seoDescription: itin2Data.seoDescription,
      heroMediaId: jaisalmerPlace?.heroMediaId || raj.heroMediaId,
      status: "published",
      publishedSnapshot: itin2Snapshot,
      publishedAt: new Date(),
      publishedBy: actorId,
    });
    console.log(`Inserted published itinerary 2 (${itin2Data.slug})`);
  }

  // ==========================================
  // TRAVEL GUIDES FOR RAJASTHAN
  // ==========================================
  const guide1Data = {
    slug: "how-to-plan-first-trip-to-rajasthan",
    title: "How to Plan Your First Trip to Rajasthan: The Complete Starter Guide",
    summary:
      "Essential planning advice for first-time travellers covering classic circuits, booking trains and private cars, selecting authentic heritage havelis, and key cultural etiquette.",
    tripTypes: ["heritage", "food"],
    seoTitle: "Planning Your First Trip to Rajasthan: Practical Starter Guide",
    seoDescription:
      "Everything you need to plan your first journey through Rajasthan: essential circuits, heritage hotels, private car tips, dress codes, and budget expectations.",
    body: {
      intro:
        "Visiting Rajasthan for the first time is one of the world's most intoxicating travel experiences. As India's largest state by landmass, spanning 342,239 square kilometres from the fertile Yamuna basin to the wind-swept sands of the Pakistan frontier, attempting to cover everything on a single trip is the most common mistake travellers make. This guide outlines how to plan a realistic first journey, choose the right circuit, navigate transport comfortably, and immerse yourself in royal Rajput hospitality.",
      sections: [
        {
          heading: "Choosing the Right Circuit for Your Timeframe",
          text: "Rajasthan divides naturally into distinct historical regions with varying landscapes. Rather than crisscrossing the state on exhausting overnight drives, focus on a coherent geographical corridor matched to your available days:",
          items: [
            {
              title: "The Golden Triangle Extension (6–7 Days)",
              body: "Delhi – Agra – Jaipur – Pushkar – Jodhpur. The most popular introductory route combining Mughal grandeur with Rajput fortresses.",
            },
            {
              title: "The Royal Citadel & Lakes Circuit (7–8 Days)",
              body: "Jaipur – Jodhpur – Ranakpur – Udaipur. Balances monumental desert fortresses with romantic lakeside palaces and mountain temples.",
            },
            {
              title: "The Grand Desert Odyssey (10–12 Days)",
              body: "Jaipur – Shekhawati (Mandawa) – Bikaner – Jaisalmer – Jodhpur – Udaipur. The comprehensive route venturing deep into the Thar Desert.",
            },
          ],
        },
        {
          heading: "Getting Around: Private Chauffeur vs Express Trains",
          text: "Transportation defines your experience in Rajasthan. While trains connect primary stations efficiently, hiring a dedicated private car with driver remains the gold standard for independent travellers.",
          items: [
            {
              title: "Chauffeured Private Car (Recommended)",
              body: "An air-conditioned sedan (Maruti Dzire) costs ₹3,500–₹4,200/day, while a spacious SUV (Toyota Innova Crysta) runs ₹5,000–₹6,500/day including fuel, tolls, and driver allowance. It grants complete freedom to pause at stepwells, temples, and roadside dhabas.",
            },
            {
              title: "Vande Bharat & Shatabdi Express Trains",
              body: "Ideal for swift city-to-city hops such as Delhi to Jaipur (3 hrs 15 mins) and Jaipur to Jodhpur (4 hrs 15 mins). Always book AC Chair Car or Executive Class 3–6 weeks in advance via IRCTC.",
            },
            {
              title: "Self-Driving (Not Recommended)",
              body: "Heavy highway truck traffic, wandering livestock, unmarked speed bumps, and aggressive overtaking make self-driving stressful for visitors unfamiliar with Indian roads.",
            },
          ],
        },
        {
          heading: "Where to Stay: Choosing Authentic Heritage Havelis",
          text: "Rajasthan is home to India's finest heritage hotel movement, where centuries-old aristocratic mansions (havelis), hunting lodges, and royal fortresses have been converted into guest accommodations.",
          items: [
            {
              title: "Boutique Heritage Havelis (₹4,000 – ₹9,000/night)",
              body: "Atmospheric family-run properties with carved sandstone courtyards, traditional stained-glass jharokhas, and intimate rooftop dining overlooking forts or lakes.",
            },
            {
              title: "Grand Royal Palaces (₹25,000 – ₹75,000+/night)",
              body: "Legendary properties operated by Taj and Oberoi—such as Taj Lake Palace in Udaipur, Umaid Bhawan Palace in Jodhpur, and Rambagh Palace in Jaipur—delivering unmatched royal luxury.",
            },
          ],
        },
        {
          heading: "Cultural Etiquette, Temple Customs & Scams to Avoid",
          text: "Rajasthanis are deeply courteous and hospitable, but respecting sacred customs ensures warm interactions:",
          items: [
            {
              title: "Temple & Shrine Dress Codes",
              body: "Dress modestly with shoulders and knees covered. Remove footwear before entering temples. At Jain temples (such as Ranakpur), all leather goods (belts, wallets, watchstraps) must be deposited outside.",
            },
            {
              title: "Pushkar Lake Flower Offering Scam",
              body: "At Pushkar's sacred ghats, self-appointed 'priests' offer flower petals for a blessing, then aggressively demand donations of ₹1,000–₹5,000. Firmly decline with a polite 'Nahi chahiye' (not needed).",
            },
            {
              title: "Gem & Textile Touts in Jaipur",
              body: "Tuk-tuk drivers often push passengers to visit specific gemstone or carpet emporiums where they earn 30% commissions. Insist on visiting your chosen destination.",
            },
          ],
        },
      ],
      checklist: [
        "Apply for Indian Visa / eVisa at least 3 weeks before departure",
        "Book winter heritage hotel rooms (Oct–March) 1 to 2 months ahead",
        "Pack layers: light breathable daytime clothes, plus a warm fleece for cold desert evenings",
        "Carry a universal adapter and power bank for long sightseeing days",
        "Keep small rupee cash notes handy for tips, shoe counters, and street tea",
      ],
    },
  };

  const guide2Data = {
    slug: "best-time-to-visit-rajasthan",
    title: "Best Time to Visit Rajasthan: Season-by-Season Weather & Festival Guide",
    summary:
      "Month-by-month climate breakdown across desert plains and Aravalli hills, detailing winter festival peaks, monsoon greenery in Udaipur, and avoiding extreme summer heat.",
    tripTypes: ["heritage", "spiritual"],
    seoTitle: "Best Time to Visit Rajasthan: Weather & Festival Guide",
    seoDescription:
      "Find the best month to visit Rajasthan: winter highs and lows, monsoon lake season in Udaipur, festive celebrations like Pushkar Camel Fair, and travel tips.",
    body: {
      intro:
        "Climate in Rajasthan is profoundly seasonal and sharply divided by the Aravalli mountain range. While the arid western Thar Desert experiences dramatic temperature swings, the southern lake district around Udaipur enjoys a milder, semi-tropical highland climate. Choosing the right month shapes whether your journey is spent in crisp sunshine or exhausting desert heat.",
      sections: [
        {
          heading: "Winter Peak Season: October to March (Best Time to Visit)",
          text: "Winter is the universally recommended travel window across the entire state. Days are bright, clear, and comfortably warm (22°C to 28°C), while nights become crisply cool (8°C to 14°C, dropping to 3°C in Jaisalmer desert camps during December and January). All outdoor monuments, wildlife parks, and desert safaris operate at full capacity.",
          items: [
            {
              title: "October & November",
              body: "Clear post-monsoon skies, lush Aravalli hillsides, and comfortable daytime temperatures before the peak tourist rush.",
            },
            {
              title: "December & January",
              body: "Peak international and domestic tourist volume. Chilly desert nights require jackets. Book hotels and train tickets well ahead.",
            },
            {
              title: "February & March",
              body: "Pleasantly warming weather, vibrant blooming mustard fields, and festive celebrations culminating in Holi.",
            },
          ],
        },
        {
          heading: "Monsoon Season: July to September (Mewar's Hidden Gem)",
          text: "While western desert outposts receive sparse rainfall, southern Rajasthan (Udaipur, Kumbhalgarh, Mount Abu) transforms into a vibrant green wonderland with full lakes and cascading waterfalls.",
          items: [
            {
              title: "Why Visit Udaipur in Monsoon",
              body: "Lake Pichola and Fateh Sagar fill to their brims, the Monsoon Palace (Sajjangarh) floats among swirling mist clouds, and luxury palace hotel rates drop by 30% to 50%.",
            },
          ],
        },
        {
          heading: "Summer Season: April to June (Extreme Heat – Off-Peak)",
          text: "Summer brings scorching desert conditions with temperatures frequently exceeding 42°C to 46°C across Jodhpur, Jaisalmer, and Bikaner. Sightseeing is limited to early mornings before 10:00 AM.",
          items: [
            {
              title: "Only Sanctuary: Mount Abu",
              body: "Rajasthan's only hill station sits at 1,220 metres in the southern Aravallis, offering a pleasant alpine retreat at 28°C–32°C when the plains swelter.",
            },
          ],
        },
        {
          heading: "Key Cultural Festivals & Fair Dates",
          text: "Timing your trip with a Rajasthani cultural fair provides an unforgettable spectacle of folk music, camel trading, and vibrant costumes:",
          items: [
            {
              title: "Pushkar Camel Fair (Kartik Purnima, Oct/Nov)",
              body: "Over 50,000 camels, horses, and cattle converge on the desert sands alongside traditional turban-tying competitions and spiritual bathing.",
            },
            {
              title: "Jaisalmer Desert Festival (Jan/Feb)",
              body: "Three-day extravaganza on Sam Sand Dunes with Gair folk dancers, fire dancers, and camel polo against the golden fort backdrop.",
            },
            {
              title: "Jaipur Literature Festival (January)",
              body: "The world's largest free literary gathering, held annually in the Pink City featuring Nobel laureates and international thinkers.",
            },
          ],
        },
      ],
      checklist: [
        "Plan between November and February for ideal desert weather",
        "Pack thermal underwear and windbreakers if camping in Jaisalmer in Dec/Jan",
        "Check lunar calendar dates for Pushkar Camel Fair and Holi celebrations",
        "Consider July–September for budget luxury stays in Udaipur and Mount Abu",
      ],
    },
  };

  const guide3Data = {
    slug: "rajasthan-travel-budget",
    title: "Rajasthan Travel Budget: Realistic Cost Breakdown for Budget, Mid-Range & Luxury",
    summary:
      "A transparent expense guide detailing accommodation tiers from heritage havelis to royal palaces, transport costs, entrance tickets, dining expenses, and tipping customs.",
    tripTypes: ["heritage", "family"],
    seoTitle: "Rajasthan Travel Budget: Daily Costs & Expense Guide",
    seoDescription:
      "How much does a trip to Rajasthan cost? Detailed breakdown of budget, mid-range, and luxury daily expenses for hotels, transport, food, and palace tickets.",
    body: {
      intro:
        "Rajasthan offers an astonishing spectrum of travel styles. You can backpack comfortably on ₹2,500 ($30) per day staying in heritage hostel dorms and savouring local street delicacies, or spend ₹80,000 ($1,000+) per night being chauffeured in vintage cars and staying in suites once reserved for Maharajas. Understanding realistic pricing tiers helps you budget accurately.",
      sections: [
        {
          heading: "Daily Trip Budget Tiers (Per Person Per Day)",
          text: "Here is what you can realistically expect to spend depending on your preferred travel comfort tier:",
          items: [
            {
              title: "Budget Backpacker: ₹2,200 – ₹3,500 ($26 – $42 / day)",
              body: "Boutique hostel dorms (Zostel, Moustache) or private budget guesthouses, local buses, train sleeper/3AC, street food and simple dhabas, selective monument entries.",
            },
            {
              title: "Comfortable Mid-Range: ₹6,500 – ₹11,000 ($78 – $132 / day)",
              body: "Restored 3-star heritage havelis with breakfast, private chauffeured AC sedan between cities, audio guides, palace entries, rooftop restaurants, and evening folk shows.",
            },
            {
              title: "Heritage Luxury: ₹22,000 – ₹55,000+ ($265 – $660+ / day)",
              body: "Historic palace hotels (Taj, Oberoi, RAAS), private luxury SUV (Innova Crysta), licensed private historians, exclusive Lake Pichola boat charters, fine-dining restaurants.",
            },
          ],
        },
        {
          heading: "Accommodation Expenses",
          text: "Hotels represent the largest variable in a Rajasthan itinerary. Prices peak from December 15 to January 15.",
          items: [
            {
              title: "Heritage Hostels & Homestays",
              body: "₹800 – ₹1,800/night for clean dorm beds or private rooms in converted local homes.",
            },
            {
              title: "Heritage Havelis & Boutique Hotels",
              body: "₹4,500 – ₹10,000/night with swimming pool, traditional courtyard, and breakfast.",
            },
            {
              title: "Palace Stays (Taj Lake Palace, Umaid Bhawan, Rambagh)",
              body: "₹35,000 – ₹90,000+/night including heritage butler service and royal courtyards.",
            },
          ],
        },
        {
          heading: "Transport & Chauffeur Rates",
          text: "Hiring a private car with driver is charged on a per-day or per-kilometre basis (typically minimum 250 km/day):",
          items: [
            {
              title: "AC Sedan (Swift Dzire / Etios)",
              body: "₹3,500 – ₹4,200 per day all-inclusive (fuel, driver batta, state border taxes, tolls).",
            },
            {
              title: "AC Premium SUV (Toyota Innova Crysta)",
              body: "₹5,200 – ₹6,500 per day all-inclusive; best for comfort on longer desert legs.",
            },
            {
              title: "Express Trains (Vande Bharat / Shatabdi)",
              body: "₹950 – ₹1,800 per seat in AC Chair Car between major city hubs.",
            },
          ],
        },
        {
          heading: "Sightseeing, Safaris & Tipping Norms",
          text: "Monument tickets have separate fee structures for Indian citizens and international passport holders:",
          items: [
            {
              title: "Palace & Fort Tickets",
              body: "Indian citizens: ₹50 – ₹200; International visitors: ₹500 – ₹700 per monument. Audio guides cost ₹200 – ₹300.",
            },
            {
              title: "Ranthambore Tiger Safaris",
              body: "Canter (20-seater): ~₹1,800/person; Gypsy jeep (6-seater): ~₹2,800/person (advance booking essential).",
            },
            {
              title: "Tipping Customary Guidelines",
              body: "Private driver: ₹400–₹600/day at end of trip; Monument guides: ₹200–₹400; Restaurant servers: 7%–10% if service charge is not included on bill.",
            },
          ],
        },
      ],
      checklist: [
        "Budget ₹7,000–₹10,000 per couple per day for an authentic mid-range heritage trip",
        "Book train tickets early in AC classes to avoid expensive last-minute flights",
        "Carry ₹4,000–₹6,000 in cash for small vendors, stepwells, and tips",
        "Purchase official composite tickets in Jaipur and Jodhpur to save on entry costs",
      ],
    },
  };

  const guidesToSeed = [
    { data: guide1Data, heroMedia: jaipurMedia || rajMedia, linkedSlugs: ["rajasthan", "jaipur", "jodhpur", "udaipur", "jaisalmer"] },
    { data: guide2Data, heroMedia: jaisalmerMedia || rajMedia, linkedSlugs: ["rajasthan", "jaipur", "udaipur", "jaisalmer", "pushkar"] },
    { data: guide3Data, heroMedia: udaipurMedia || rajMedia, linkedSlugs: ["rajasthan", "jaipur", "udaipur", "jodhpur", "ranthambore"] },
  ];

  for (const { data, heroMedia, linkedSlugs } of guidesToSeed) {
    const v = validateGuide(data);
    if (!v.ok) {
      throw new Error(`Guide ${data.slug} validation failed: ${v.error}`);
    }
    console.log(`✓ Guide ${data.slug} validated successfully!`);

    const linkedPlaceRows = await db
      .select({ id: places.id, name: places.name, slug: places.slug, kind: places.kind })
      .from(places)
      .where(inArray(places.slug, linkedSlugs));

    const guideSnapshot: GuideSnapshot = {
      slug: data.slug,
      title: data.title,
      summary: data.summary,
      tripTypes: data.tripTypes,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      body: data.body as any,
      sources: [],
      hero: imageOf(heroMedia),
      place: {
        name: raj.name,
        slug: raj.slug,
        kind: "state",
        stateSlug: raj.slug,
        stateName: raj.name,
        path: `/india/${raj.slug}`,
      },
      places: linkedPlaceRows.map((p) => ({
        name: p.name,
        slug: p.slug,
        kind: p.kind,
        stateSlug: raj.slug,
      })),
    };

    const [existingGuide] = await db.select().from(travelGuides).where(eq(travelGuides.slug, data.slug)).limit(1);
    let guideId = existingGuide?.id;

    if (existingGuide) {
      await db
        .update(travelGuides)
        .set({
          placeId: raj.id,
          title: data.title,
          summary: data.summary,
          tripTypes: data.tripTypes,
          body: data.body as any,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          heroMediaId: heroMedia?.id || raj.heroMediaId,
          status: "published",
          publishedSnapshot: guideSnapshot,
          publishedAt: new Date(),
          publishedBy: actorId,
          updatedAt: new Date(),
        })
        .where(eq(travelGuides.id, existingGuide.id));
      console.log(`Updated published guide (${data.slug})`);
    } else {
      const [inserted] = await db
        .insert(travelGuides)
        .values({
          slug: data.slug,
          placeId: raj.id,
          title: data.title,
          summary: data.summary,
          tripTypes: data.tripTypes,
          body: data.body as any,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          heroMediaId: heroMedia?.id || raj.heroMediaId,
          status: "published",
          publishedSnapshot: guideSnapshot,
          publishedAt: new Date(),
          publishedBy: actorId,
        })
        .returning();
      guideId = inserted.id;
      console.log(`Inserted published guide (${data.slug})`);
    }

    // Link in travel_guide_places
    await db.delete(travelGuidePlaces).where(eq(travelGuidePlaces.guideId, guideId!));
    if (linkedPlaceRows.length) {
      await db.insert(travelGuidePlaces).values(
        linkedPlaceRows.map((p) => ({
          guideId: guideId!,
          placeId: p.id,
        }))
      );
      console.log(`Linked ${linkedPlaceRows.length} places to guide ${data.slug}`);
    }
  }

  console.log("\n🎉 All Rajasthan itineraries and travel guides successfully seeded and published!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
