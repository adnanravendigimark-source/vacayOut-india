/**
 * Researched and verified mock data for Himachal Pradesh (State) and Manali (Destination)
 * Designed strictly according to the VacayOut State & Destination Page specifications.
 */

export interface DestinationCardData {
  slug: string;
  name: string;
  image: string;
  type: string;
  category: "popular" | "adventure" | "nature" | "heritage" | "offbeat";
  description: string;
  bestKnownFor: string;
  recommendedDuration: string;
  bestSeason: string;
  altitude?: string;
  href: string;
}

export interface AttractionData {
  id: string;
  name: string;
  category: "temple" | "pass" | "nature" | "heritage" | "viewpoint";
  image: string;
  parentDestination: string;
  parentDestinationHref: string;
  distance: string;
  highlights: string[];
  description: string;
  visitingDuration: string;
  entryFee: string;
  timings: string;
  seasonalAccess: string;
  permitsRequired: string | null;
  insiderTips: string;
}

export interface ExperienceData {
  id: string;
  title: string;
  category: string;
  image: string;
  location: string;
  locationHref?: string;
  bestSeason: string;
  duration: string;
  difficulty: string;
  safetyNote: string;
  description: string;
  bookingRequirement: string;
}

export interface ItineraryData {
  id: string;
  title: string;
  duration: string;
  daysCount: number;
  route: string;
  startEnd: string;
  pace: string;
  overview: string;
  highlights: string[];
  days: {
    day: number;
    title: string;
    morning: string;
    afternoon: string;
    evening: string;
    overnight: string;
    travelTime: string;
  }[];
}

export interface GuideCardData {
  id: string;
  title: string;
  slug: string;
  category: string;
  readTime: string;
  summary: string;
  image: string;
}

