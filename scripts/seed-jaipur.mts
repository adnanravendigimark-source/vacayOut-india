import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import {
  media,
  places,
  placeVersions,
  searchDocuments,
  sections,
  itineraries,
  travelGuides,
  travelGuidePlaces,
  users,
  type SnapshotImage,
  type ItemStatus,
  type SectionSource,
  type ItinerarySnapshot,
  type GuideSnapshot,
} from "../src/lib/db/schema.js";
import { snapshotText } from "../src/lib/places/publish.js";
import { validateItinerary } from "../src/lib/itineraries/plan.js";
import { validateGuide } from "../src/lib/guides/body.js";

async function main() {
  const db = getDb();

  // 1. Fetch Jaipur place
  const [j] = await db.select().from(places).where(eq(places.slug, "jaipur")).limit(1);
  if (!j) {
    throw new Error("Jaipur place not found in database!");
  }
  console.log(`Found Jaipur: id=${j.id}`);

  // Fetch parent Rajasthan
  const [raj] = j.parentId
    ? await db.select().from(places).where(eq(places.id, j.parentId)).limit(1)
    : [];

  // Fetch admin user
  const [adminUser] = await db.select().from(users).limit(1);
  const actorId = adminUser?.id ?? j.id;

  // Fetch Jaipur hero media
  const [jMedia] = j.heroMediaId
    ? await db.select().from(media).where(eq(media.id, j.heroMediaId)).limit(1)
    : [];

  const heroImage: SnapshotImage = jMedia
    ? {
        url: jMedia.url,
        alt: jMedia.alt,
        caption: jMedia.caption,
        kind: jMedia.kind,
        license: jMedia.license,
        licenseUrl: jMedia.licenseUrl,
        attribution: jMedia.attribution,
        sourceUrl: jMedia.sourceUrl,
      }
    : {
        url: "https://gilubn4ezj1jsudg.public.blob.vercel-storage.com/places/jaipur/e09d947d-c506-4346-932e-e464af359e77-DgY0ySCx2QbOLMEXuQOdOawIipsxdn.jpg",
        alt: "The pink, honeycomb facade of Hawa Mahal with its hundreds of small windows in Jaipur",
        caption: "Hawa Mahal, Jaipur",
        kind: "photo",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        attribution: "Chainwit. via Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Hawa_Mahal_east_facade_(14-07-2022).jpg",
      };

  // Fetch child attractions
  const childAttractions = await db
    .select({
      id: places.id,
      slug: places.slug,
      name: places.name,
      kind: places.kind,
      heroMediaId: places.heroMediaId,
    })
    .from(places)
    .where(eq(places.parentId, j.id));

  console.log(`Found ${childAttractions.length} child attractions for Jaipur`);

  // Map media for child attractions
  const childMediaMap = new Map<string, SnapshotImage>();
  for (const child of childAttractions) {
    if (child.heroMediaId) {
      const [m] = await db.select().from(media).where(eq(media.id, child.heroMediaId)).limit(1);
      if (m) {
        childMediaMap.set(child.slug, {
          url: m.url,
          alt: m.alt,
          caption: m.caption,
          kind: m.kind,
          license: m.license,
          licenseUrl: m.licenseUrl,
          attribution: m.attribution,
          sourceUrl: m.sourceUrl,
        });
      }
    }
  }

  // ==========================================
  // SECTION BODIES FOR JAIPUR
  // ==========================================
  const SECTION_DATA = [
    {
      key: "overview",
      body: {
        text: "Founded in 1727 by Maharaja Sawai Jai Singh II, ruler of Amer, Jaipur is India's first planned city of the early modern era. Guided by the Shilpa Shastra and Vastu principles under the Bengali architect Vidyadhar Bhattacharya, its grid of broad avenues, nine rectangular sectors, and uniform terracotta-pink facade—ordered by Maharaja Sawai Ram Singh in 1876 to welcome the Prince of Wales—earned it the name 'The Pink City' and UNESCO World Heritage status in 2019.\n\nAs the vibrant state capital and the western anchor of India's world-famous Golden Triangle (Delhi–Agra–Jaipur), the city is a living tapestry of Rajput bravery, Mughal artistic finesse, and thriving traditional craft guilds. Three immense fortifications—Amer, Jaigarh, and Nahargarh—crown the ancient Aravalli ridges above the city, while inside the city walls, royal courtyards, bustling spice and jewellery bazaars, and 18th-century astronomical observatories buzz with timeless commerce.\n\nJaipur caters effortlessly to heritage seekers, culture and architecture enthusiasts, luxury travellers staying in converted royal havelis, and intrepid shoppers seeking world-class hand-block printed textiles, blue pottery, and handcrafted gemstones.",
      },
    },
    {
      key: "key_facts",
      body: {
        items: [
          {
            title: "Elevation",
            body: "431 m (1,414 ft) above sea level in the Dhundhar plains",
            status: "verified" as ItemStatus,
          },
          {
            title: "Ideal Duration",
            body: "2 to 4 days for forts, palaces, museums & bazaars",
            status: "verified" as ItemStatus,
          },
          {
            title: "Best Season",
            body: "October to March (sunny pleasant days, cool nights 8°C–24°C)",
            status: "verified" as ItemStatus,
          },
          {
            title: "Airport",
            body: "Jaipur International Airport (JAI) at Sanganer (12 km south)",
            status: "verified" as ItemStatus,
          },
          {
            title: "Composite Ticket",
            body: "₹300 (Indian) / ₹1,000 (Foreigner) valid for 2 days across 5 monuments",
            status: "verified" as ItemStatus,
          },
          {
            title: "UNESCO Status",
            body: "Walled City inscribed as World Heritage Site in 2019",
            status: "verified" as ItemStatus,
          },
        ],
      },
    },
    {
      key: "highlights",
      body: {
        items: [
          {
            body: "Amber Fort (Amer): 16th-century Rajput citadel with the breathtaking mirror-mosaic Sheesh Mahal and Ganesh Pol gate.",
          },
          {
            body: "Hawa Mahal (Palace of Winds): 953 delicate pink sandstone latticed jharokhas built in 1799 for royal women to observe street processions.",
          },
          {
            body: "City Palace: Sprawling royal complex blending Rajput, Mughal, and European architecture; home to the Peacock Gate and royal textile museum.",
          },
          {
            body: "Jantar Mantar: UNESCO World Heritage astronomical observatory featuring the world's largest stone sundial, the 27-metre Vrihat Samrat Yantra.",
          },
          {
            body: "Nahargarh Fort: Ridge-top fortress offering panoramic sunset vistas across the entire illuminated Pink City from Padao open-air terrace.",
          },
          {
            body: "Jaigarh Fort: The military stronghold overlooking Amer, housing the world's largest wheeled cannon (Jaivana) and subterranean arms museum.",
          },
          {
            body: "Panna Meena Ka Kund: 16th-century geometric stepwell with interlocking criss-cross stone stairs near Amer village.",
          },
          {
            body: "Albert Hall Museum: Rajasthan's oldest museum in Ram Niwas Garden, showcasing Indo-Saracenic architecture, Persian carpets, and royal armour.",
          },
          {
            body: "Patrika Gate: Jaw-dropping rainbow-painted entrance gateway at Jawahar Circle showcasing Rajasthan's regional arts and culture.",
          },
        ],
      },
    },
    {
      key: "things_to_do",
      body: {
        items: [
          {
            body: "Conquer Amer Fort at 8:00 AM on foot or by open jeep before the tour buses and afternoon heat arrive.",
          },
          {
            body: "Sip evening tea or a sunset drink on the ramparts of Nahargarh Fort as the city lights flicker on below.",
          },
          {
            body: "Capture morning golden hour photography of Hawa Mahal's facade from the open terraces of Wind View Cafe or Tattoo Cafe.",
          },
          {
            body: "Take a guided walk through the UNESCO-listed Pink City bazaars, exploring spice lanes, flower markets, and lac bangle artisans.",
          },
          {
            body: "Experience a masterclass in traditional hand block printing using natural vegetable dyes in Bagru village or Anokhi Museum.",
          },
          {
            body: "Admire the royal family's private chambers (Chandra Mahal) on a specialized heritage tour at the City Palace.",
          },
          {
            body: "Witness evening aarti at the revered Govind Dev Ji Temple inside the City Palace complex amidst thousands of devotees.",
          },
          {
            body: "Taste authentic pyaz kachori and mirchi vada at Rawat Mishthan Bhandar, followed by creamy kulhad lassi at Lassiwala Shop 312.",
          },
          {
            body: "Watch the theatrical Sound & Light Show at Amber Fort under a starry desert sky narrating 600 years of Kachwaha Rajput history.",
          },
        ],
      },
    },
    {
      key: "best_time",
      body: {
        text: "Jaipur experiences a semi-arid desert climate with three sharply contrasting seasons. The cooler winter months from October to March are universally considered the best time to visit, featuring crisp clear blue skies, daytime temperatures between 18°C and 26°C, and evening temperatures dropping to 8°C–12°C. This is the ideal weather for climbing hillside fortresses, walking through outdoor bazaars, and exploring desert palaces.\n\nWinter is also Jaipur's premier cultural season. In January, the world-famous Jaipur Literature Festival (JLF) draws international authors and Nobel laureates to the city, while the International Kite Festival (Makar Sankranti on 14 January) fills the desert sky with millions of colourful fighter kites and nighttime lanterns.\n\nSummer (April to June) is scorching and arid, with mercury regularly climbing between 40°C and 45°C. Sightseeing during summer is only feasible in the early morning (7:00 AM to 10:30 AM) or after sunset. Monsoon (July to September) brings sporadic heavy rainfall, transforming the dry Aravalli ridges into lush green hills and filling the Man Sagar Lake around Jal Mahal. The vibrant Teej festival in August brings royal camel and elephant processions through the Old City.",
      },
    },
    {
      key: "how_to_reach",
      body: {
        text: "Jaipur enjoys exceptional connectivity as the capital of Rajasthan and the western anchor of the Golden Triangle highway network:\n\nAir: Jaipur International Airport (JAI) at Sanganer is located 12 km south of the city center. It handles frequent nonstop daily domestic flights from Delhi, Mumbai, Bengaluru, Hyderabad, Kolkata, and Chennai, as well as direct international connections to Dubai, Sharjah, and Bangkok. Pre-paid airport taxi booths and app-cabs (Uber, Ola) are available right outside arrival gates.\n\nRail: Jaipur Junction (JP) is a major A1 category railway station connected by premium high-speed trains. The Delhi–Jaipur Vande Bharat Express covers the 300 km journey from New Delhi in under 4 hours. The Ajmer Shatabdi Express and Jaipur Double Decker provide reliable daily morning and evening connections. Direct superfast trains also connect Jaipur to Mumbai, Agra (Agra Fort station), and Kolkata.\n\nRoad: The Delhi–Mumbai Expressway (NE-4) connects Sohna/South Delhi to Jaipur in just 3.5 to 4 hours via Dausa, offering smooth 8-lane expressway travel. State highway NH-48 connects Jaipur with Delhi (268 km, 5–6 hrs) and NH-21 connects with Agra (235 km, 4.5 hrs) via Bharatpur. Rajasthan State Road Transport Corporation (RSRTC) and private operators run round-the-clock air-conditioned Volvo and sleeper services from Sindhi Camp bus terminal.",
      },
    },
    {
      key: "local_transport",
      body: {
        text: "Getting around Jaipur combines modern urban transit with traditional options:\n\nJaipur Metro: The operational Pink Line runs east–west from Mansarovar to Badi Chaupar directly into the walled Old City, providing a fast, air-conditioned link to Hawa Mahal, Jantar Mantar, and Johari Bazaar, avoiding street traffic.\n\nApp Cabs & Taxis: Uber and Ola operate reliably throughout Jaipur, including airport pickups, hotel transfers, and cross-town trips. For visiting the hilltop forts of Amer, Jaigarh, and Nahargarh (located 11 to 15 km north of town), hiring an air-conditioned private taxi for a full day (₹1,800 to ₹2,500) is the most comfortable and practical choice, as mobile internet connectivity can be spotty on fort hilltops.\n\nAuto & E-Rickshaws: Green auto-rickshaws and battery e-rickshaws are ubiquitous. Always agree on the fare before boarding or ask the driver to use the meter. E-rickshaws are especially handy for navigating the narrow, pedestrian-heavy bazaar streets within the walled city.",
      },
    },
    {
      key: "where_to_stay",
      body: {
        text: "Selecting the right base depends on your travel style and itinerary:\n\nBani Park & Civil Lines: Located just 2 to 3 km west of the walled city, Bani Park is renowned for peaceful, tree-lined residential streets filled with beautifully restored heritage havelis (such as Shahpura House and Umaid Bhawan). It offers great boutique charm, tranquil courtyard gardens, rooftop restaurants, and easy access to both Jaipur Junction railway station and the sights.\n\nC-Scheme: Jaipur's most stylish modern district, home to contemporary boutique hotels, hipster cafes, artisan bakeries, and high-end restaurants. It is ideal for couples, food lovers, and business travellers who appreciate quiet nighttime surroundings and chic dining.\n\nInside the Walled Pink City: Perfect for travellers who want to step straight into the 18th-century royal streets. Heritage properties near Chandpole or Johari Bazaar put Hawa Mahal and City Palace within walking distance, though streets are noisy and busy from early morning.\n\nAmer Road & Kukas: If you are looking for palatial resort luxury, the northern corridor along Amer Road and Kukas features world-renowned heritage retreats like The Leela Palace, Fairmont, and Rambagh Palace (south on Bhawani Singh Road), offering peacocks wandering expansive lawns, royal spa treatments, and Rajput grandeur.",
      },
    },
    {
      key: "budget",
      body: {
        text: "Daily travel expenses estimated for 2026. Entry fees are officially regulated by the Department of Archaeology & Museums Rajasthan.",
        items: [
          {
            title: "Monument Entry",
            body: "₹300 (Indian) / ₹1,000 (Foreigner) for 2-Day Composite Ticket covering 5 major state monuments; City Palace private royal museum ₹300–₹1,000 extra.",
          },
          {
            title: "Budget Stay (Hostel/Guesthouse)",
            body: "₹800 – ₹1,800 per night for a clean private room in Bani Park or Old City hostel.",
          },
          {
            title: "Mid-Range Heritage Haveli",
            body: "₹3,500 – ₹7,500 per night for an authentic character haveli with courtyard pool and breakfast.",
          },
          {
            title: "Luxury Palace Resort",
            body: "₹18,000 – ₹50,000+ per night at five-star royal properties like Rambagh Palace or Fairmont.",
          },
          {
            title: "Daily Dining",
            body: "₹600 – ₹1,500 per person per day for street food delights, local thali lunches, and heritage cafe dinners.",
          },
          {
            title: "Local Transport (Cab/Auto)",
            body: "₹1,800 – ₹2,400 for a dedicated full-day AC taxi covering Amer, Jaigarh & Nahargarh; ₹300–₹600 for daily city auto-rickshaws.",
          },
        ],
      },
    },
    {
      key: "visit_info",
      body: {
        items: [
          {
            title: "Composite Ticket",
            body: "Available at all ticket counters and online via tourism.rajasthan.gov.in. ₹300 for Indians (₹40 students) and ₹1,000 for foreign tourists (₹200 foreign students). Valid for 2 consecutive days across Amer Fort, Hawa Mahal, Jantar Mantar, Nahargarh Fort, and Albert Hall Museum.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Monument Opening Hours",
            body: "Standard state monuments are open daily from 9:00 AM to 5:00 PM. City Palace opens 9:30 AM to 5:00 PM.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Night Tourism",
            body: "Amer Fort, Albert Hall Museum, and Hawa Mahal offer illuminated night viewing from 6:30 PM to 9:00 PM (separate evening ticket required).",
            status: "verified" as ItemStatus,
          },
          {
            title: "Photography & Tripods",
            body: "Still cameras permitted at all monuments (nominal fee ₹50–₹100 at select sites). Commercial tripods and drones require written clearance from the ASI / State Archaeology Dept.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Official Portal",
            body: "Book verified tickets directly without booking fees at tourism.rajasthan.gov.in.",
            status: "verified" as ItemStatus,
          },
        ],
      },
    },
    {
      key: "food",
      body: {
        items: [
          {
            body: "Dal Baati Churma: Rajasthan's definitive signature dish—crispy baked whole-wheat dumplings soaked in pure desi ghee, served with spiced mixed lentils and sweet jaggery churma.",
          },
          {
            body: "Pyaz Kachori & Mirchi Vada: Flaky, deep-fried pastries stuffed with spiced onion filling, freshly fried every morning at Rawat Mishthan Bhandar on Station Road.",
          },
          {
            body: "Laal Maas: Traditional Rajput hunter's mutton curry slow-cooked with fiery Mathania dried red chillies, garlic, and whole spices; legendary at Handi and Niros on MI Road.",
          },
          {
            body: "Kulhad Lassi: Thick, churned sweet yoghurt topped with a rich layer of clotted cream (malai), served in earthen terracotta cups at Lassiwala (Shop 312, MI Road since 1944).",
          },
          {
            body: "Ghevar: Honeycombed disc-shaped monsoon sweet soaked in fragrant sugar syrup and topped with rabri and pistachio flakes; best at LMB (Laxmi Mishthan Bhandar) in Johari Bazaar.",
          },
          {
            body: "Masala Chowk: Open-air food court in Ram Niwas Garden bringing together 21 of Jaipur's most famous legacy street-food stalls in a clean, hygienic courtyard.",
          },
          {
            body: "Ker Sangri: Desert bean and wild berry delicacy stir-fried with mustard oil and dry spices, a staple of authentic Marwari cuisine.",
          },
        ],
      },
    },
    {
      key: "culture_etiquette",
      body: {
        items: [
          {
            body: "Modest Dress: Jaipur balances royal cosmopolitanism with conservative Rajasthani values. Cover shoulders and knees when visiting temples, mosques, and rural villages.",
          },
          {
            body: "Temple Customs: Remove footwear and leather belts before entering sacred shrines like Govind Dev Ji, Birla Mandir, or Galta Ji. Head coverings are often appreciated.",
          },
          {
            body: "Respectful Photography: Always ask permission before photographing local street vendors, turbaned elders, or women in traditional lehenga choli.",
          },
          {
            body: "Bargaining with Courtesy: Bargaining is expected in traditional street bazaars like Johari and Bapu Bazaar. Keep interactions polite, friendly, and good-natured.",
          },
          {
            body: "Animal Welfare: Elephants at Amer Fort are strictly monitored by state veterinary boards. Rides operate only between 7:30 AM and 11:30 AM with strict load limits. Open jeeps are a cruelty-free alternative.",
          },
        ],
      },
    },
    {
      key: "shopping",
      body: {
        items: [
          {
            body: "Johari Bazaar: The historic jewellers' district world-renowned for precious gemstones, uncut Polki diamonds, Meenakari enamelling, and Kundan wedding jewellery.",
          },
          {
            body: "Bapu Bazaar: Vibrant pink arcades famous for camel leather mojari (jutti) footwear, colourful bandhani and leheriya tie-dye dupattas, and cotton kurtas.",
          },
          {
            body: "Tripolia Bazaar: The go-to arcade for authentic handcrafted lac bangles, brass utensils, and traditional Rajasthani ironware.",
          },
          {
            body: "Sireh Deori Bazaar: Directly opposite Hawa Mahal, specializing in authentic Jaipur blue pottery, brass knick-knacks, and hand-woven camel wool rugs.",
          },
          {
            body: "Kripal Kumbh: The master workshop of late Padma Shri Kripal Singh Shekhawat, the artisan who revived traditional Jaipur turquoise-and-cobalt blue pottery.",
          },
          {
            body: "Sanganer & Bagru: Artisan craft villages (15–30 km outside city) where families have practised hand block printing with wooden stamps and natural indigo for over 350 years.",
          },
        ],
      },
    },
    {
      key: "neighbourhoods",
      body: {
        items: [
          {
            title: "Walled Pink City",
            body: "The historic 18th-century UNESCO grid containing Hawa Mahal, City Palace, Jantar Mantar, and nine heritage bazaars flanked by royal gateways.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Bani Park",
            body: "Tranquil post-independence residential colony now home to charming boutique heritage hotels, leafy streets, and rooftop garden cafes.",
            status: "verified" as ItemStatus,
          },
          {
            title: "C-Scheme",
            body: "The city's upscale cultural and culinary center, filled with chic cafes, art galleries, fine dining restaurants, and fashionable clothing boutiques.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Amer Heritage Zone",
            body: "The ancient hill capital 11 km north of Jaipur, home to Amer Fort, Jaigarh, Maota Lake, and 16th-century stepped reservoirs.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Civil Lines & Tonk Road",
            body: "Spacious diplomatic and commercial quarter featuring government residences, modern business hotels, and wide avenues leading toward the airport.",
            status: "verified" as ItemStatus,
          },
        ],
      },
    },
    {
      key: "who_its_for",
      body: {
        items: [
          {
            title: "Heritage & Architecture Lovers",
            body: "A paradise of 18th-century Rajput fortresses, Mughal gardens, and precision astronomical stone instruments.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Culture & Craft Seekers",
            body: "Unrivalled access to master block-printers, gem polishers, miniature painters, and traditional folk music performers.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Couples & Honeymooners",
            body: "Romantic candlelit dining in hilltop fort ramparts, palace suites with royal courtyards, and scenic hot-air balloon flights at sunrise.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Shoppers & Fashion Curators",
            body: "World-class textile emporiums, fine gemstone bazaars, artisanal homeware, and handcrafted leather goods.",
            status: "verified" as ItemStatus,
          },
          {
            title: "First-Time India Travellers",
            body: "A structured, accessible introduction to royal India with great highway infrastructure, high-speed trains, and international-standard hotels.",
            status: "verified" as ItemStatus,
          },
        ],
      },
    },
    {
      key: "travel_tips",
      body: {
        items: [
          {
            body: "Buy the Rajasthan Tourism composite ticket on your first morning to skip individual ticket queues at five major monuments.",
          },
          {
            body: "Reach Amer Fort by 8:00 AM sharp to explore the Sheesh Mahal in peaceful morning light before tour bus crowds arrive.",
          },
          {
            body: "Cluster the Old City sights together: Hawa Mahal, Jantar Mantar, and City Palace are all within a 5-minute walk of each other.",
          },
          {
            body: "Head to Nahargarh Fort around 4:30 PM for golden hour photography and sunset drinks at Padao restaurant.",
          },
          {
            body: "Be wary of auto-rickshaw drivers offering to take you to 'exclusive government-approved' textile or gem showrooms—they earn steep commissions.",
          },
          {
            body: "Take the Pink Line Metro to Badi Chaupar station to completely bypass Old City traffic jams.",
          },
        ],
      },
    },
    {
      key: "practical_info",
      body: {
        items: [
          {
            title: "Payments & Currency",
            body: "Indian Rupee (INR). UPI QR payments are accepted universally by street food stalls, rickshaws, and shops. ATMs are plentiful across C-Scheme, MI Road, and Old City.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Mobile Connectivity",
            body: "Reliable 5G and 4G coverage from Jio and Airtel across Jaipur city and major highway corridors. Fort hilltops may experience occasional weak signals.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Language & Signs",
            body: "Hindi is the lingua franca; Dhundhari/Rajasthani is spoken locally. English is widely understood in hotels, restaurants, monuments, and shops.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Drinking Water",
            body: "Drink filtered, RO-purified, or sealed bottled water. High-end hotels and cafes provide safe filtered water.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Packing Essentials",
            body: "Lightweight breathable cottons for daytime, a warm jacket or shawl for winter evenings (Nov–Feb), comfortable walking sneakers for fort flagstones, and UV sun protection.",
            status: "verified" as ItemStatus,
          },
        ],
      },
    },
    {
      key: "safety_health",
      body: {
        items: [
          {
            title: "Emergency Services",
            body: "Dial 112 for all-in-one emergency police, fire, and medical response. Tourist Police Helpline: 1363.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Medical Facilities",
            body: "SMS Hospital (Sawai Man Singh Hospital) is Rajasthan's premier multi-speciality government medical center. Fortis Escorts and Narayana Hrudayalaya offer world-class private care.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Gem & Carpet Scams",
            body: "Politely decline unsolicited offers from strangers or taxi drivers claiming you can purchase precious gems or silk rugs to resell abroad for easy profit. These are well-documented tourist traps.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Heat & Sun Safety",
            body: "Between March and September, midday temperatures can cause dehydration. Carry oral rehydration salts (ORS), drink plenty of fluids, and sightsee early morning.",
            status: "verified" as ItemStatus,
          },
          {
            title: "Street Navigation",
            body: "Walled city streets are narrow and busy with scooters and cycle rickshaws. Walk along shop arcades and keep valuables in zippered bags.",
            status: "verified" as ItemStatus,
          },
        ],
      },
    },
    {
      key: "faqs",
      body: {
        items: [
          {
            title: "How many days are ideal for visiting Jaipur?",
            body: "2 to 3 full days are ideal for a complete trip. Allocate Day 1 for the northern hill fortresses (Amer, Jaigarh, Nahargarh, and Jal Mahal), Day 2 for the UNESCO Pink City royal monuments (Hawa Mahal, City Palace, Jantar Mantar) and bazaars, and an optional Day 3 for artisan villages, Albert Hall, and stepwells.",
          },
          {
            title: "What is the Rajasthan Tourism composite ticket?",
            body: "The composite ticket is a discounted pass issued by the Department of Archaeology & Museums. Costing ₹300 for Indian citizens and ₹1,000 for foreign visitors, it is valid for two consecutive days and grants entry to five major monuments: Amer Fort, Hawa Mahal, Jantar Mantar, Nahargarh Fort, and Albert Hall Museum. City Palace is privately owned by the royal family and requires a separate ticket.",
          },
          {
            title: "How do I travel between Amer Fort, Jaigarh, and Nahargarh?",
            body: "The three forts sit in close proximity along the Aravalli ridge 11 km north of Jaipur. You can hire an air-conditioned taxi for the day to take you to all three, or take the historic subterranean stone tunnel that connects Amer Fort uphill directly to Jaigarh Fort. Nahargarh Fort is a 15-minute winding hill drive from Jaigarh.",
          },
          {
            title: "Is Jaipur safe for solo and female travellers?",
            body: "Jaipur is generally safe and welcomes millions of international and domestic solo travellers every year. Normal common-sense precautions apply: avoid unlit alleys late at night, dress respectfully when visiting sacred temples and heritage quarters, use app-based cabs (Uber/Ola) after dark, and firmly decline over-persistent touts.",
          },
          {
            title: "What are the best souvenirs to buy in Jaipur?",
            body: "Jaipur is famous worldwide for five authentic crafts: authentic hand-block printed cotton bedsheets and quilts (Jaipuri razai), Kundan and Meenakari enamel jewellery, GI-tagged blue pottery tiles and plates, camel-leather mojari shoes from Bapu Bazaar, and traditional sweets like Ghevar and Peda.",
          },
        ],
      },
    },
  ];

  // Upsert sections in `sections` table
  console.log("Upserting sections in database...");
  for (const s of SECTION_DATA) {
    const [existing] = await db
      .select({ id: sections.id })
      .from(sections)
      .where(and(eq(sections.placeId, j.id), eq(sections.key, s.key)))
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
    } else {
      await db.insert(sections).values({
        placeId: j.id,
        key: s.key,
        body: s.body as any,
        status: "approved",
        updatedAt: new Date(),
      });
    }
  }

  // ==========================================
  // ITINERARY 1: Jaipur in 2 Days
  // ==========================================
  const amberPhoto = childMediaMap.get("amber-fort");
  const hawaPhoto = childMediaMap.get("hawa-mahal");
  const jantarPhoto = childMediaMap.get("jantar-mantar");
  const cityPalacePhoto = childMediaMap.get("city-palace");
  const nahargarhPhoto = childMediaMap.get("nahargarh-fort");
  const jaigarhPhoto = childMediaMap.get("jaigarh-fort");

  const toPlanPhoto = (img?: SnapshotImage | null, caption?: string) =>
    img
      ? {
          url: img.url,
          alt: img.alt || "Sight photo",
          caption: caption || img.caption || undefined,
          attribution: img.attribution || undefined,
          license: img.license || undefined,
        }
      : undefined;

  const itin1Data = {
    slug: "jaipur-2-days-forts-and-old-city",
    title: "Jaipur in 2 Days: The Royal Pink City & Hilltop Forts",
    summary:
      "The definitive 48-hour Golden Triangle itinerary balancing the hilltop fortifications of Amer, Jaigarh and Nahargarh with the UNESCO-listed Pink City palaces, astronomical wonders and buzzing street bazaars.",
    durationDays: 2,
    tripTypes: ["heritage", "weekend"],
    seoTitle: "Jaipur in 2 Days: Forts, Palaces & Pink City Itinerary",
    seoDescription:
      "Complete 2-day Jaipur itinerary featuring Amer Fort, Nahargarh sunset, Hawa Mahal, City Palace, Jantar Mantar, and Pink City bazaar food with day-wise sight photos.",
    plan: {
      overview:
        "This carefully sequenced two-day itinerary captures the quintessential contrasts of Jaipur: Day 1 takes you north into the rugged Aravalli hills to conquer the hilltop citadels of Amer, Jaigarh, and Nahargarh with an evening stop at Jal Mahal. Day 2 brings you inside the UNESCO-walled Pink City for sunrise at Hawa Mahal, royal state apartments at the City Palace, centuries-old astronomical precision at Jantar Mantar, and evening street food in the historic bazaars.",
      style: "Classic Heritage & Palaces",
      start: "Jaipur Junction or Airport (JAI)",
      end: "Old City Pink Bazaars / Jaipur",
      season: "October to March (sunny days, cool nights)",
      difficulty: "Moderate (some uphill walking on fort flagstones)",
      transport: "Private AC taxi for Day 1; walking & e-rickshaws for Day 2",
      days: [
        {
          title: "Day 1: The Aravalli Hill Forts & Sunset Ridge",
          summary:
            "Journey north through the Aravalli pass to explore Amer Fort's mirror palace, the cannon ramparts of Jaigarh, and panoramic sunset drinks atop Nahargarh Fort.",
          photos: [
            toPlanPhoto(amberPhoto, "Amer Fort (Amber Palace)"),
            toPlanPhoto(jaigarhPhoto, "Jaigarh Fort & Ramparts"),
            toPlanPhoto(nahargarhPhoto, "Nahargarh Fort Sunset Terrace"),
          ].filter(Boolean) as any[],
          stops: [
            {
              name: "Amer Fort (Amber Palace)",
              placeSlug: "amber-fort",
              time: "08:30 AM",
              duration: "3 hrs",
              note: "Enter through Suraj Pol into Jaleb Chowk. Tour the Diwan-e-Aam, the ornate Ganesh Pol gateway, the Zenana courtyards, and the dazzling mirror-mosaic Sheesh Mahal.",
              photo: toPlanPhoto(amberPhoto),
            },
            {
              name: "Jaigarh Fort",
              placeSlug: "jaigarh-fort",
              time: "12:00 PM",
              duration: "1.5 hrs",
              note: "Ascend the fortified hill above Amer to inspect Jaivana—the world's largest 18th-century wheeled cannon—and explore the Rajput armory and water cisterns.",
              photo: toPlanPhoto(jaigarhPhoto),
            },
            {
              name: "Nahargarh Fort & Sunset at Padao",
              placeSlug: "nahargarh-fort",
              time: "04:30 PM",
              duration: "2.5 hrs",
              note: "Wander through Madhavendra Bhawan's nine identical royal apartments, then relax at the Padao open-air cafe on the ramparts as sunset paints the entire Pink City golden.",
              photo: toPlanPhoto(nahargarhPhoto),
            },
            {
              name: "Jal Mahal Viewpoint",
              placeSlug: "jaipur",
              time: "07:30 PM",
              duration: "30 mins",
              note: "Stop along the Amer Road promenade to admire the illuminated 18th-century water palace glowing in the middle of Man Sagar Lake.",
            },
          ],
        },
        {
          title: "Day 2: The UNESCO Walled Pink City, Palaces & Bazaars",
          summary:
            "Spend a full day exploring Maharaja Sawai Jai Singh II's 18th-century planned royal capital: sunrise at Hawa Mahal, the City Palace museums, Jantar Mantar, and vibrant heritage markets.",
          photos: [
            toPlanPhoto(hawaPhoto, "Hawa Mahal (Palace of Winds)"),
            toPlanPhoto(cityPalacePhoto, "City Palace Courtyards"),
            toPlanPhoto(jantarPhoto, "Jantar Mantar UNESCO Observatory"),
          ].filter(Boolean) as any[],
          stops: [
            {
              name: "Hawa Mahal (Palace of Winds)",
              placeSlug: "hawa-mahal",
              time: "08:30 AM",
              duration: "1 hr",
              note: "Photograph the five-storey pink honeycomb facade in the soft morning sunlight, then climb the interior ramps for rooftop views of Jantar Mantar and the Old City.",
              photo: toPlanPhoto(hawaPhoto),
            },
            {
              name: "City Palace, Jaipur",
              placeSlug: "city-palace",
              time: "10:00 AM",
              duration: "2 hrs",
              note: "Admire the four seasonal gateways at Pritam Niwas Chowk (including the famous Peacock Gate), the world-record sterling silver Gangajalis at Diwan-i-Khas, and the royal costume gallery.",
              photo: toPlanPhoto(cityPalacePhoto),
            },
            {
              name: "Jantar Mantar Astronomical Observatory",
              placeSlug: "jantar-mantar",
              time: "12:30 PM",
              duration: "1.5 hrs",
              note: "Marvel at 19 gigantic stone architectural instruments designed in 1734, including the 27-metre Vrihat Samrat Yantra sundial accurate to within 2 seconds.",
              photo: toPlanPhoto(jantarPhoto),
            },
            {
              name: "Johari Bazaar & Bapu Bazaar Walk",
              placeSlug: "jaipur",
              time: "04:30 PM",
              duration: "3 hrs",
              note: "Stroll through the terracotta-pink arcades for traditional camel-leather juttis, bandhani textiles, and lac bangles. Enjoy hot pyaz kachoris at Rawat and kulhad lassi at Lassiwala.",
            },
          ],
        },
      ],
      budget: {
        assumptions:
          "Estimated per couple for 2 days / 2 nights. Includes private chauffeured AC taxi for the forts day, mid-range heritage haveli stay, composite tickets, meals, and street food.",
        lines: [
          { label: "Heritage Haveli Stay (2 Nights)", amount: "₹8,000 – ₹14,000", basis: "₹4,000 – ₹7,000/night with breakfast in Bani Park" },
          { label: "Private Dedicated Taxi (Day 1 Forts)", amount: "₹2,000 – ₹2,500", basis: "Full-day AC sedan covering Amer, Jaigarh, Nahargarh & Jal Mahal" },
          { label: "Monument Composite Tickets (2 Pax)", amount: "₹600 (Indian) / ₹2,000 (Foreign)", basis: "2-Day Composite Ticket covering 5 state monuments" },
          { label: "City Palace Private Museum Entry (2 Pax)", amount: "₹600 – ₹1,400", basis: "Palace courtyard and royal textile museum ticket" },
          { label: "Dining, Street Eats & Lassi (2 Days)", amount: "₹3,500 – ₹6,000", basis: "Local thali lunches, heritage cafe dinners, Rawat kachori & Lassiwala" },
          { label: "E-Rickshaws & Metro (Day 2 Old City)", amount: "₹300 – ₹600", basis: "Metro tickets & short bazaar rides" },
        ],
      },
      booking: [
        { item: "Rajasthan Tourism Composite Ticket", detail: "Buy online at tourism.rajasthan.gov.in or at the first monument to skip ticket queues." },
        { item: "Heritage Haveli Stay", detail: "Reserve 3–6 weeks in advance for travel between October and March." },
        { item: "Amer Fort Audio Guide or Guide", detail: "Hire official badge-carrying ASI guides at Jaleb Chowk (₹500–₹800 fixed tariff)." },
      ],
      alternatives: [
        "In hot weather, reverse Day 1: visit Amer Fort at 08:00 AM, rest midday in AC cafes, and visit Nahargarh at sunset.",
        "Add a morning hot-air balloon ride over Amer valley at dawn before touring the fort.",
        "Include a block printing demonstration at Anokhi Museum if you have an extra 2 hours on Day 1.",
      ],
      tips: [
        "Buy the composite ticket at your first monument to skip ticket lines for the next 2 days.",
        "Start Amer Fort before 09:00 AM to beat tour bus groups and heat.",
        "Take e-rickshaws inside the Old City walls to avoid traffic bottlenecks.",
      ],
    },
  };

  // Validate and publish Itinerary 1
  const itin1Validation = validateItinerary({
    slug: itin1Data.slug,
    title: itin1Data.title,
    summary: itin1Data.summary,
    durationDays: itin1Data.durationDays,
    tripTypes: itin1Data.tripTypes,
    seoTitle: itin1Data.seoTitle,
    seoDescription: itin1Data.seoDescription,
    plan: itin1Data.plan,
  });
  if (!itin1Validation.ok) {
    throw new Error(`Itinerary 1 validation failed: ${itin1Validation.error}`);
  }

  const itin1Snapshot: ItinerarySnapshot = {
    slug: itin1Data.slug,
    title: itin1Data.title,
    summary: itin1Data.summary,
    durationDays: itin1Data.durationDays,
    tripTypes: itin1Data.tripTypes,
    plan: itin1Validation.value.plan,
    seoTitle: itin1Data.seoTitle,
    seoDescription: itin1Data.seoDescription,
    hero: amberPhoto || heroImage,
    sources: [],
    place: {
      name: j.name,
      slug: j.slug,
      kind: j.kind,
      stateSlug: raj?.slug || "rajasthan",
      stateName: raj?.name || "Rajasthan",
      path: `/india/${raj?.slug || "rajasthan"}/${j.slug}`,
    },
  };

  const [existingItin1] = await db.select().from(itineraries).where(eq(itineraries.slug, itin1Data.slug)).limit(1);
  if (existingItin1) {
    await db
      .update(itineraries)
      .set({
        placeId: j.id,
        title: itin1Data.title,
        summary: itin1Data.summary,
        durationDays: itin1Data.durationDays,
        tripTypes: itin1Data.tripTypes,
        plan: itin1Data.plan as any,
        seoTitle: itin1Data.seoTitle,
        seoDescription: itin1Data.seoDescription,
        heroMediaId: childAttractions.find((c) => c.slug === "amber-fort")?.heroMediaId || j.heroMediaId,
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
      placeId: j.id,
      title: itin1Data.title,
      summary: itin1Data.summary,
      durationDays: itin1Data.durationDays,
      tripTypes: itin1Data.tripTypes,
      plan: itin1Data.plan as any,
      seoTitle: itin1Data.seoTitle,
      seoDescription: itin1Data.seoDescription,
      heroMediaId: childAttractions.find((c) => c.slug === "amber-fort")?.heroMediaId || j.heroMediaId,
      status: "published",
      publishedSnapshot: itin1Snapshot,
      publishedAt: new Date(),
      publishedBy: actorId,
    });
    console.log(`Inserted published itinerary 1 (${itin1Data.slug})`);
  }

  // ==========================================
  // ITINERARY 2: Jaipur in 3 Days (Complete Circuit)
  // ==========================================
  const itin2Data = {
    slug: "jaipur-3-days-complete-circuit",
    title: "Jaipur in 3 Days: Palaces, Stepwells, Royal Crafts & Gastronomy",
    summary:
      "A comprehensive 72-hour royal immersion exploring Jaipur's architectural wonders, hidden stepwells, artisan block-printing villages, Indo-Saracenic museums, and legendary culinary landmarks.",
    durationDays: 3,
    tripTypes: ["heritage", "family", "food"],
    seoTitle: "Jaipur in 3 Days: The Complete Heritage & Cultural Circuit",
    seoDescription:
      "The definitive 3-day Jaipur itinerary covering Amer Fort, Panna Meena Stepwell, Nahargarh, City Palace, Hawa Mahal, Albert Hall Museum, and Bagru block printing.",
    plan: {
      overview:
        "This leisurely 3-day itinerary covers everything in the classic 2-day circuit while adding Jaipur's magnificent artistic and off-the-beaten-path heritage: the 16th-century geometric stepwell of Panna Meena Ka Kund, the royal marble cenotaphs of Gaitore, a live block-printing artisan experience, and the illuminated Indo-Saracenic grandeur of the Albert Hall Museum.",
      style: "Comprehensive Royal & Artisan Discovery",
      start: "Jaipur Junction or Airport (JAI)",
      end: "Patrika Gate / Jaipur Airport",
      season: "October to March (pleasant sunshine, cool breezes)",
      difficulty: "Easy to Moderate",
      transport: "Private chauffeur-driven car recommended",
      days: [
        {
          title: "Day 1: Amer Fort, Panna Meena Stepwell & Hilltop Citadels",
          summary:
            "Explore the royal seat of the Kachwaha Rajputs at Amer, photograph the geometric symmetry of Panna Meena stepwell, and take in the panoramic sunset from Nahargarh Fort.",
          photos: [
            toPlanPhoto(amberPhoto, "Amer Fort & Maota Lake"),
            toPlanPhoto(jaigarhPhoto, "Jaigarh Fort Bastions"),
            toPlanPhoto(nahargarhPhoto, "Nahargarh Sunset Point"),
          ].filter(Boolean) as any[],
          stops: [
            {
              name: "Amer Fort (Amber Palace)",
              placeSlug: "amber-fort",
              time: "08:30 AM",
              duration: "3 hrs",
              note: "Explore the Diwan-e-Khas, Ganesh Pol, mirror-mosaic Sheesh Mahal, and ancient Mughal gardens.",
              photo: toPlanPhoto(amberPhoto),
            },
            {
              name: "Panna Meena Ka Kund Stepwell",
              placeSlug: "jaipur",
              time: "11:45 AM",
              duration: "45 mins",
              note: "Marvel at the mesmerizing 16th-century criss-cross stone stairs and ochre pavilions in Amer village.",
            },
            {
              name: "Jaigarh Fort & The Jaivana Cannon",
              placeSlug: "jaigarh-fort",
              time: "01:00 PM",
              duration: "1.5 hrs",
              note: "Inspect the royal cannon foundry, the great Jaivana cannon, and underground vaulted water cisterns.",
              photo: toPlanPhoto(jaigarhPhoto),
            },
            {
              name: "Nahargarh Fort Sunset Viewpoint",
              placeSlug: "nahargarh-fort",
              time: "04:30 PM",
              duration: "2.5 hrs",
              note: "Tour Madhavendra Bhawan's royal interconnected suites and watch the sun dip beneath the horizon over Jaipur city.",
              photo: toPlanPhoto(nahargarhPhoto),
            },
          ],
        },
        {
          title: "Day 2: The UNESCO Walled Pink City, Observatories & Bazaars",
          summary:
            "Immerse yourself in Maharaja Jai Singh II's planned pink metropolis: sunrise at Hawa Mahal, the City Palace royal quarters, Jantar Mantar, and evening street shopping.",
          photos: [
            toPlanPhoto(hawaPhoto, "Hawa Mahal Facade"),
            toPlanPhoto(cityPalacePhoto, "City Palace Peacock Gate"),
            toPlanPhoto(jantarPhoto, "Jantar Mantar Stone Sundials"),
          ].filter(Boolean) as any[],
          stops: [
            {
              name: "Hawa Mahal (Palace of Winds)",
              placeSlug: "hawa-mahal",
              time: "08:30 AM",
              duration: "1 hr",
              note: "Admire the 953 honeycombed jharokhas and enjoy rooftop views across the Old City.",
              photo: toPlanPhoto(hawaPhoto),
            },
            {
              name: "City Palace, Jaipur",
              placeSlug: "city-palace",
              time: "10:00 AM",
              duration: "2.5 hrs",
              note: "Visit Mubarak Mahal, Sabha Niwas, the stunning Pritam Niwas Chowk gates, and the royal armory.",
              photo: toPlanPhoto(cityPalacePhoto),
            },
            {
              name: "Jantar Mantar",
              placeSlug: "jantar-mantar",
              time: "01:00 PM",
              duration: "1.5 hrs",
              note: "Explore the 19 precision stone astronomical instruments built in 1734 by Maharaja Sawai Jai Singh II.",
              photo: toPlanPhoto(jantarPhoto),
            },
            {
              name: "Johari & Bapu Bazaars",
              placeSlug: "jaipur",
              time: "04:30 PM",
              duration: "3 hrs",
              note: "Shop for gemstone jewellery, Mojari footwear, and Bandhani dupattas. Taste Ghevar at LMB.",
            },
          ],
        },
        {
          title: "Day 3: Royal Cenotaphs, Artisan Block Printing & Albert Hall",
          summary:
            "Discover Jaipur's artistic soul: intricately carved marble cenotaphs at Gaitore, a hands-on block printing workshop, and the illuminated Indo-Saracenic Albert Hall Museum.",
          photos: [
            toPlanPhoto(heroImage, "Historic Jaipur Monument"),
            toPlanPhoto(amberPhoto, "Historic Rajput Architecture"),
          ].filter(Boolean) as any[],
          stops: [
            {
              name: "Royal Gaitore Cenotaphs",
              placeSlug: "jaipur",
              time: "09:00 AM",
              duration: "1.5 hrs",
              note: "Tranquil open-air valley filled with intricately sculpted white marble chhatris honouring Jaipur's Kachwaha maharajas.",
            },
            {
              name: "Anokhi Museum of Hand Printing / Bagru Village",
              placeSlug: "jaipur",
              time: "11:00 AM",
              duration: "2 hrs",
              note: "Witness master block-printers carve wooden blocks and stamp vibrant vegetable dyes onto natural cotton fabrics.",
            },
            {
              name: "Albert Hall Museum & Masala Chowk",
              placeSlug: "jaipur",
              time: "03:30 PM",
              duration: "2.5 hrs",
              note: "Tour Rajasthan's oldest museum in Ram Niwas Garden, then taste legendary street eats at Masala Chowk.",
            },
            {
              name: "Patrika Gate at Jawahar Circle",
              placeSlug: "jaipur",
              time: "06:30 PM",
              duration: "1 hr",
              note: "Marvel at the vividly hand-painted arches illustrating Rajasthan's history, rulers, and architectural landmarks.",
            },
          ],
        },
      ],
      budget: {
        assumptions:
          "Estimated per couple for 3 days / 3 nights. Includes private chauffeured AC car, upscale boutique haveli, composite passes, dining, workshops, and local transit.",
        lines: [
          { label: "Heritage Haveli / Boutique Hotel (3 Nights)", amount: "₹15,000 – ₹27,000", basis: "₹5,000 – ₹9,000/night with breakfast" },
          { label: "Private Dedicated Chauffeur Car (3 Days)", amount: "₹6,000 – ₹7,500", basis: "Full AC sedan covering all forts, city sights, Bagru & airport" },
          { label: "Monument Passes & Royal Palace (2 Pax)", amount: "₹1,800 – ₹3,600", basis: "Composite passes, City Palace museum, and Gaitore entry" },
          { label: "Hand Block Printing Masterclass", amount: "₹1,500 – ₹3,000", basis: "Artisan workshop in Bagru or Anokhi Museum" },
          { label: "Dining, Rooftops & Street Food (3 Days)", amount: "₹6,000 – ₹11,000", basis: "Rooftop restaurants, Padao drinks, Masala Chowk & thalis" },
        ],
      },
      booking: [
        { item: "Rajasthan Tourism Composite Ticket", detail: "Purchase online at tourism.rajasthan.gov.in to cover 5 major sights over 2 days." },
        { item: "City Palace Chandra Mahal Tour", detail: "Pre-book online if you wish to see the private royal residential chambers." },
        { item: "Block Printing Workshop", detail: "Contact Anokhi Museum or Bagru artisan cooperatives 2–3 days ahead to confirm timing." },
      ],
      alternatives: [
        "Substitute Bagru block printing with an excursion to Abhaneri Chand Baori stepwell (95 km east) on Day 3.",
        "Visit Chokhi Dhani ethnic resort on Day 2 evening for traditional village folk dance and Rajasthani feast.",
        "Stay at a 5-star palace resort (Rambagh Palace or Fairmont) for supreme Rajput luxury.",
      ],
      tips: [
        "Book a full-day private car for Day 1 and Day 3 to reach outlying locations comfortably.",
        "Carry camera batteries and ample memory cards for Patrika Gate and Gaitore Cenotaphs.",
        "Taste both sweet Ghevar at LMB and spicy pyaz kachoris at Rawat to complete the food circuit.",
      ],
    },
  };

  const itin2Validation = validateItinerary({
    slug: itin2Data.slug,
    title: itin2Data.title,
    summary: itin2Data.summary,
    durationDays: itin2Data.durationDays,
    tripTypes: itin2Data.tripTypes,
    seoTitle: itin2Data.seoTitle,
    seoDescription: itin2Data.seoDescription,
    plan: itin2Data.plan,
  });
  if (!itin2Validation.ok) {
    throw new Error(`Itinerary 2 validation failed: ${itin2Validation.error}`);
  }

  const itin2Snapshot: ItinerarySnapshot = {
    slug: itin2Data.slug,
    title: itin2Data.title,
    summary: itin2Data.summary,
    durationDays: itin2Data.durationDays,
    tripTypes: itin2Data.tripTypes,
    plan: itin2Validation.value.plan,
    seoTitle: itin2Data.seoTitle,
    seoDescription: itin2Data.seoDescription,
    hero: hawaPhoto || heroImage,
    sources: [],
    place: {
      name: j.name,
      slug: j.slug,
      kind: j.kind,
      stateSlug: raj?.slug || "rajasthan",
      stateName: raj?.name || "Rajasthan",
      path: `/india/${raj?.slug || "rajasthan"}/${j.slug}`,
    },
  };

  const [existingItin2] = await db.select().from(itineraries).where(eq(itineraries.slug, itin2Data.slug)).limit(1);
  if (existingItin2) {
    await db
      .update(itineraries)
      .set({
        placeId: j.id,
        title: itin2Data.title,
        summary: itin2Data.summary,
        durationDays: itin2Data.durationDays,
        tripTypes: itin2Data.tripTypes,
        plan: itin2Data.plan as any,
        seoTitle: itin2Data.seoTitle,
        seoDescription: itin2Data.seoDescription,
        heroMediaId: childAttractions.find((c) => c.slug === "hawa-mahal")?.heroMediaId || j.heroMediaId,
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
      placeId: j.id,
      title: itin2Data.title,
      summary: itin2Data.summary,
      durationDays: itin2Data.durationDays,
      tripTypes: itin2Data.tripTypes,
      plan: itin2Data.plan as any,
      seoTitle: itin2Data.seoTitle,
      seoDescription: itin2Data.seoDescription,
      heroMediaId: childAttractions.find((c) => c.slug === "hawa-mahal")?.heroMediaId || j.heroMediaId,
      status: "published",
      publishedSnapshot: itin2Snapshot,
      publishedAt: new Date(),
      publishedBy: actorId,
    });
    console.log(`Inserted published itinerary 2 (${itin2Data.slug})`);
  }

  // ==========================================
  // TRAVEL GUIDES FOR JAIPUR
  // ==========================================
  const guide1Data = {
    slug: "how-to-visit-amer-fort-and-jaipur-hill-forts",
    title: "How to Visit Amer, Jaigarh and Nahargarh: The Complete Guide to Jaipur's Hill Forts",
    summary:
      "Everything you need to know to conquer Jaipur's three legendary Aravalli fortresses: composite tickets, secret tunnels, best sunset viewpoints, and crowd-beating tips.",
    tripTypes: ["heritage", "weekend"],
    seoTitle: "Amer, Jaigarh & Nahargarh: Jaipur Hill Forts Guide",
    seoDescription:
      "A complete visitor guide to Jaipur's three hilltop forts: Amer Fort, Jaigarh Fort, and Nahargarh sunset terrace. Timings, tickets, routes, and expert tips.",
    body: {
      intro:
        "Towering above the northern fringes of Jaipur along the rugged Cheel ka Teela (Hill of Eagles), three interconnected fortresses stand guard over Rajasthan's historic Kachwaha Rajput capital. Amer Fort, with its opulent residential courtyards and mirror-encrusted halls; Jaigarh Fort, the formidable artillery bastion housing the world's largest wheeled cannon; and Nahargarh Fort, perched dramatically on the southern edge overlooking the sprawling Pink City below. This guide explains how to combine all three into a seamless, unforgettable day trip.",
      sections: [
        {
          heading: "Understanding the Three Forts & Their Strategic Links",
          text: "Rather than three isolated monuments, Amer, Jaigarh, and Nahargarh formed an ingenious unified defence network connected by underground stone escape tunnels and kilometres of crenellated stone walls snake-walking across the Aravalli ridges.",
          items: [
            {
              title: "Amer Fort (The Royal Residence)",
              body: "Founded in 1592 by Raja Man Singh I atop 10th-century ruins, Amer served as the royal court, administrative seat, and palace until Jaipur was established in 1727.",
            },
            {
              title: "Jaigarh Fort (The Military Citadel)",
              body: "Built directly above Amer to protect the palace and the royal treasury. It housed one of medieval Asia's most advanced cannon foundries.",
            },
            {
              title: "Nahargarh Fort (The Tiger Fortress)",
              body: "Erected by Maharaja Sawai Jai Singh II in 1734 along the mountain rim to defend the newly constructed city of Jaipur against Maratha invaders.",
            },
          ],
        },
        {
          heading: "The Ideal One-Day Circuit: Step-by-Step Route",
          text: "To avoid peak midday temperatures and crowded bus groups, follow this optimal geographical route:",
          items: [
            {
              title: "08:00 AM – Amer Fort First Entry",
              body: "Arrive at Amer Fort at 08:00 AM opening time. Walk through Suraj Pol in peaceful morning light, marvel at the mirror-inlaid Sheesh Mahal, and photograph Ganesh Pol without crowds.",
            },
            {
              title: "11:30 AM – Jaigarh Fort & Cannon Foundry",
              body: "Drive uphill (or take the historic covered subterranean stone pathway from Amer) to Jaigarh Fort. Inspect the massive 50-tonne Jaivana cannon and the armory museum.",
            },
            {
              title: "01:30 PM – Lunch in Amer Village or 1135 AD",
              body: "Dine like royalty inside Amer Fort's 1135 AD restaurant, or head to a local dhaba in Amer village for fresh Dal Baati Churma.",
            },
            {
              title: "04:30 PM – Nahargarh Fort for Sunset & Padao",
              body: "Drive 15 minutes along the ridge to Nahargarh. Tour the nine mirrored apartments of Madhavendra Bhawan, then head to the ramparts for a sunset drink at Padao overlooking the illuminated Pink City.",
            },
          ],
        },
        {
          heading: "Tickets, Timings & Practical Tips",
          text: "Essential visitor logistics for a smooth day in the hills:",
          items: [
            {
              title: "Buy the Composite Ticket",
              body: "The ₹300 (Indian) / ₹1,000 (Foreigner) 2-day composite pass covers both Amer Fort and Nahargarh (plus Hawa Mahal, Jantar Mantar, and Albert Hall). Jaigarh Fort requires a separate ₹100 entry ticket.",
            },
            {
              title: "Hire a Full-Day AC Taxi",
              body: "Do not rely on auto-rickshaws or app-cabs for the return journey from Nahargarh or Jaigarh, as mobile coverage is patchy and few cabs wait at the summit. Hire a dedicated taxi for the day (₹1,800–₹2,500).",
            },
            {
              title: "Footwear & Steps",
              body: "Expect uneven cobblestones, ramps, and staircases. Wear comfortable, supportive walking shoes with good grip.",
            },
          ],
        },
      ],
      checklist: [
        "Purchase the Rajasthan Tourism composite ticket to save money and skip ticket queues",
        "Carry bottled water, sunglasses, and a sunhat for outdoor fort courtyards",
        "Reach Nahargarh ramparts by 05:00 PM to catch golden hour over Jaipur",
        "Pre-arrange your transport for the return drive down the winding Nahargarh ghat road",
      ],
    },
  };

  const guide2Data = {
    slug: "jaipur-shopping-guide-bazaars-gems-textiles",
    title: "Jaipur Shopping Guide: Authentic Bazaars, Block Prints, Blue Pottery & Gemstones",
    summary:
      "Navigate Jaipur's historic 300-year-old walled bazaars with confidence: where to find authentic Sanganeri prints, GI-tagged blue pottery, genuine gemstones, and how to avoid tout commissions.",
    tripTypes: ["heritage", "food"],
    seoTitle: "Jaipur Shopping Guide: Bazaars, Textiles, Gems & Pottery",
    seoDescription:
      "The ultimate insider shopping guide to Jaipur: Johari Bazaar gems, Bapu Bazaar juttis, Bagru block prints, blue pottery, and essential bargaining tips.",
    body: {
      intro:
        "When Maharaja Sawai Jai Singh II founded Jaipur in 1727, he invited master jewellers, weavers, dye masters, and stonecutters from across India to establish their workshops in designated quarters of the walled city. Nearly three centuries later, Jaipur remains one of the world's most vibrant artisanal capitals. From uncut Polki diamond chokers and turquoise blue pottery plates to indigo dabu textiles, this guide steers you toward authentic craftsmen and explains how to avoid commission touts.",
      sections: [
        {
          heading: "Jaipur's Historic Walled City Bazaars",
          text: "The Old City was laid out with specialized bazaars flanked by uniform terracotta-pink colonnades. Here is where to look for each craft:",
          items: [
            {
              title: "Johari Bazaar (Precious Gems & Jewellery)",
              body: "The world center for gemstone cutting and trading. Best for Kundan, Meenakari (enamelling), Polki diamonds, silver jewellery, and bridal sarees.",
            },
            {
              title: "Bapu Bazaar & Nehru Bazaar (Mojari Juttis & Bandhani)",
              body: "The most vibrant textile and footwear markets. Famous for handcrafted camel-leather juttis with colourful embroidery and bandhani tie-dye sarees.",
            },
            {
              title: "Tripolia Bazaar (Lac Bangles & Brassware)",
              body: "Visit Maniharon ka Rasta within Tripolia Bazaar to watch traditional artisans heat and shape natural lac into glittering bangle sets.",
            },
            {
              title: "Sireh Deori Bazaar (Blue Pottery & Handicrafts)",
              body: "Located opposite Hawa Mahal, offering blue pottery plates, brass statues, puppets, and camel-wool dhurrie rugs.",
            },
          ],
        },
        {
          heading: "Signature Jaipur Crafts & Where to Find Genuine Quality",
          text: "Invest in the city's globally recognized heritage artforms:",
          items: [
            {
              title: "Hand Block Printed Textiles (Sanganeri & Bagru)",
              body: "Characterized by intricate floral buttis (Sanganeri) or bold geometric indigo prints (Bagru) stamped with carved teak woodblocks. Visit the Anokhi Museum of Hand Printing or explore Bagru village for authentic workshops.",
            },
            {
              title: "Jaipur Blue Pottery (GI-Tagged)",
              body: "Crafted without clay from a quartz powder, glass, and Fuller's earth mixture, glazed in vibrant cobalt blues and turquoise greens. Visit Kripal Kumbh in Bani Park, founded by revival master Padma Shri Kripal Singh Shekhawat.",
            },
            {
              title: "Jaipuri Razai (Featherlight Silk Quilts)",
              body: "Carded by hand to achieve supreme warmth at featherlight weight (often under 500 grams). Available along Chaura Rasta and Johari Bazaar.",
            },
          ],
        },
        {
          heading: "Essential Shopping Tips & Avoiding Common Scams",
          text: "Protect your wallet and support genuine artisans:",
          items: [
            {
              title: "Beware of Driver Commission Schemes",
              body: "Never allow auto-rickshaw or taxi drivers to redirect you to their 'special government factory'—they receive up to 40% kickback commissions on your purchases.",
            },
            {
              title: "Bargaining Protocol",
              body: "Bargaining is expected in street markets like Bapu Bazaar (aim for 20% to 30% below opening quote). Government emporiums (Rajasthali on MI Road) feature fixed prices.",
            },
            {
              title: "Gemstone Authentication",
              body: "Only buy precious gems from reputable, certified dealers affiliated with the Jewellers Association of Jaipur. Insist on a formal certificate of authenticity.",
            },
          ],
        },
      ],
      checklist: [
        "Carry cash for street bazaar stalls, though most shops accept UPI QR payments",
        "Sunday closure: Most walled city markets close on Sundays; plan your shopping for weekdays",
        "Visit Kripal Kumbh for authentic, lead-free blue pottery pieces",
        "Try a cup of kulhad lassi at Lassiwala Shop 312 on MI Road between shopping runs",
      ],
    },
  };

  const guides = [
    {
      data: guide1Data,
      heroMedia: childAttractions.find((c) => c.slug === "amber-fort")?.heroMediaId ? await db.select().from(media).where(eq(media.id, childAttractions.find((c) => c.slug === "amber-fort")!.heroMediaId!)).limit(1).then((r) => r[0]) : null,
      linkedPlaces: [j, raj, ...childAttractions.filter((c) => ["amber-fort", "jaigarh-fort", "nahargarh-fort"].includes(c.slug))],
    },
    {
      data: guide2Data,
      heroMedia: jMedia,
      linkedPlaces: [j, raj],
    },
  ];

  for (const { data, heroMedia, linkedPlaces } of guides) {
    const guideValidation = validateGuide(data);
    if (!guideValidation.ok) {
      throw new Error(`Guide ${data.slug} validation failed: ${guideValidation.error}`);
    }

    const linkedPlaceRows = linkedPlaces.filter(Boolean);
    const guideSnapshot: GuideSnapshot = {
      slug: data.slug,
      title: data.title,
      summary: data.summary,
      tripTypes: data.tripTypes,
      body: guideValidation.value.body,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      hero: heroMedia
        ? {
            url: heroMedia.url,
            alt: heroMedia.alt,
            caption: heroMedia.caption,
            kind: heroMedia.kind,
            license: heroMedia.license,
            licenseUrl: heroMedia.licenseUrl,
            attribution: heroMedia.attribution,
            sourceUrl: heroMedia.sourceUrl,
          }
        : heroImage,
      place: {
        name: j.name,
        slug: j.slug,
        kind: j.kind,
        stateSlug: raj?.slug || "rajasthan",
        stateName: raj?.name || "Rajasthan",
        path: `/india/${raj?.slug || "rajasthan"}/${j.slug}`,
      },
      places: linkedPlaceRows.map((p) => ({
        name: p.name,
        slug: p.slug,
        kind: p.kind,
        stateSlug: raj?.slug || "rajasthan",
      })),
    };

    const [existingGuide] = await db.select().from(travelGuides).where(eq(travelGuides.slug, data.slug)).limit(1);
    let guideId = existingGuide?.id;

    if (existingGuide) {
      await db
        .update(travelGuides)
        .set({
          placeId: j.id,
          title: data.title,
          summary: data.summary,
          tripTypes: data.tripTypes,
          body: data.body as any,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          heroMediaId: heroMedia?.id || j.heroMediaId,
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
          placeId: j.id,
          title: data.title,
          summary: data.summary,
          tripTypes: data.tripTypes,
          body: data.body as any,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          heroMediaId: heroMedia?.id || j.heroMediaId,
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

  // ==========================================
  // PUBLISH NEW PLACE VERSION FOR JAIPUR
  // ==========================================
  console.log("\nBuilding published snapshot for Jaipur...");
  const destinationSnapshot = {
    place: {
      name: j.name,
      kind: j.kind,
      slug: j.slug,
      summary:
        "Rajasthan's historic royal capital and UNESCO World Heritage Pink City, famed for the honeycombed Hawa Mahal, the hilltop fortress of Amer, astronomical observatories, and vibrant heritage bazaars.",
      lat: 26.9124,
      lng: 75.7873,
      seoTitle: "Jaipur Travel Guide: Places to Visit, Forts, Palaces & Pink City Itineraries | VacayOut",
      seoDescription:
        "Complete Jaipur travel guide featuring Amer Fort, Hawa Mahal, City Palace, Nahargarh sunset, Jantar Mantar, Pink City bazaars, local food, and realistic itineraries.",
      state: raj?.name || "Rajasthan",
      parent: raj
        ? {
            name: raj.name,
            slug: raj.slug,
            kind: raj.kind,
          }
        : null,
      displayMode: "page",
      hero: heroImage,
    },
    sections: SECTION_DATA.map((s) => ({
      key: s.key,
      body: s.body,
    })),
  };

  const versions = await db
    .select({ version: placeVersions.version })
    .from(placeVersions)
    .where(eq(placeVersions.placeId, j.id));
  const nextVer = (versions.length ? Math.max(...versions.map((v) => v.version)) : 0) + 1;

  const [pvRow] = await db
    .insert(placeVersions)
    .values({
      placeId: j.id,
      version: nextVer,
      snapshot: destinationSnapshot as any,
    })
    .returning();

  await db
    .update(places)
    .set({
      summary: destinationSnapshot.place.summary,
      seoTitle: destinationSnapshot.place.seoTitle,
      seoDescription: destinationSnapshot.place.seoDescription,
      status: "published",
      publishedVersionId: pvRow.id,
      updatedAt: new Date(),
    })
    .where(eq(places.id, j.id));

  // Update search document
  const doc = {
    versionId: pvRow.id,
    path: `/india/${raj?.slug || "rajasthan"}/${j.slug}`,
    name: j.name,
    kind: j.kind,
    stateName: raj?.name || "Rajasthan",
    content: snapshotText(destinationSnapshot as any),
    updatedAt: new Date(),
  };
  await db
    .insert(searchDocuments)
    .values({ placeId: j.id, ...doc })
    .onConflictDoUpdate({ target: searchDocuments.placeId, set: doc });

  console.log(`\n🎉 Success! Jaipur published version ${nextVer} (id: ${pvRow.id}) with all 19 sections, 2 rich itineraries with day-wise sight cards, and 2 travel guides!`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