export interface AreaData {
  id: string;
  name: string;
  vibe: string;
  highlights: string[];
  foodAndShopping: string;
  accommodationType: string;
  bestFor: string;
  distanceToCenter: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

/* =========================================================================
   1. HIMACHAL PRADESH STATE DATA
   ========================================================================= */

export const HIMACHAL_STATE_DATA = {
  name: "Himachal Pradesh",
  slug: "himachal-pradesh",
  region: "North India",
  tagline: "Land of the Gods — Majestic Pine Valleys, Snow Peaks, and Ancient Himalayan Heritage",
  heroImage: "/images/destinations/himachal-hero.jpg",
  intro:
    "Himachal Pradesh stretches across the outer and central ranges of the Western Himalayas. From apple-scented valleys in Kullu to high-altitude cold deserts in Spiti, colonial hill ridges in Shimla, and Tibetan monasteries in Dharamshala, the state offers diverse alpine journeys across interconnected river basins and mountain passes.",
  quickStats: {
    bestSeasons: "March–June (Lush Valleys) & Oct–Feb (Snowfall)",
    duration: "7–14 days recommended",
    capital: "Shimla (Summer) / Dharamshala (Winter)",
    keyDistricts: "12 districts across 4 major river basins",
    topExperiences: "Snow sports, High-altitude treks, Tibetan culture, Apple orchards, Toy train",
  },

  about: {
    geography:
      "Covering 55,673 sq km, Himachal Pradesh rises from 350 meters in the Shivalik foothills to over 6,800 meters in the Great Himalayan and Zanskar ranges. Four major Himalayan river basins shape its terrain: the Sutlej, Beas, Ravi, and Chenab. The state is naturally segmented into three distinct topographic zones: the subtropical Outer Himalayas (Sirmaur, Solan, Kangra foothills), the temperate Mid-Himalayas (Shimla, Kullu, Chamba), and the alpine Greater Himalayas with rain-shadow cold deserts (Lahaul and Spiti, Kinnaur).",
    circuits: [
      {
        name: "Kullu–Manali Circuit",
        description: "The adventure and snow heartland along the Beas River, stretching from Mandi through Kullu, Manali, Solang Valley, and into Lahaul via the Atal Tunnel.",
      },
      {
        name: "Shimla & Colonial Hills Circuit",
        description: "The historical administrative hub with pine forests, heritage architecture, the UNESCO Kalka-Shimla railway, Kufri, and apple-growing orchards of Kotgarh.",
      },
      {
        name: "Kangra Valley & Dharamshala Circuit",
        description: "Dominated by the dramatic Dhauladhar mountain face, this circuit includes Tibetan culture in McLeod Ganj, tea gardens in Palampur, and world-class paragliding at Bir Billing.",
      },
      {
        name: "Spiti & Kinnaur Trans-Himalayan Circuit",
        description: "High-altitude arid mountains, thousand-year-old Buddhist monasteries (Tabo, Key), high passes (Kunzum, Rohtang), and surreal landscapes along the Sutlej and Spiti rivers.",
      },
      {
        name: "Chamba & Dalhousie Circuit",
        description: "Cedar-clad ridges, British-era hill sanitariums, the meadow of Khajjiar ('Mini Switzerland'), and ancient wooden temples of Bharmaur along the Ravi River.",
      },
    ],
    culture:
      "Known as 'Devbhumi' (Land of the Gods), each village in Himachal Pradesh has its own presiding deity (Gram Devta) carried in palanquins during festivals. Notable celebrations include the week-long Kullu Dussehra, Minjar Fair in Chamba, and Losar (Tibetan New Year) in Spiti and McLeod Ganj. Wood and slate architecture (Kath-Kuni style) dominates ancient forts and temples.",
    food:
      "Himachali cuisine is deeply rooted in local mountain grains, lentils, yogurt, and aromatic spices. The centerpiece is 'Dham' — a traditional festive multi-course vegetarian feast served on dried leaf plates (pattals), prepared by hereditary chefs called 'Botis'. Signature dishes include Siddu (steamed fermented wheat bread with walnut or poppy seed stuffing served with melted ghee), Babru (Himachali kachori), Trout Fish in Kullu, and Chha Gosht (slow-cooked mutton in yogurt gravy).",
    languages: "Hindi is the official language. Regionally, Western Pahari dialects (Kangri, Mandeali, Kulvi, Mahasui) and Tibeto-Burman languages (Kinnauri, Spitian) are spoken. English is widely understood in tourist centers.",
    firstTimeAdvice:
      "Always buffer road travel times in mountain corridors. Avoid night driving during monsoons (July–August). Above 2,500m (Manali, Spiti), stay hydrated to avoid Acute Mountain Sickness (AMS). Carry sufficient Indian Rupees in cash for remote valleys where ATMs and cellular network data may experience interruptions.",
    transport: {
      airports: [
        { name: "Kullu–Manali Airport (Bhuntar - KUU)", distance: "50 km from Manali, 10 km from Kullu", routes: "Regular flights from Delhi and Chandigarh; serves Kullu, Manali, and Parvati Valley." },
        { name: "Kangra Airport (Gaggal - DHM)", distance: "14 km from Dharamshala, 22 km from McLeod Ganj", routes: "Daily connections from Delhi; serves Dharamshala, Palampur, and Bir Billing." },
        { name: "Shimla Airport (Jubbarhatti - SLV)", distance: "22 km from Shimla town", routes: "Select ATR turboprop flights from Delhi; weather-dependent." },
      ],
      railways:
        "The broad-gauge railhead terminates at Kalka (for Shimla) and Pathankot (for Kangra and Dalhousie). From Kalka, the historic 96 km narrow-gauge Kalka-Shimla Toy Train (UNESCO World Heritage) snakes through 103 tunnels and over 800 bridges.",
      roads:
        "Himachal is best accessed by road. Himachal Road Transport Corporation (HRTC) and HPTDC run premium overnight Volvo and Scania buses from Delhi ISBT Kashmiri Gate and Chandigarh Sector 43 directly to Shimla, Manali, and Dharamshala. Key national highways include NH-44/NH-21 (Delhi to Manali via the Kiratpur-Nerchowk 4-lane expressway) and NH-5 (Hindustan–Tibet road).",
    },
  },

  destinations: [
    {
      slug: "manali",
      name: "Manali",
      image: "/images/destinations/manali-hero.jpg",
      type: "Alpine Adventure Hub",
      category: "popular",
      description: "Himachal's prime alpine destination, nestled in the upper Kullu Valley with pine forests, Solang snow sports, and the gateway to Atal Tunnel.",
      bestKnownFor: "Solang snow sports, Old Manali cafes, Atal Tunnel gateway, Rohtang Pass",
      recommendedDuration: "3–5 days",
      bestSeason: "October to June",
      altitude: "2,050 m",
      href: "/india/himachal-pradesh/manali",
    },
    {
      slug: "shimla",
      name: "Shimla",
      image: "/images/destinations/shimla.jpg",
      type: "Colonial Hill Capital",
      category: "popular",
      description: "The storied summer capital of British India, perched on a seven-mile crescent ridge with neo-Gothic heritage, Mall Road, and pine walks.",
      bestKnownFor: "The Ridge, Kalka–Shimla Toy Train, Viceregal Lodge, Mall Road promenade",
      recommendedDuration: "2–4 days",
      bestSeason: "March to June & December to February",
      altitude: "2,276 m",
      href: "/india/himachal-pradesh/manali",
    },
    {
      slug: "dharamshala",
      name: "Dharamshala & McLeod Ganj",
      image: "/images/destinations/dharamshala.jpg",
      type: "Tibetan Spiritual Sanctuary",
      category: "popular",
      description: "Home to His Holiness the Dalai Lama and the Central Tibetan Administration, set against the staggering snow cliffs of the Dhauladhar Range.",
      bestKnownFor: "Tsuglagkhang Monastery, Triund Trek, Tibetan handicrafts, Dharamshala Cricket Stadium",
      recommendedDuration: "3–5 days",
      bestSeason: "March to June & September to November",
      altitude: "1,457 m - 2,082 m",
      href: "/india/himachal-pradesh/manali",
    },
    {
      slug: "spiti-valley",
      name: "Spiti Valley",
      image: "/images/destinations/spiti.jpg",
      type: "High-Altitude Cold Desert",
      category: "adventure",
      description: "A stark, trans-Himalayan wonderland bordered by Tibet, renowned for millennium-old monasteries, dramatic clay gorges, and fossil villages.",
      bestKnownFor: "Key Monastery, Chandratal Lake, Dhankar Gompa, Highest post office in Hikkim",
      recommendedDuration: "6–9 days",
      bestSeason: "June to October",
      altitude: "3,800 m",
      href: "/india/himachal-pradesh/manali",
    },
    {
      slug: "dalhousie",
      name: "Dalhousie & Khajjiar",
      image: "/images/destinations/dalhousie.jpg",
      type: "Cedar-Clad Hill Retreat",
      category: "popular",
      description: "Spread over five pine hills with panoramic views of the Pir Panjal, colonial churches, and the saucer-shaped meadow of Khajjiar.",
      bestKnownFor: "Khajjiar meadow, Dainkund Peak, Kalatop Wildlife Sanctuary, Colonial architecture",
      recommendedDuration: "2–4 days",
      bestSeason: "March to June & October to December",
      altitude: "1,970 m",
      href: "/india/himachal-pradesh/manali",
    },
    {
      slug: "bir-billing",
      name: "Bir Billing",
      image: "/images/destinations/trekking.jpg",
      type: "Paragliding Capital of India",
      category: "adventure",
      description: "A global paragliding hotspot hosting the World Cup, paired with tranquil Tibetan monastic settlements and organic tea plantations.",
      bestKnownFor: "World-class paragliding tandem flights, Chokling Monastery, cafe culture, sunset ridge",
      recommendedDuration: "2–3 days",
      bestSeason: "October to November & March to May",
      altitude: "1,525 m (Bir) / 2,400 m (Billing)",
      href: "/india/himachal-pradesh/manali",
    },
    {
      slug: "kasol",
      name: "Kasol & Parvati Valley",
      image: "/images/destinations/wildlife.jpg",
      type: "Riverside Backpacker Haven",
      category: "adventure",
      description: "Set along the gushing turquoise Parvati River, famous for Israeli cuisine, pine forest treks to Tosh, Malana, and the Kheerganga natural hot springs.",
      bestKnownFor: "Kheerganga hot springs trek, Tosh village, riverside cafes, Israeli delicacies",
      recommendedDuration: "3–5 days",
      bestSeason: "April to June & September to November",
      altitude: "1,580 m",
      href: "/india/himachal-pradesh/manali",
    },
    {
      slug: "tirthan-valley",
      name: "Tirthan Valley",
      image: "/images/destinations/rishikesh.jpg",
      type: "Pristine Nature & Trout Haven",
      category: "nature",
      description: "An unspoiled Himalayan sanctuary on the doorstep of the UNESCO Great Himalayan National Park, famous for brown trout fishing and deodar forests.",
      bestKnownFor: "Great Himalayan National Park, Serolsar Lake trek, Chehni Kothi tower, trout angling",
      recommendedDuration: "3–4 days",
      bestSeason: "March to June & October to November",
      altitude: "1,600 m",
      href: "/india/himachal-pradesh/manali",
    },
  ] as DestinationCardData[],

  attractions: [
    {
      id: "hadimba-temple",
      name: "Hadimba Devi Temple",
      category: "temple",
      image: "/images/destinations/hidimba-temple.jpg",
      parentDestination: "Manali",
      parentDestinationHref: "/india/himachal-pradesh/manali",
      distance: "2.5 km from Manali Mall Road",
      highlights: ["1553 pagoda wood architecture", "Surrounded by ancient deodar forest (Dhungri Van Vihar)", "Dedicated to Goddess Hadimba from Mahabharata"],
      description: "A four-tiered pagoda-style wooden temple built in 1553 CE by Raja Bahadur Singh, featuring exquisite woodcarvings and brass motifs surrounded by giant cedar trees.",
      visitingDuration: "1–1.5 hours",
      entryFee: "Free entry",
      timings: "8:00 AM – 6:00 PM daily",
      seasonalAccess: "Open year-round; magical during winter snowfall",
      permitsRequired: null,
      insiderTips: "Visit early morning before 10 AM to experience the peaceful cedar forest walk without tourist crowds.",
    },
    {
      id: "rohtang-pass",
      name: "Rohtang Pass",
      category: "pass",
      image: "/images/destinations/rohtang-pass.jpg",
      parentDestination: "Manali",
      parentDestinationHref: "/india/himachal-pradesh/manali",
      distance: "51 km north of Manali",
      highlights: ["3,978 m (13,050 ft) high Pir Panjal pass", "360-degree glaciers and snowfields", "Gateway linking Kullu to Lahaul and Spiti"],
      description: "The legendary mountain pass offering dramatic views of glaciers, peaks, and the Chandra River. Renowned for summer snow activities and breathtaking panoramic views.",
      visitingDuration: "Half-day excursion (3–4 hours at pass)",
      entryFee: "₹500 permit fee + ₹50 congestion fee",
      timings: "Open 6:00 AM – 4:00 PM (Closed Tuesdays for maintenance)",
      seasonalAccess: "Open mid-May to November; snowbound and closed during deep winter",
      permitsRequired: "Mandatory Rohtang Green Permit (limited daily quotas, book online)",
      insiderTips: "Book permits at least 3-4 days in advance via the district administration portal. Depart by 6:00 AM to beat traffic jams at Gulaba.",
    },
    {
      id: "atal-tunnel",
      name: "Atal Tunnel & Sissu",
      category: "pass",
      image: "/images/destinations/solang-valley.jpg",
      parentDestination: "Manali",
      parentDestinationHref: "/india/himachal-pradesh/manali",
      distance: "28 km north of Manali",
      highlights: ["World's longest highway tunnel above 10,000 feet (9.02 km)", "Cuts travel time to Lahaul by 4 hours", "Instant transit from green Kullu to snow-clad Lahaul"],
      description: "An engineering marvel carved under the Rohtang Pass at 3,048 meters, providing all-weather connectivity into the alpine desert of Lahaul Valley and Sissu waterfall.",
      visitingDuration: "Half-day to Full-day day trip",
      entryFee: "Free transit (toll-free)",
      timings: "Open 24/7 (subject to snow clearing in peak winter)",
      seasonalAccess: "Year-round all-weather access",
      permitsRequired: null,
      insiderTips: "No permit needed for Atal Tunnel! Combine with a visit to the frozen Sissu waterfall and Lahauli village cafes.",
    },
    {
      id: "solang-valley",
      name: "Solang Valley",
      category: "nature",
      image: "/images/licensed/solang-valley-manali.jpg",
      parentDestination: "Manali",
      parentDestinationHref: "/india/himachal-pradesh/manali",
      distance: "14 km from Manali",
      highlights: ["Premier adventure sports bowl", "Skiing and snowboarding in winter", "Paragliding, zorbing, and ropeway ride in summer"],
      description: "A wide glacial valley nestled beneath snow-capped peaks, serving as Himachal's primary adventure center with year-round activities and a modern cable car.",
      visitingDuration: "3–5 hours",
      entryFee: "Free entry (activities individually priced)",
      timings: "9:00 AM – 6:00 PM",
      seasonalAccess: "Open year-round; winter for snow sports, summer for paragliding",
      permitsRequired: null,
      insiderTips: "Take the Solang ropeway up to Mount Phatru for panoramic views of Anjani Mahadev and the Pir Panjal range.",
    },
    {
      id: "kalka-shimla-railway",
      name: "Kalka–Shimla Heritage Railway",
      category: "heritage",
      image: "/images/destinations/shimla.jpg",
      parentDestination: "Shimla",
      parentDestinationHref: "/india/himachal-pradesh/manali",
      distance: "Starts from Kalka terminal up to Shimla",
      highlights: ["UNESCO World Heritage Mountain Railway", "Built in 1903 with 103 tunnels and 864 bridges", "Panoramic pine ridge views on 2.5-ft narrow gauge"],
      description: "One of India's most celebrated engineering feats, climbing 1,420 meters over a scenic 96-kilometer route between Kalka and Shimla.",
      visitingDuration: "4.5–5 hours journey",
      entryFee: "₹65 – ₹500 depending on train class (Shivalik Deluxe Express)",
      timings: "Multiple daily morning and noon departures",
      seasonalAccess: "Year-round service",
      permitsRequired: null,
      insiderTips: "Book tickets on the IRCTC portal 60–90 days in advance as seats on the Shivalik Deluxe sell out quickly.",
    },
    {
      id: "triund-trek",
      name: "Triund Ridge Trek",
      category: "nature",
      image: "/images/destinations/trekking.jpg",
      parentDestination: "Dharamshala",
      parentDestinationHref: "/india/himachal-pradesh/manali",
      distance: "9 km trail from McLeod Ganj",
      highlights: ["Spectacular ridge overlooking Kangra Valley on one side and Dhauladhar wall on the other", "Popular beginner-friendly day or overnight trek", "Camp under clear starry skies"],
      description: "The crown jewel of Dharamshala, this popular trek takes hikers through rhododendron and oak forests to a ridge directly beneath the towering Dhauladhar mountains.",
      visitingDuration: "Full day (4–5 hours ascent, 3 hours descent)",
      entryFee: "Forest department trail registration fee (~₹50)",
      timings: "Start before 9:00 AM; night camping permits strictly monitored",
      seasonalAccess: "March to December; closed in heavy snow months",
      permitsRequired: "Forest department checkpoint registration at Galu Temple",
      insiderTips: "Avoid weekends if possible for a quiet trek. Carry your own refillable water flask to avoid single-use plastic bottles on the trail.",
    },
  ] as AttractionData[],

  experiences: [
    {
      id: "paragliding-bir",
      title: "Tandem Paragliding at Bir Billing",
      category: "Air Adventure",
      image: "/images/destinations/trekking.jpg",
      location: "Bir Billing, Kangra",
      bestSeason: "Oct–Nov & Mar–May",
      duration: "15–30 minutes flight time",
      difficulty: "Beginner friendly (Tandem with certified pilot)",
      safetyNote: "Ensure your pilot has a valid Himachal Tourism commercial license and reserve parachute.",
      description: "Launch from the 2,400m ridge at Billing and soar over terraced valleys, Buddhist monasteries, and pine ridges before landing gently in Bir meadow.",
      bookingRequirement: "Advance booking recommended during autumn flying season.",
    },
    {
      id: "hampta-pass-trek",
      title: "Hampta Pass & Chandratal Trek",
      category: "Alpine Trekking",
      image: "/images/destinations/solang-valley.jpg",
      location: "Manali to Spiti Valley",
      bestSeason: "Mid-June to Mid-October",
      duration: "4–5 days",
      difficulty: "Moderate (Maximum altitude 4,287 m)",
      safetyNote: "Requires acclimatization in Manali for 24 hours prior to trek start.",
      description: "The ultimate dramatic contrast trek: start from lush green Kullu pine forests, cross the 4,287m Hampta Pass, and emerge into the barren moonscapes of Lahaul and blue Chandratal Lake.",
      bookingRequirement: "Pre-book with verified mountain guide agencies.",
    },
    {
      id: "beas-river-rafting",
      title: "White Water Rafting on River Beas",
      category: "Water Sports",
      image: "/images/destinations/rishikesh.jpg",
      location: "Kullu Valley (Pirdi to Jhiri)",
      bestSeason: "March to June & Mid-September to November",
      duration: "1–2 hours on water (7–14 km stretch)",
      difficulty: "Grade II & III Rapids (Exciting but safe for beginners)",
      safetyNote: "Operations suspended during monsoon season (July 15 to Sept 15) by state order.",
      description: "Tackle foaming Himalayan rapids along the snow-fed Beas River with scenic views of cedar-covered mountain slopes on both banks.",
      bookingRequirement: "Available on-spot at certified Kullu river camps.",
    },
    {
      id: "traditional-dham",
      title: "Himachali Dham Gastronomic Feast",
      category: "Culinary Heritage",
      image: "/images/unsplash/plan/food.jpg",
      location: "Statewide (Specialty in Kangra, Mandi & Chamba)",
      bestSeason: "Year-round",
      duration: "2 hours",
      difficulty: "Suitable for all",
      safetyNote: "Traditional pure vegetarian preparations without onion or garlic.",
      description: "Sit on floor mats and savor a heritage feast featuring Madra (chickpeas in rich curd gravy), Sepu Vadi, Mah Dal, and sweet Mittha prepared by traditional Botis.",
      bookingRequirement: "Offered at cultural restaurants and during regional festivals.",
    },
  ] as ExperienceData[],

  itineraries: [
    {
      id: "shimla-manali-classic",
      title: "The Classic Himachal: Shimla, Kullu & Manali",
      duration: "6 Days / 5 Nights",
      daysCount: 6,
      route: "Chandigarh → Shimla → Kullu → Manali → Chandigarh",
      startEnd: "Starts in Chandigarh / Ends in Chandigarh (or Delhi)",
      pace: "Moderate, family & couple friendly",
      overview: "The quintessential introductory journey through Himachal's most iconic hill station and adventure valley.",
      highlights: ["UNESCO Kalka-Shimla Toy Train ride", "Walk along the colonial Mall & Ridge in Shimla", "Solang Valley adventure sports and Atal Tunnel to Sissu", "Old Manali wooden temples and bohemian riverside cafes"],
      days: [
        {
          day: 1,
          title: "Arrival in Chandigarh & Drive to Shimla",
          morning: "Arrive at Chandigarh airport/station; scenic 3.5-hour drive via the Himalayan Expressway.",
          afternoon: "Check into Shimla hotel; leisurely walk around the historic Mall Road.",
          evening: "Sunset views at the Ridge and Christ Church; warm dinner at a traditional Himachali eatery.",
          overnight: "Shimla",
          travelTime: "3.5 hours road transfer (115 km)",
        },
        {
          day: 2,
          title: "Colonial Shimla & Kufri Pine Ridges",
          morning: "Visit the grand Viceregal Lodge (Indian Institute of Advanced Study) with its manicured botanical lawns.",
          afternoon: "Short excursion to Kufri for panoramic cedar forest and snow range views.",
          evening: "Explore Lakkar Bazaar for wooden handicrafts and steamed Himachali momos.",
          overnight: "Shimla",
          travelTime: "Local sightseeing (30 km)",
        },
        {
          day: 3,
          title: "Scenic Drive to Manali via Kullu Valley",
          morning: "Depart Shimla early; drive via Bilaspur, Sundernagar Lake, and the scenic Pandoh Dam.",
          afternoon: "Stop in Kullu Valley to visit local handloom weaving cooperative societies for authentic shawls.",
          evening: "Arrive in Manali; unwind along the gushing Beas River.",
          overnight: "Manali",
          travelTime: "7–8 hours road journey (240 km)",
        },
        {
          day: 4,
          title: "Manali Heritage & Old World Charm",
          morning: "Visit the ancient pagoda-style Hadimba Devi Temple amidst giant deodar trees in Dhungri forest.",
          afternoon: "Wander across the Manalsu bridge into Old Manali; visit the historic stone Manu Temple.",
          evening: "Relax in Vashisht natural hot sulphur springs; dinner at a riverside cafe in Old Manali.",
          overnight: "Manali",
          travelTime: "Local town exploration",
        },
        {
          day: 5,
          title: "Solang Valley & Atal Tunnel to Lahaul",
          morning: "Early departure to Solang Valley for ropeway views and paragliding.",
          afternoon: "Drive through the 9.02 km Atal Tunnel emerging into Sissu (Lahaul Valley) to view the waterfall.",
          evening: "Return to Manali for souvenir shopping on the pedestrian Mall Road.",
          overnight: "Manali",
          travelTime: "3–4 hours return trip (80 km)",
        },
        {
          day: 6,
          title: "Departure to Chandigarh",
          morning: "Breakfast overlooking the mountain peaks; check out and begin return drive via the 4-lane expressway.",
          afternoon: "Drop-off at Chandigarh airport/railway station for onward journey.",
          evening: "Transit home.",
          overnight: "Departure",
          travelTime: "6.5–7 hours drive (280 km)",
        },
      ],
    },
    {
      id: "kangra-manali-peace",
      title: "Dharamshala, Bir Billing & Manali Explorer",
      duration: "8 Days / 7 Nights",
      daysCount: 8,
      route: "Gaggal (DHM) → McLeod Ganj → Bir Billing → Manali",
      startEnd: "Starts in Dharamshala / Ends in Chandigarh",
      pace: "Relaxed with immersive cultural & adventure experiences",
      overview: "A journey bridging Tibetan spirituality, Himalayan paragliding thrills, and alpine cedar valleys.",
      highlights: ["Tsuglagkhang Temple & Dalai Lama residence", "Tea gardens of Palampur & Baijnath 13th-century Shiva temple", "Tandem paragliding flight from Billing ridge", "Atal Tunnel and high valley exploration"],
      days: [
        {
          day: 1,
          title: "Arrival in McLeod Ganj",
          morning: "Arrive at Kangra Airport or Pathankot; scenic transfer to McLeod Ganj.",
          afternoon: "Explore the bustling Tibetan market and Namgyal Monastery.",
          evening: "Sunset prayer wheel walk at the Tsuglagkhang temple complex.",
          overnight: "McLeod Ganj",
          travelTime: "45 minutes from airport",
        },
        {
          day: 2,
          title: "Triund Day Hike & Bhagsu Falls",
          morning: "Hike through rhododendron forests up toward the Triund ridge for Dhauladhar views.",
          afternoon: "Descend via Bhagsu waterfall; coffee and walnut pie in a hillside cafe.",
          evening: "Quiet dinner with Tibetan thukpa and steamed momos.",
          overnight: "McLeod Ganj",
          travelTime: "Hiking day",
        },
        {
          day: 3,
          title: "Transfer to Bir Billing via Palampur Tea Estates",
          morning: "Drive through the rolling tea gardens of Palampur; stop at the 1204 CE stone Baijnath Temple.",
          afternoon: "Arrive in Bir Tibetan colony; visit the majestic Chokling and Sherab Ling monasteries.",
          evening: "Watch paragliders touch down against the sunset at the Bir landing site.",
          overnight: "Bir",
          travelTime: "2.5 hours drive (70 km)",
        },
        {
          day: 4,
          title: "Paragliding in Billing & Drive to Manali",
          morning: "Jeep ride to Billing ridge at 2,400m; thrilling 25-minute tandem paragliding flight down to Bir.",
          afternoon: "Scenic drive through Mandi and the Aut Tunnel along the Beas River to Manali.",
          evening: "Check into Manali hotel; relax by the mountain stream.",
          overnight: "Manali",
          travelTime: "5 hours drive (175 km)",
        },
        {
          day: 5,
          title: "Manali Heritage & Pine Forest Walks",
          morning: "Visit Hadimba Temple and walk through the Van Vihar cedar sanctuary.",
          afternoon: "Visit the hot springs at Vashisht and hike up to Jogini waterfall.",
          evening: "Explore Old Manali's wood-fired pizzerias and acoustic live sessions.",
          overnight: "Manali",
          travelTime: "Local town travel",
        },
        {
          day: 6,
          title: "Atal Tunnel & Sissu Day Excursion",
          morning: "Drive through Atal Tunnel into the majestic high-altitude valley of Lahaul.",
          afternoon: "Walk by Sissu waterfall; try local Himalayan herbal tea in the valley.",
          evening: "Return through the tunnel to Manali; Mall Road evening stroll.",
          overnight: "Manali",
          travelTime: "3 hours return drive",
        },
        {
          day: 7,
          title: "Naggar Castle & Heritage Art Gallery",
          morning: "Drive to Naggar (21 km); tour the 15th-century wood-and-stone Naggar Castle.",
          afternoon: "Visit the Nicholas Roerich Art Gallery and Tripura Sundari Temple.",
          evening: "Farewell dinner overlooking the illuminated Kullu Valley.",
          overnight: "Manali",
          travelTime: "1.5 hours return drive (42 km)",
        },
        {
          day: 8,
          title: "Departure via Chandigarh",
          morning: "Check out early and begin return journey to Chandigarh airport.",
          afternoon: "Transfer and board return flight.",
          evening: "Transit home.",
          overnight: "Departure",
          travelTime: "6.5 hours drive (280 km)",
        },
      ],
    },
  ] as ItineraryData[],

  guides: [
    {
      id: "how-to-reach-himachal",
      title: "How to Reach Himachal Pradesh from Delhi: The Complete Transport Guide",
      slug: "how-to-reach-himachal-from-delhi",
      category: "Transport",
      readTime: "6 min read",
      summary: "Comparison of Volvo overnight buses, driving the new 4-lane expressway, flights to Bhuntar/Kangra, and the heritage Toy Train.",
      image: "/images/destinations/himachal-hero.jpg",
    },
    {
      id: "himachal-budget-guide",
      title: "Himachal Pradesh Travel Budget: Backpacker, Mid-Range & Luxury Breakdown",
      slug: "himachal-pradesh-travel-budget",
      category: "Budget & Costs",
      readTime: "7 min read",
      summary: "Daily costs for stays, transport unions, meals, activity permits, and money-saving seasonal tips.",
      image: "/images/unsplash/plan/stay.jpg",
    },
    {
      id: "monsoon-travel-safety",
      title: "Traveling to Himachal in Monsoon: Road Safety, Landslide Caution & Rain-Shadow Zones",
      slug: "himachal-monsoon-travel-safety",
      category: "Safety & Weather",
      readTime: "5 min read",
      summary: "What to avoid during July–August, why Spiti and Lahaul remain dry, and emergency helpline protocols.",
      image: "/images/destinations/rishikesh.jpg",
    },
    {
      id: "snowfall-destinations-hp",
      title: "Best Places to Witness Snowfall in Himachal: Towns, Best Months & Winter Packing",
      slug: "best-snowfall-places-in-himachal",
      category: "Seasons",
      readTime: "5 min read",
      summary: "Where to find fresh powder in Manali, Kufri, Sethan, and Jalori Pass with winter vehicle prep advice.",
      image: "/images/destinations/manali-hero.jpg",
    },
  ] as GuideCardData[],

  faqs: [
    {
      question: "Which destinations are best for a first-time trip to Himachal Pradesh?",
      answer: "For a first visit of 5–7 days, the classic combination of Shimla and Manali (or Dharamshala and Manali) offers the best infrastructure, comfortable hotels, historic heritage, and accessible snow experiences.",
    },
    {
      question: "How many days are needed to explore Himachal Pradesh properly?",
      answer: "A single circuit (such as Kullu–Manali or Kangra–Dharamshala) requires 4–5 days. Exploring two regions (like Shimla + Manali) needs 6–8 days. The full Trans-Himalayan Spiti circuit requires a minimum of 9–12 days due to high mountain road distances.",
    },
    {
      question: "Is Himachal Pradesh safe to visit during the monsoon season (July–August)?",
      answer: "Lower and mid-Himalayan valleys (Shimla, Mandi, Kullu, Dharamshala) receive intense rainfall and face risks of landslides and swollen river streams. If visiting in monsoon, avoid steep dirt trails and stick to major national highways, or travel to Lahaul and Spiti which lie in the trans-Himalayan rain-shadow zone.",
    },
    {
      question: "Do tourists need any special permits to visit Himachal Pradesh?",
      answer: "Indian and international tourists do NOT need permits for standard destinations like Shimla, Manali, Dharamshala, or Dalhousie. However, traveling to Rohtang Pass requires an online Green Permit. Also, foreign nationals require an Inner Line Permit (ILP) when traveling between Khab and Sumdo in the Kinnaur-Spiti border belt.",
    },
    {
      question: "What is the best way to reach Himachal from Delhi?",
      answer: "The most popular, reliable option is an overnight HRTC or HPTDC Volvo bus departing Delhi ISBT Kashmiri Gate between 6:00 PM and 10:00 PM, arriving in Shimla, Manali, or Dharamshala by morning. Alternatively, flights operate to Kangra (DHM) and Kullu (KUU), or you can drive via the new Kiratpur-Nerchowk expressway.",
    },
  ] as FAQItem[],
};

/* =========================================================================
   2. MANALI DESTINATION DATA
   ========================================================================= */

export const MANALI_DESTINATION_DATA = {
  name: "Manali",
  slug: "manali",
  parentState: "Himachal Pradesh",
  parentStateHref: "/india/himachal-pradesh",
  altitude: "2,050 m (6,726 ft)",
  nearestAirport: "Kullu–Manali Airport (Bhuntar - KUU) — 50 km / 1.5 hrs",
  nearestRailway: "Chandigarh (CDG) — 280 km / Kalka — 270 km",
  recommendedDuration: "3 to 5 days",
  bestSeason: "October to June (Snow: Dec–Feb; Pleasant Greenery: Mar–Jun)",
  heroImage: "/images/destinations/manali-hero.jpg",
  tagline: "Himachal's Alpine Capital — Where Glacial Peaks Meet Bohemian Cedar Valleys",
  intro:
    "Perched along the turquoise waters of the upper Beas River, Manali is India's most versatile mountain destination. It effortlessly balances ancient wooden pagoda temples and rustic apple orchards with high-altitude ski slopes, thrilling paragliding bowls, world-class highway engineering at the Atal Tunnel, and a vibrant bohemian cafe culture in Old Manali.",
  permitNotice:
    "Important: Trips crossing the Rohtang Pass require an online Green Permit issued by the Kullu District Administration (limited daily quota). Visiting Lahaul Valley via the 9.02 km Atal Tunnel does not require a Rohtang permit.",

  about: {
    setting:
      "Manali sits at the northern terminus of the Kullu Valley, sheltered by the Pir Panjal mountain range to the north and the Dhauladhar range to the southwest. The Beas River rushes straight through the heart of town, fed by snowmelt from the Rohtang ridge. Cedar and blue pine forests (deodar) cloak the valley walls, while terraced apple orchards step down toward the riverbanks.",
    whyFamous:
      "Originally a quiet trading stop on the ancient caravan route to Ladakh and Central Asia, Manali gained worldwide acclaim for its dramatic snow corridors, rich folklore surrounding Sage Manu (the Hindu lawgiver), timber-and-slate Kath-Kuni architecture, and unmatched outdoor sports facilities.",
    differentiator:
      "Unlike the colonial British architecture and promenade walks of Shimla, Manali is fundamentally wilder and more alpine. Compared to the laid-back hippie enclave of Kasol, Manali offers far broader infrastructure, top-tier mountain resorts, family adventure activities, and year-round accessibility to high glacial valleys.",
    whoShouldVisit:
      "Adventure lovers (paragliding, skiing, trekking), honeymooners seeking snow-view wooden chalets, families wanting safe mountain experiences, and remote workers looking for high-speed Wi-Fi in Old Manali's cafe community.",
    arrivalAdvice:
      "Plan at least 3 full days to experience both town heritage and high-altitude excursions like Solang and the Atal Tunnel. Reserve accommodation in Old Manali or Dhungri for tranquil forest stays, or near Mall Road for central accessibility.",
  },

  nearbyPlaces: [
    {
      name: "Old Manali",
      distance: "2.5 km from Mall Road",
      journeyTime: "10 mins by auto or 20 min uphill walk",
      bestSeason: "Year-round",
      image: "/images/destinations/old-manali.jpg",
      highlights: "Stone and wood village houses, sage Manu Temple, live acoustic cafes, apple orchards, laid-back backpacker atmosphere.",
      timeToSpend: "Half day or full evening",
    },
    {
      name: "Solang Valley",
      distance: "14 km north of Manali",
      journeyTime: "30–40 mins by cab",
      bestSeason: "Year-round (Snow in Dec–Mar, green in Apr–Oct)",
      image: "/images/destinations/solang-valley.jpg",
      highlights: "Himachal's primary adventure center, paragliding launch, state-of-the-art ropeway cabin ride, quad biking, and winter skiing.",
      timeToSpend: "3–5 hours",
    },
    {
      name: "Naggar",
      distance: "21 km south along left bank",
      journeyTime: "45 mins by cab",
      bestSeason: "March to November",
      image: "/images/unsplash/plan/about.jpg",
      highlights: "The 15th-century wood-and-stone Naggar Castle, Nicholas Roerich Himalayan Art Gallery, and peaceful apple orchards overlooking Beas River.",
      timeToSpend: "Half-day excursion",
    },
    {
      name: "Vashisht Village",
      distance: "3.5 km across Beas River",
      journeyTime: "15 mins by cab or auto",
      bestSeason: "Year-round",
      image: "/images/destinations/manali-hero.jpg",
      highlights: "Ancient stone temple dedicated to Sage Vashishta, natural hot sulphur bath springs with separate male/female pools, rooftop cafes.",
      timeToSpend: "2–3 hours",
    },
    {
      name: "Sethan & Hampta Foothills",
      distance: "12 km southeast (hairpin bends)",
      journeyTime: "45 mins by 4x4 vehicle",
      bestSeason: "Dec–Mar for igloos; Jun–Oct for bouldering & treks",
      image: "/images/destinations/solang-valley.jpg",
      highlights: "Quiet Buddhist village, winter igloo glamping, rock bouldering, and the trailhead for the Hampta Pass trek.",
      timeToSpend: "Day trip or overnight glamping",
    },
    {
      name: "Sissu (Lahaul Valley via Atal Tunnel)",
      distance: "40 km north through tunnel",
      journeyTime: "1 hour by cab",
      bestSeason: "Year-round",
      image: "/images/destinations/spiti.jpg",
      highlights: "Spectacular Sissu waterfall, willow and poplar groves, Tibetan Buddhist prayer flags, and dramatic dry trans-Himalayan peaks.",
      timeToSpend: "Full day excursion",
    },
  ],

  placesToVisit: [
    {
      id: "hadimba-temple",
      name: "Hadimba Devi Temple",
      category: "temple",
      image: "/images/destinations/hidimba-temple.jpg",
      distance: "2 km from Manali Mall Road (Dhungri Forest)",
      description: "An extraordinary 1553 CE four-tiered pagoda-style cedar temple dedicated to Goddess Hadimba, wife of Bhima from the Mahabharata epic, set inside the giant deodars of Dhungri Van Vihar.",
      highlights: ["Carved wooden doorframes with mythological deities", "Sacred rock footprint inside sanctum", "Pristine walking paths through protected cedar grove"],
      visitingDuration: "1 to 1.5 hours",
      timings: "8:00 AM – 6:00 PM daily",
      entryFee: "Free entry",
      seasonalAccess: "Open year-round; magical during snowfall",
      permitsRequired: null,
      insiderTips: "Visit early between 8:00 AM and 9:30 AM to enjoy the morning deodar forest aroma and avoid tour bus queues.",
    },
    {
      id: "solang-valley",
      name: "Solang Valley Adventure Arena",
      category: "nature",
      image: "/images/licensed/solang-valley-manali.jpg",
      distance: "14 km northwest of Manali",
      description: "A wide glacial valley renowned for panoramic mountain backdrops and year-round thrills, including the high-speed Solang Ropeway, tandem paragliding, snowmobiling, and quad biking.",
      highlights: ["Mount Phatru ropeway cable car (3,200m viewpoint)", "Winter snow sports and ski lessons", "Zorbing and open valley adventure activities"],
      visitingDuration: "3 to 5 hours",
      timings: "9:00 AM – 6:00 PM",
      entryFee: "Free entry to valley; activities ₹500–₹3,500",
      seasonalAccess: "Open all year",
      permitsRequired: null,
      insiderTips: "Check activity rates at the official government-approved counter before negotiating with private ride operators.",
    },
    {
      id: "rohtang-pass",
      name: "Rohtang Pass",
      category: "pass",
      image: "/images/destinations/rohtang-pass.jpg",
      distance: "51 km north of Manali along Leh Highway",
      description: "The world-famous high-altitude mountain pass at 3,978 meters (13,050 ft) on the Pir Panjal range, offering polar snowfields even into June and panoramic views of Himalayan peaks and Chandra River.",
      highlights: ["360-degree snow panorama of Sonapani Glacier", "Historic crossroads connecting Kullu to Lahaul and Ladakh", "High alpine snow sports"],
      visitingDuration: "4 hours at pass (Full day trip with driving)",
      timings: "6:00 AM – 4:00 PM (Closed Tuesdays for road maintenance)",
      entryFee: "₹500 permit fee + ₹50 Green tax per vehicle",
      seasonalAccess: "Open mid-May to November; closed in deep winter",
      permitsRequired: "Mandatory Rohtang Green Permit (limited quota, book online)",
      insiderTips: "Carry warm windproof jackets and polarized sunglasses; high-altitude glare on snow is intense.",
    },
    {
      id: "atal-tunnel-sissu",
      name: "Atal Tunnel & Sissu Waterfall",
      category: "pass",
      image: "/images/destinations/solang-valley.jpg",
      distance: "28 km to South Portal / 40 km to Sissu",
      description: "At 9.02 km, this is the world's longest highway tunnel above 10,000 feet. It cuts travel time from hours over Rohtang to just 15 minutes, opening up the dramatic cold desert landscape of Lahaul Valley.",
      highlights: ["Engineering marvel underneath Rohtang ridge", "Dramatic transition from lush green to stark snow peaks", "Spectacular Sissu waterfall and riverside cafes"],
      visitingDuration: "Full day excursion (4–6 hours)",
      timings: "Open 24/7 (subject to snow clearing in peak winter)",
      entryFee: "Free transit",
      seasonalAccess: "Open year-round",
      permitsRequired: null,
      insiderTips: "Maintain the 60 km/h speed limit inside the tunnel. Do not stop inside the tunnel under any circumstances.",
    },
    {
      id: "jogini-waterfall",
      name: "Jogini Waterfall",
      category: "nature",
      image: "/images/destinations/trekking.jpg",
      distance: "4.5 km from Manali (via Vashisht village)",
      description: "A series of cascading mountain waterfalls dropping over 150 feet through granite cliffs and pine woods, reached by an idyllic 45-minute walking trail through apple orchards.",
      highlights: ["Scenic trail starting from Vashisht temple", "Lower and upper natural pool viewpoints", "Quiet picnic spots away from road noise"],
      visitingDuration: "2.5 to 3.5 hours return hike",
      timings: "Sunrise to Sunset (best visited during daylight)",
      entryFee: "Free",
      seasonalAccess: "Best March to November; trail can be slippery in winter",
      permitsRequired: null,
      insiderTips: "Wear sturdy shoes with good tread. Stop by the upper falls viewpoint for dramatic photos of the valley.",
    },
    {
      id: "manu-temple",
      name: "Manu Temple",
      category: "temple",
      image: "/images/destinations/old-manali.jpg",
      distance: "3 km from Mall Road (highest point of Old Manali)",
      description: "The only temple in India dedicated to Sage Manu, who according to Hindu mythology stepped off his ark here to recreate human civilization after the great deluge, giving Manali ('Manu-alaya') its name.",
      highlights: ["Traditional stone and timber tiered temple architecture", "Panoramic views over Old Manali and cedar groves", "Historic religious significance"],
      visitingDuration: "45 mins to 1 hour",
      timings: "6:00 AM – 7:00 PM",
      entryFee: "Free",
      seasonalAccess: "Open year-round",
      permitsRequired: null,
      insiderTips: "The narrow lanes of Old Manali leading to the temple are best explored on foot or by local two-wheeler.",
    },
    {
      id: "vashisht-temple",
      name: "Vashisht Temple & Hot Springs",
      category: "temple",
      image: "/images/destinations/manali-hero.jpg",
      distance: "3.5 km across Beas River",
      description: "A 4,000-year-old temple complex dedicated to Sage Vashishta, famed for its natural geothermal sulphur springs channeled into public Turkish-style stone bath tanks.",
      highlights: ["Natural warm sulphur bath with therapeutic properties", "Intricately carved wooden temple pillars", "Panoramic village views"],
      visitingDuration: "1 to 2 hours",
      timings: "Temple: 7:00 AM – 9:00 PM; Baths: 7:00 AM – 1:00 PM & 2:00 PM – 9:00 PM",
      entryFee: "Free",
      seasonalAccess: "Open year-round",
      permitsRequired: null,
      insiderTips: "Carry a change of clothes and a small towel if planning to soak in the therapeutic hot springs.",
    },
    {
      id: "naggar-castle",
      name: "Naggar Castle",
      category: "heritage",
      image: "/images/unsplash/plan/about.jpg",
      distance: "21 km south of Manali",
      highlights: ["15th-century wood-and-stone Kath-Kuni fortress", "Earthquake-resistant Himalayan joinery without mortar", "Overlooks the entire Beas river valley"],
      description: "Built around 1460 CE by Raja Sidh Singh of Kullu, this historic castle blends European and Himalayan stone-timber architecture. It now houses a heritage hotel and open museum.",
      visitingDuration: "1.5 to 2 hours",
      timings: "9:00 AM – 6:00 PM",
      entryFee: "₹30 per person",
      seasonalAccess: "Open year-round",
      permitsRequired: null,
      insiderTips: "Have a hot cup of ginger-lemon-honey tea on the castle's wooden veranda overlooking the valley.",
    },
  ],

  areas: [
    {
      id: "mall-road",
      name: "Mall Road & Town Center",
      vibe: "Lively, pedestrianized, commercial hub",
      highlights: ["Pedestrian walking street with no vehicles allowed", "Himachal handloom emporiums and souvenir shops", "Local fruit wine shops, warm sweet bakeries, and ATMs"],
      foodAndShopping: "Kullu woolen shawls, pure wooden artifacts, steamed trout, momos, and traditional sweet bakeries.",
      accommodationType: "Budget hotels, mid-range family hotels, and transit lodges within walking distance of the central bus station.",
      bestFor: "Families, first-time travelers, shoppers, and travelers relying on public transit.",
      distanceToCenter: "0 km (Town center)",
    },
    {
      id: "old-manali",
      name: "Old Manali Village",
      vibe: "Bohemian, artistic, scenic, peaceful",
      highlights: ["Rustic Kath-Kuni wooden houses amidst apple orchards", "Vibrant live acoustic music scene in the evenings", "Direct walking trails to Manu Temple and riverside boulders"],
      foodAndShopping: "Wood-fired pizzas, Israeli shakshuka, fresh apple crumble, herbal teas, hemp backpacks, and silver jewelry.",
      accommodationType: "Boutique guesthouses, cozy wooden chalets, hostels, and remote-work friendly stays.",
      bestFor: "Backpackers, couples, remote workers, solo travelers, and food lovers.",
      distanceToCenter: "2.5 km northwest of Mall Road",
    },
    {
      id: "dhungri",
      name: "Dhungri & Log Huts Area",
      vibe: "Forest seclusion, upscale, tranquil",
      highlights: ["Encircled by virgin deodar (Himalayan cedar) forest", "Home to the historic Hadimba Devi Temple", "Quiet mountain morning walks away from traffic"],
      foodAndShopping: "Cozy artisanal cafes tucked under forest canopies and scenic garden dining.",
      accommodationType: "High-end luxury resorts, private wooden cottages, and boutique mountain villas.",
      bestFor: "Couples, luxury travelers, and anyone wanting peaceful forest silence.",
      distanceToCenter: "1.8 km west of Mall Road",
    },
    {
      id: "vashisht",
      name: "Vashisht Village",
      vibe: "Traditional, spiritual, hillside views",
      highlights: ["Natural geothermal hot springs", "Starting point of the Jogini Waterfall hike", "Panoramic vistas of Manali town across the gorge"],
      foodAndShopping: "Traditional village stalls, woolens, and relaxed rooftop cafes with valley views.",
      accommodationType: "Affordable backpacker homestays, yoga guesthouses, and scenic hillside lodges.",
      bestFor: "Budget travelers, wellness enthusiasts, hikers, and culture seekers.",
      distanceToCenter: "3.5 km northeast across the river",
    },
    {
      id: "aleo-naggar-road",
      name: "Aleo & Left Bank Highway",
      vibe: "Riverside resorts, spacious, relaxing",
      highlights: ["Unobstructed views of snow peaks and gushing Beas waters", "Direct road connectivity toward Naggar and Kullu", "Expansive garden properties with ample private parking"],
      foodAndShopping: "Upscale resort multi-cuisine restaurants, fresh river trout dining, and local organic fruit stalls.",
      accommodationType: "Riverside luxury resorts, riverside cottages, and family holiday villas.",
      bestFor: "Families with private vehicles, luxury travelers, and long-stay guests.",
      distanceToCenter: "2 to 5 km south along the left bank",
    },
  ] as AreaData[],

  thingsToDo: [
    {
      id: "river-rafting-beas",
      title: "River Rafting on the Gushing Beas",
      category: "Water Sports",
      image: "/images/destinations/rishikesh.jpg",
      location: "Pirdi to Jhiri (Kullu to Manali corridor)",
      bestSeason: "March to June & September to November",
      duration: "1 to 2 hours (7 km to 14 km stretch)",
      difficulty: "Beginner to Moderate (Grade II–III rapids)",
      safetyNote: "Ensure full safety brief, certified life jackets, and a licensed safety kayaker. Banned in monsoon.",
      description: "Navigate thrilling river waves fed by Himalayan glaciers, tumbling through scenic mountain gorges with pine slopes on either side.",
      bookingRequirement: "Book on-site at registered river camp counters in Pirdi/Babeli.",
    },
    {
      id: "solang-paragliding",
      title: "High-Altitude Paragliding at Solang Valley",
      category: "Air Sports",
      image: "/images/destinations/trekking.jpg",
      location: "Solang Valley launch ridges",
      bestSeason: "Oct–Nov & Mar–May",
      duration: "10–20 minutes tandem flight",
      difficulty: "Beginner friendly (Pilot steered)",
      safetyNote: "Never fly in gusty wind or rain. Confirm pilot credentials with Tourism Department tags.",
      description: "Launch into clear alpine air and glide high above Solang's pine bowl, gazing at the distant snow-capped peaks of the Pir Panjal range.",
      bookingRequirement: "Available at Solang Valley adventure counters.",
    },
    {
      id: "skiing-solang-sethan",
      title: "Skiing and Snowboarding Lessons",
      category: "Winter Snow Sports",
      image: "/images/destinations/solang-valley.jpg",
      location: "Solang Valley & Sethan Village",
      bestSeason: "Late December to February",
      duration: "1 hour taster to 3-day basic course",
      difficulty: "Beginner to Advanced slopes",
      safetyNote: "Wear thermal ski bibs, helmets, and UV-filtering snow goggles.",
      description: "Glide down powdery snow slopes with professional equipment and instructors from the Atal Bihari Vajpayee Institute of Mountaineering.",
      bookingRequirement: "Available in season through local ski instructors.",
    },
    {
      id: "old-manali-cafes",
      title: "Cafe Hopping & Acoustic Evenings in Old Manali",
      category: "Culture & Dining",
      image: "/images/destinations/old-manali.jpg",
      location: "Old Manali Village",
      bestSeason: "Year-round",
      duration: "2 to 4 hours",
      difficulty: "Easy / Leisure",
      safetyNote: "Carry a small torch/phone flashlight for walking back unlit village lanes at night.",
      description: "Enjoy thin-crust wood-fired pizzas, freshly brewed mountain coffee, and live acoustic music sessions in wooden rustic cafes by the forest.",
      bookingRequirement: "No booking needed; walk-ins welcome.",
    },
  ] as ExperienceData[],

  itineraries: [
    {
      id: "manali-3-days",
      title: "3 Days: The Classic Manali & Atal Tunnel Trip",
      duration: "3 Days / 2 Nights",
      daysCount: 3,
      route: "Town Heritage → Solang & Atal Tunnel (Sissu) → Vashisht & Jogini Falls",
      startEnd: "Starts in Manali / Ends in Manali",
      pace: "Moderate & scenic",
      overview: "Ideal for a long weekend trip covering Manali's cultural roots, high snow country, and refreshing waterfalls.",
      highlights: ["Hadimba Temple & deodar forest walk", "Atal Tunnel drive to Sissu Waterfall", "Solang ropeway ride", "Jogini Waterfall hike and Old Manali cafes"],
      days: [
        {
          day: 1,
          title: "Heritage, Old Manali & Mall Road",
          morning: "Start at Hadimba Devi Temple; stroll through the shaded Dhungri deodar sanctuary.",
          afternoon: "Cross the bridge to Old Manali; visit Manu Temple and enjoy lunch at a riverside cafe.",
          evening: "Sunset walk on the pedestrian Mall Road; browse Kullu shawls and Tibetan prayer wheels.",
          overnight: "Manali",
          travelTime: "Local town travel",
        },
        {
          day: 2,
          title: "Solang Valley & Atal Tunnel to Lahaul (Sissu)",
          morning: "Drive through Solang Valley; take the scenic cable car ropeway up to Mount Phatru.",
          afternoon: "Continue through the 9.02 km Atal Tunnel; visit Sissu waterfall and lakeside in Lahaul.",
          evening: "Return to Manali for hot soup and dinner at an Old Manali garden cafe.",
          overnight: "Manali",
          travelTime: "4–5 hours round-trip travel (80 km)",
        },
        {
          day: 3,
          title: "Vashisht Springs & Jogini Waterfall Hike",
          morning: "Visit the hot sulphur springs and ancient wood-carved Vashisht Temple.",
          afternoon: "Embark on the gentle 45-minute pine trail to Jogini Waterfall; picnic by the natural pools.",
          evening: "Pack bags and depart for onward destination by evening Volvo or private cab.",
          overnight: "Departure",
          travelTime: "Hiking day + Departure transfer",
        },
      ],
    },
    {
      id: "manali-5-days",
      title: "5 Days: The Complete Alpine & Naggar Valley Experience",
      duration: "5 Days / 4 Nights",
      daysCount: 5,
      route: "Manali Heritage → Solang & Atal Tunnel → Rohtang Pass → Naggar Heritage → Local Trails",
      startEnd: "Starts in Manali / Ends in Manali",
      pace: "Well-paced, covers all major circuits without rushing",
      overview: "A comprehensive 5-day holiday experiencing snow passes, adventure sports, ancient castles, and peaceful mountain villages.",
      highlights: ["Full day excursion to Rohtang Pass (3,978 m)", "Atal Tunnel and Lahaul Valley explorer", "Naggar Castle and Nicholas Roerich Gallery", "Vashisht hot baths & Jogini Waterfall"],
      days: [
        {
          day: 1,
          title: "Arrival & Village Immersion",
          morning: "Arrive in Manali, check in, and acclimatize with a cup of fresh rhododendron tea.",
          afternoon: "Visit Hadimba Devi Temple and the peaceful Tibetan Monastery in town.",
          evening: "Leisure stroll along Mall Road; dinner overlooking the Beas River.",
          overnight: "Manali",
          travelTime: "Local exploration",
        },
        {
          day: 2,
          title: "High Mountain Excursion: Rohtang Pass",
          morning: "Early departure (6:30 AM) with valid permit; wind up through Marhi to Rohtang Pass at 3,978m.",
          afternoon: "Enjoy snow photography, view glaciers, and savor hot Maggi at mountain shacks.",
          evening: "Return to Manali by afternoon; unwind in the evening at Old Manali cafes.",
          overnight: "Manali",
          travelTime: "6 hours return drive (102 km)",
        },
        {
          day: 3,
          title: "Solang Valley Adventures & Atal Tunnel",
          morning: "Head to Solang Valley for tandem paragliding and the cable car ride.",
          afternoon: "Drive through Atal Tunnel into Sissu; experience the dramatic contrast of Lahaul Valley.",
          evening: "Return to Manali for wood-fired pizza and acoustic music in Old Manali.",
          overnight: "Manali",
          travelTime: "4 hours drive (80 km)",
        },
        {
          day: 4,
          title: "Naggar Castle Heritage & Art Trail",
          morning: "Scenic drive along the left bank road to the 15th-century wood-and-stone Naggar Castle.",
          afternoon: "Visit Nicholas Roerich Art Gallery and the ancient Tripura Sundari wood temple.",
          evening: "Stop by local trout farms for fresh culinary tasting; return to Manali.",
          overnight: "Manali",
          travelTime: "2 hours drive (42 km return)",
        },
        {
          day: 5,
          title: "Vashisht Hot Springs, Jogini Falls & Departure",
          morning: "Therapeutic hot sulphur bath in Vashisht, followed by the picturesque Jogini Waterfall hike.",
          afternoon: "Last-minute souvenir shopping on Mall Road (Kullu shawls, apricot oil, dried apples).",
          evening: "Board evening Volvo bus to Delhi/Chandigarh.",
          overnight: "Departure",
          travelTime: "Departure journey",
        },
      ],
    },
  ] as ItineraryData[],

  guides: [
    {
      id: "delhi-to-manali",
      title: "Delhi to Manali by Road: Volvo Bus vs Self-Drive vs Cabs Compared",
      slug: "how-to-reach-manali-from-delhi",
      category: "Transport",
      readTime: "6 min read",
      summary: "Full breakdown of timings, bus operators (HPTDC vs HRTC Himgaurav), road tolls, and rest stops via the Kiratpur-Nerchowk expressway.",
      image: "/images/destinations/manali-hero.jpg",
    },
    {
      id: "rohtang-pass-permit-guide",
      title: "Rohtang Pass Green Permit: Official Rules, Online Booking Steps & Quotas",
      slug: "rohtang-pass-permit-guide",
      category: "Permits",
      readTime: "5 min read",
      summary: "How to successfully book the daily vehicle permit on the Kullu administration portal and key Tuesday closure rules.",
      image: "/images/destinations/rohtang-pass.jpg",
    },
    {
      id: "atal-tunnel-travel-guide",
      title: "Atal Tunnel to Sissu Day Trip: What to See, Winter Tips & Driving Rules",
      slug: "atal-tunnel-travel-guide",
      category: "Sightseeing",
      readTime: "5 min read",
      summary: "Everything you need to know about navigating the 9.02 km tunnel into Lahaul Valley, Sissu waterfall, and dining stops.",
      image: "/images/destinations/solang-valley.jpg",
    },
    {
      id: "where-to-stay-manali",
      title: "Where to Stay in Manali: Mall Road vs Old Manali vs Dhungri vs Vashisht",
      slug: "where-to-stay-in-manali",
      category: "Accommodation",
      readTime: "7 min read",
      summary: "Detailed neighborhood breakdown for couples, families, backpackers, and travelers with private vehicles.",
      image: "/images/unsplash/plan/stay.jpg",
    },
  ] as GuideCardData[],

  foodAndShopping: {
    dishes: [
      { name: "Siddu with Ghee", description: "Steamed wheat yeast bread stuffed with spiced crushed walnuts, poppy seeds, or lentils, served dripping in pure hot desi ghee." },
      { name: "Himachali Trout Fish", description: "Fresh river trout from the clean waters of the Beas, pan-fried with mild Himalayan mountain herbs and lemon butter." },
      { name: "Chana Madra", description: "A festive delicacy of chickpeas simmered slowly in rich yogurt gravy, spiced with cardamom, cloves, and asafoetida." },
      { name: "Babru", description: "Himachali version of kachori — flatbread rolled with soaked black gram paste and deep fried until golden." },
      { name: "Kullu Apple Crumble", description: "Warm baked tart made with locally harvested sweet Kullu apples, dusted with cinnamon and served with vanilla ice cream." },
    ],
    cafes: [
      "Cafe 1947 (Old Manali) — Italian wood-fired pizza right next to the rushing river stream",
      "Drifters' Cafe (Old Manali) — Legendary breakfast, warm waffles, acoustic music, and travel library",
      "The Lazy Dog (Old Manali) — Riverside deck seating, grilled trout, and craft mocktails",
      "Renaissance (Old Manali) — Mexican & Italian comfort food in a cozy candlelit setting",
      "Johnson's Cafe (Near Circuit House) — Classic British-style mountain cafe famed for wood-fired trout",
    ],
    shopping: [
      { item: "Authentic Kullu Shawls", tip: "Look for the certified Handloom Woolmark tag to avoid cheap powerloom acrylic copies." },
      { item: "Pure Cold-Pressed Apricot Oil", tip: "Natural moisturizer and cooking oil pressed from local wild chulli (apricot) kernels." },
      { item: "Organic Himachali Honey & Apple Jam", tip: "Available directly from local fruit cooperatives and government outlets on Mall Road." },
      { item: "Tibetan Handicrafts & Singing Bowls", tip: "Browse the authentic Tibetan market street parallel to Mall Road for singing bowls and prayer flags." },
    ],
  },

  practicalPlan: {
    seasons: [
      { name: "Summer (March to June)", temp: "10°C to 25°C", advice: "Pleasant days, blooming apple flowers, ideal for sightseeing, paragliding, and escaping the plains heat." },
      { name: "Monsoon (July to August)", temp: "15°C to 22°C", advice: "Heavy rainfall in lower valleys, risks of landslides on NH-21. Avoid water sports. Lahaul beyond Atal Tunnel is relatively dry." },
      { name: "Autumn (September to November)", temp: "5°C to 18°C", advice: "Crystal clear skies, crisp mountain air, golden apple harvest foliage, best time for photography and high trekking." },
      { name: "Winter (December to February)", temp: "-5°C to 12°C", advice: "Heavy snowfall in Solang, Gulaba, and Sethan. Peak season for skiing, snow play, and cozy fireplace chalets." },
    ],
    gettingThere: {
      byAir: "Kullu–Manali Airport (Bhuntar) is 50 km south. Taxis take about 1.5–2 hours to reach Manali (union rate ~₹2,200–₹2,600).",
      byTrain: "Nearest broad gauge railheads are Chandigarh (280 km) and Kalka (270 km). Continue by private taxi or Volvo bus.",
      byRoad: "Overnight Volvo buses from Delhi (ISBT Kashmiri Gate) take 11–13 hours via the new Kiratpur-Nerchowk 4-lane expressway. Private cabs take around 9–10 hours.",
    },
    localTransport: {
      options: "Registered local taxi union rate card applies for sight-seeing tours (Solang, Rohtang, Naggar). Auto-rickshaws available for town hops (₹100–₹200). Scooters and Royal Enfield bikes can be rented on daily rates (₹800–₹1,800/day + fuel).",
    },
    budgetBreakdown: [
      { tier: "Budget Backpacker", dailyCost: "₹1,500 – ₹2,200", details: "Hostel dorm bed (₹500–₹900), local street food & dhabas, local buses and walking, shared transfers." },
      { tier: "Mid-Range Comfort", dailyCost: "₹3,500 – ₹5,500", details: "Cozy 3-star mountain hotel or boutique chalet (₹2,500–₹4,000), cafe meals & trout dinners, private cabs for day trips." },
      { tier: "Luxury Mountain Holiday", dailyCost: "₹8,000 – ₹18,000+", details: "5-star luxury cedar resort or private villa (₹7,000–₹16,000+), private SUV with driver, guided private tours." },
    ],
    importantTips: [
      "Altitude Adaptation: Manali sits at 2,050m. Allow 24 hours of relaxed activity before heading to 3,978m at Rohtang Pass.",
      "Green Permits: Do not drive towards Rohtang Pass without an approved online permit. Commercial vehicle operators have their own permits.",
      "Plastic-Free Hill Rule: Single-use plastic bottles are discouraged. Carry a reusable stainless steel water bottle and refill at mountain cafes.",
      "Cash is King in Higher Valleys: ATMs in Old Manali and Sissu can run out of cash during high tourist weekends. Carry ₹5,000–₹10,000 cash.",
    ],
  },

  faqs: [
    {
      question: "How many days are enough for a trip to Manali?",
      answer: "3 to 4 days is the sweet spot. This allows 1 full day for town heritage and Old Manali, 1 day for Solang Valley and the Atal Tunnel (Sissu), and 1 day for Rohtang Pass or Naggar Castle without rushing.",
    },
    {
      question: "Which is the best month to visit Manali for snowfall?",
      answer: "The best months for fresh snowfall are January and February. Snow can often be found as early as late December and persists on higher slopes (Solang Valley and Gulaba) well into late March.",
    },
    {
      question: "How do I get a permit for Rohtang Pass?",
      answer: "Rohtang Pass permits must be booked online through the official Himachal Pradesh tourism portal (rohtangpermits.nic.in). Daily quotas open in two time-slots (typically 10:00 AM and 4:00 PM). During peak summer, permits sell out within minutes, so book 4–6 days in advance.",
    },
    {
      question: "Do I need a permit to visit Atal Tunnel and Sissu?",
      answer: "No, travelers do NOT need a permit to drive through the Atal Tunnel into Sissu or Lahaul Valley. Only traveling up to Rohtang Pass requires the Green Permit.",
    },
    {
      question: "Is Manali safe for families with young children and elderly travelers?",
      answer: "Yes, Manali has well-developed tourist infrastructure, medical centers, family resorts, and easily accessible attractions like Hadimba Temple, Mall Road, and the Atal Tunnel. Take care with warm clothing during winter and avoid strenuous uphill hiking.",
    },
    {
      question: "How is the road condition between Delhi and Manali?",
      answer: "The road connectivity has improved drastically with the completion of the Kiratpur-Nerchowk 4-lane expressway and multiple tunnels bypassing steep switchbacks. Travel time from Delhi has decreased from 14 hours to 10–12 hours under normal weather conditions.",
    },
  ] as FAQItem[],
};

