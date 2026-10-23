/**
 * SAMPLE destination pages, for design work only (see `sampleContentEnabled`).
 *
 * They exist so every state and destination the homepage and Explore India
 * page link to opens a real-looking page instead of a 404. A published guide in
 * the database always wins over a sample page. Sample pages carry a visible
 * "Sample content" notice and are not indexed by search engines.
 *
 * The text sticks to widely documented facts — no prices, timetables or
 * opening hours — but it has NOT been through VacayOut's research and review.
 */
import type { PublishedSnapshot, SnapshotImage } from "@/lib/db/schema";
import { INDIA_REGIONS, matchRegion, zoneOf } from "@/lib/places/states";

type Img = { src: string; alt: string; ai?: boolean };

const image = (i: Img | null): SnapshotImage | null =>
  i
    ? {
        url: i.src,
        alt: i.alt,
        caption: null,
        kind: i.ai ? "ai_generated" : "photo",
        license: i.ai ? "AI-generated illustration" : "Sample image — confirm licence before launch",
        licenseUrl: null,
        attribution: null,
        sourceUrl: null,
      }
    : null;

// ---------------------------------------------------------------- states

type SampleState = { name: string; slug: string; img: Img | null };

/** Every state and UT the Explore India page links to, with an image only where it really shows that state. */
export const SAMPLE_STATES: SampleState[] = [
  { name: "Jammu & Kashmir", slug: "jammu-kashmir", img: null },
  { name: "Himachal Pradesh", slug: "himachal-pradesh", img: { src: "/images/unsplash/manali.jpg", alt: "Snow-covered mountains above Manali, Himachal Pradesh" } },
  { name: "Uttarakhand", slug: "uttarakhand", img: { src: "/images/destinations/rishikesh.jpg", alt: "Rishikesh on the Ganga, Uttarakhand" } },
  { name: "Punjab", slug: "punjab", img: { src: "/images/states/punjab.jpg", alt: "Punjab" } },
  { name: "Rajasthan", slug: "rajasthan", img: { src: "/images/unsplash/jaipur.jpg", alt: "Hawa Mahal in Jaipur, Rajasthan" } },
  { name: "Uttar Pradesh", slug: "uttar-pradesh", img: { src: "/images/unsplash/varanasi.jpg", alt: "Boats beside the ghats of Varanasi, Uttar Pradesh" } },
  { name: "Bihar", slug: "bihar", img: { src: "/images/states/bihar.jpg", alt: "Bihar" } },
  { name: "Jharkhand", slug: "jharkhand", img: { src: "/images/states/jharkhand.jpg", alt: "Jharkhand" } },
  { name: "West Bengal", slug: "west-bengal", img: { src: "/images/states/west-bengal.jpg", alt: "West Bengal" } },
  { name: "Sikkim", slug: "sikkim", img: { src: "/images/states/sikkim.jpg", alt: "Sikkim" } },
  { name: "Assam", slug: "assam", img: { src: "/images/states/assam.jpg", alt: "Assam" } },
  { name: "Meghalaya", slug: "meghalaya", img: { src: "/images/unsplash/meghalaya.jpg", alt: "Waterfalls in a green valley in Meghalaya" } },
  { name: "Manipur", slug: "manipur", img: { src: "/images/states/manipur.jpg", alt: "Manipur" } },
  { name: "Nagaland", slug: "nagaland", img: { src: "/images/states/nagaland.jpg", alt: "Nagaland" } },
  { name: "Tripura", slug: "tripura", img: { src: "/images/states/tripura.jpg", alt: "Tripura" } },
  { name: "Mizoram", slug: "mizoram", img: { src: "/images/states/mizoram.jpg", alt: "Mizoram" } },
  { name: "Andhra Pradesh", slug: "andhra-pradesh", img: { src: "/images/states/andhra-pradesh.jpg", alt: "Andhra Pradesh" } },
  { name: "Karnataka", slug: "karnataka", img: { src: "/images/unsplash/trip-heritage.jpg", alt: "The stone chariot at Hampi, Karnataka" } },
  { name: "Kerala", slug: "kerala", img: { src: "/images/unsplash/kerala.jpg", alt: "A houseboat on the Kerala backwaters" } },
  { name: "Tamil Nadu", slug: "tamil-nadu", img: { src: "/images/states/tamil-nadu.jpg", alt: "Tamil Nadu" } },
  { name: "Goa", slug: "goa", img: { src: "/images/unsplash/trip-weekend.jpg", alt: "Palm trees above a beach in Goa" } },
  { name: "Gujarat", slug: "gujarat", img: null },
  { name: "Maharashtra", slug: "maharashtra", img: null },
  { name: "Madhya Pradesh", slug: "madhya-pradesh", img: null },
  { name: "Chhattisgarh", slug: "chhattisgarh", img: null },
  { name: "Odisha", slug: "odisha", img: null },
  { name: "Telangana", slug: "telangana", img: null },
  { name: "Haryana", slug: "haryana", img: null },
  { name: "Delhi", slug: "delhi", img: null },
  { name: "Ladakh", slug: "ladakh", img: { src: "/images/destinations/ladakh.jpg", alt: "Mountains and desert landscape in Ladakh" } },
  { name: "Arunachal Pradesh", slug: "arunachal-pradesh", img: null },
  { name: "Andaman & Nicobar Islands", slug: "andaman-nicobar", img: { src: "/images/destinations/andaman.jpg", alt: "A beach in the Andaman Islands" } },
  { name: "Chandigarh", slug: "chandigarh", img: null },
  { name: "Puducherry", slug: "puducherry", img: null },
  { name: "Lakshadweep", slug: "lakshadweep", img: null },
  { name: "Dadra & Nagar Haveli and Daman & Diu", slug: "daman-diu", img: null },
];

// ---------------------------------------------------------------- places

type SamplePlace = {
  slug: string;
  stateSlug: string;
  name: string;
  kind: "city" | "town" | "region";
  summary: string;
  lat: number;
  lng: number;
  img: Img | null;
  tripTypes: string[];
  overview: string[];
  highlights: string[];
  things: string[];
  best: string;
  reach: string;
  local: string;
  tips: string[];
  days: [string, string][];
  faqs: [string, string][];
};

export const SAMPLE_PLACES: SamplePlace[] = [
  {
    slug: "manali", stateSlug: "himachal-pradesh", name: "Manali", kind: "town", lat: 32.2432, lng: 77.1892,
    summary: "A mountain town at the head of the Kullu valley, and a base for Solang Valley and high-mountain road trips.",
    img: { src: "/images/unsplash/manali.jpg", alt: "Snow-covered mountains above Manali" },
    tripTypes: ["mountains", "adventure", "family"],
    overview: [
      "Manali sits beside the Beas river at the northern end of the Kullu valley, ringed by deodar forest and high peaks. It's one of Himachal Pradesh's busiest hill towns, and the usual starting point for Solang Valley, the Atal Tunnel and Lahaul.",
      "The town has two moods: busy Mall Road with its hotels and shops, and quieter Old Manali up the hill, with guesthouses and cafés.",
    ],
    highlights: ["Hadimba Devi Temple, a wooden temple in a cedar grove", "The lanes and cafés of Old Manali", "Vashisht village and its hot-spring baths", "Solang Valley for snow and adventure activities"],
    things: ["Walk through the cedar forest to Hadimba Devi Temple", "Spend a slow afternoon in Old Manali", "Bathe at the Vashisht hot springs", "Take a day trip to Solang Valley", "Drive through the Atal Tunnel to Sissu in Lahaul when the road is open"],
    best: "March to June is pleasant for sightseeing. December to February brings snow and cold, and some high roads close. July and August are monsoon months, with a real risk of landslides on mountain roads.",
    reach: "The nearest airport is at Bhuntar, near Kullu. Most travellers arrive by road — overnight buses run from Delhi and Chandigarh. The nearest broad-gauge railway stations are in the plains, so the last stretch is always by road.",
    local: "Local taxis and auto-rickshaws cover the town. Hire a taxi for Solang, the Atal Tunnel or Rohtang; vehicles need a permit for Rohtang Pass.",
    tips: ["Carry warm layers, even in summer", "Check road status before crossing high passes", "Book ahead for summer holidays and Christmas–New Year", "Carry some cash for smaller villages"],
    days: [["Mall Road and Hadimba Temple", "Settle in, walk to Hadimba Devi Temple through the cedar forest, and spend the evening on Mall Road."], ["Old Manali and Vashisht", "Explore Old Manali's lanes, then cross to Vashisht for the hot springs."], ["Solang Valley", "Spend the day in Solang Valley — snow in winter, meadows and adventure activities in summer."]],
    faqs: [["Is Manali good in winter?", "Yes, if you want snow — but it's cold, and some roads beyond town close. Pack accordingly."], ["How many days do I need?", "Three days covers the town and Solang. Add more for Lahaul, Kasol or Spiti."], ["Do I need a permit for Rohtang Pass?", "Vehicles going to Rohtang need a permit. Check the current rules before you plan the day."]],
  },
  {
    slug: "spiti", stateSlug: "himachal-pradesh", name: "Spiti Valley", kind: "region", lat: 32.2276, lng: 78.071,
    summary: "A high, dry valley in Himachal Pradesh with old monasteries and remote villages.",
    img: { src: "/images/destinations/spiti.jpg", alt: "The landscape of Spiti Valley" },
    tripTypes: ["mountains", "adventure"],
    overview: [
      "Spiti is a cold-desert valley between Lahaul and Kinnaur, close to the border with Tibet. Kaza is its main town.",
      "Monasteries like Key and Tabo, and high villages such as Kibber, Langza and Komic, make it a favourite for slow road trips.",
    ],
    highlights: ["Key Monastery above the Spiti river", "Tabo Monastery, founded more than a thousand years ago", "The high villages of Langza, Hikkim and Komic", "Chandratal lake on the Lahaul side"],
    things: ["Visit Key Monastery", "Stay in a village homestay", "Send a postcard from the post office at Hikkim", "Stargaze on a clear night"],
    best: "June to September, when both road routes are usually open. The route through Kinnaur stays open longer than the one over Kunzum Pass. Winters are extremely cold.",
    reach: "By road from Manali over Kunzum Pass (open in the warmer months), or from Shimla through Kinnaur. The nearest airport is at Bhuntar.",
    local: "Hire a taxi or drive yourself; public buses are few and infrequent.",
    tips: ["Give yourself time to acclimatise to the altitude", "Carry cash — ATMs are few", "Fill up with fuel whenever you can"],
    days: [["Arrive in Kaza", "Take it easy and let your body adjust to the altitude."], ["Key and Kibber", "Visit Key Monastery in the morning and drive up to Kibber."], ["Langza, Hikkim and Komic", "Loop through the high villages and their fossil-strewn slopes."]],
    faqs: [["Which route should I take?", "The Shimla–Kinnaur route climbs more gradually and helps you acclimatise. The Manali route is shorter but gains height quickly."]],
  },
  {
    slug: "north-goa", stateSlug: "goa", name: "North Goa", kind: "region", lat: 15.5439, lng: 73.7553,
    summary: "Beaches, river estuaries and lively villages along Goa's northern coast.",
    img: { src: "/images/unsplash/trip-weekend.jpg", alt: "Palm trees above a beach in Goa" },
    tripTypes: ["beaches", "weekend", "romantic"],
    overview: [
      "North Goa runs from the Mandovi river up to the Maharashtra border. Its coast is lined with beaches, from busy Calangute and Baga to quieter Morjim, Ashwem and Arambol further north.",
      "Inland are the Portuguese-era churches of Old Goa, spice farms, and Fontainhas, the old Latin Quarter of Panaji.",
    ],
    highlights: ["Beaches from Calangute to Arambol", "Fort Aguada overlooking the Mandovi estuary", "The churches of Old Goa, a UNESCO World Heritage Site", "Fontainhas, Panaji's old Latin Quarter"],
    things: ["Spend a lazy day at a quieter northern beach", "Watch the sunset from Chapora Fort", "Walk the colourful lanes of Fontainhas", "Visit the Basilica of Bom Jesus in Old Goa", "Browse a weekly flea or night market"],
    best: "November to February is the most popular time, with dry, sunny weather. March to May is hot and humid. June to September is monsoon — green and quiet, but many beach shacks close and the sea is rough.",
    reach: "Goa has two airports: Dabolim, and Manohar International at Mopa, which is closer to North Goa. Thivim and Karmali stations are on the Konkan Railway.",
    local: "Most visitors rent a scooter or hire a taxi. Buses link the main towns. Agree taxi fares before you set off.",
    tips: ["Swim only where lifeguards are on duty, and stay out of the sea in the monsoon", "Carry your licence and wear a helmet if you rent a two-wheeler", "Dress modestly when visiting churches and temples"],
    days: [["Beaches and Fort Aguada", "Start at Fort Aguada, then work north along the beaches."], ["Old Goa and Fontainhas", "See the churches of Old Goa, then walk Fontainhas in Panaji."], ["The northern beaches", "Head up to Morjim or Arambol and finish at Chapora Fort for sunset."]],
    faqs: [["North or South Goa?", "North Goa is livelier, with more cafés and nightlife. South Goa is quieter, with emptier beaches."], ["Is Goa worth visiting in the monsoon?", "It's green and peaceful, but many beach businesses close and swimming isn't safe."]],
  },
  {
    slug: "jaipur", stateSlug: "rajasthan", name: "Jaipur", kind: "city", lat: 26.9124, lng: 75.7873,
    summary: "Rajasthan's capital: Amber Fort, the Hawa Mahal and busy old-city bazaars.",
    img: { src: "/images/unsplash/jaipur.jpg", alt: "Hawa Mahal in Jaipur" },
    tripTypes: ["heritage", "family", "weekend"],
    overview: [
      "Jaipur, the capital of Rajasthan, was founded in 1727 by Maharaja Sawai Jai Singh II. Its walled old city — the Pink City — is a UNESCO World Heritage Site.",
      "With Delhi and Agra it forms the 'Golden Triangle', and it's a good first taste of Rajasthan's forts, palaces and crafts.",
    ],
    highlights: ["Amber Fort on its hill above Maota Lake", "The honeycomb facade of the Hawa Mahal", "City Palace and Jantar Mantar in the old city", "Bazaars for textiles, block prints and jewellery"],
    things: ["Explore Amber Fort early in the day", "See the astronomical instruments of Jantar Mantar", "Visit the City Palace museum", "Shop in Johari and Bapu Bazaar", "Watch the sunset from Nahargarh Fort"],
    best: "October to March is best, with warm days and cool nights. April to June is very hot. July to September brings some rain.",
    reach: "Jaipur International Airport has flights from across India. Jaipur Junction is a major railway station, and the city is well connected by highway.",
    local: "Auto-rickshaws, taxis and app cabs are easy to find, and Jaipur has a metro line.",
    tips: ["Start sightseeing early to avoid the midday heat", "Agree auto fares before you ride, or use app cabs", "A composite ticket covers several monuments — check what's included"],
    days: [["Amber Fort and Nahargarh", "Amber Fort in the morning; Nahargarh Fort for sunset."], ["The old city", "City Palace, Jantar Mantar and the Hawa Mahal."], ["Bazaars and museums", "Shop the old-city bazaars and visit the Albert Hall Museum."]],
    faqs: [["Why is Jaipur called the Pink City?", "Its old-city buildings were painted pink — a colour associated with hospitality — in the 19th century."], ["How many days do I need?", "Two to three days covers the main sights."]],
  },
  {
    slug: "udaipur", stateSlug: "rajasthan", name: "Udaipur", kind: "city", lat: 24.5854, lng: 73.7125,
    summary: "The city of lakes, known for the City Palace and boat rides on Lake Pichola.",
    img: { src: "/images/unsplash/udaipur.jpg", alt: "A boat on Lake Pichola below the City Palace, Udaipur" },
    tripTypes: ["heritage", "romantic", "family"],
    overview: [
      "Udaipur was the capital of the Mewar kingdom, founded in the 16th century by Maharana Udai Singh II. Its palaces and havelis sit around a chain of artificial lakes, the best known being Lake Pichola.",
      "The old city is compact and walkable, with lanes leading down to ghats on the water.",
    ],
    highlights: ["The City Palace above Lake Pichola", "Boat rides to Jag Mandir", "Jagdish Temple in the old city", "Sunset from Sajjangarh, the Monsoon Palace"],
    things: ["Tour the City Palace", "Take a boat on Lake Pichola", "Walk the old-city lanes to Jagdish Temple", "Visit the Saheliyon-ki-Bari gardens", "Watch the sunset from Sajjangarh"],
    best: "October to March is pleasant. Summers are hot. After a good monsoon the lakes are full and the hills are green.",
    reach: "Maharana Pratap Airport is outside the city. Udaipur City railway station has trains from Delhi, Jaipur and Mumbai.",
    local: "Auto-rickshaws and taxis; the old city is best explored on foot.",
    tips: ["Book lake-view rooms early in peak season", "Check boat timings before you go", "Dress modestly at temples"],
    days: [["City Palace and Lake Pichola", "Tour the City Palace, then take a boat out on the lake."], ["Old-city lanes", "Walk to Jagdish Temple and the ghats."], ["Gardens and sunset", "Saheliyon-ki-Bari in the morning, Sajjangarh at sunset."]],
    faqs: [["How many days do I need?", "Two to three days is enough for the main sights."]],
  },
  {
    slug: "alappuzha", stateSlug: "kerala", name: "Alappuzha", kind: "town", lat: 9.4981, lng: 76.3388,
    summary: "Backwater canals and paddy fields, best seen slowly from a houseboat.",
    img: { src: "/images/unsplash/kerala.jpg", alt: "A houseboat on palm-lined backwaters in Kerala" },
    tripTypes: ["nature", "romantic", "family"],
    overview: [
      "Alappuzha (Alleppey) sits between the Arabian Sea and the Kerala backwaters — a network of lagoons, lakes and canals. It's the most popular place to board a kettuvallam, or houseboat, for a night on the water.",
      "Around it lies Kuttanad, where paddy is farmed on land below sea level.",
    ],
    highlights: ["Overnight houseboat cruises", "Vembanad Lake, the largest lake in Kerala", "The paddy fields of Kuttanad", "Alappuzha and Marari beaches"],
    things: ["Spend a night on a houseboat", "Take a small canoe through narrow village canals", "Watch the snake-boat races if you're here in August", "Relax at Marari beach"],
    best: "November to February is the most comfortable. The monsoon (June to September) is lush and quiet. The Nehru Trophy Boat Race is held on Punnamada Lake in August.",
    reach: "The nearest airport is Kochi. Alappuzha has a railway station, and buses run from Kochi and Thiruvananthapuram.",
    local: "Auto-rickshaws cover the town. Public ferries on the backwaters are a cheap way to see them.",
    tips: ["Check what's included before you book a houseboat", "Carry mosquito repellent", "Choose licensed houseboat operators"],
    days: [["Board a houseboat", "Cruise the backwaters and spend the night on the water."], ["Village canals", "Explore narrow canals by canoe."], ["Marari beach", "Unwind on the beach before you leave."]],
    faqs: [["Day cruise or overnight?", "An overnight stay is the full experience; a day cruise gives you a taste."]],
  },
  {
    slug: "rishikesh", stateSlug: "uttarakhand", name: "Rishikesh", kind: "town", lat: 30.0869, lng: 78.2676,
    summary: "A riverside town on the Ganga at the foot of the Himalaya, known for yoga, temples and river rafting.",
    img: { src: "/images/destinations/rishikesh.jpg", alt: "Rishikesh on the Ganga" },
    tripTypes: ["spiritual", "adventure", "weekend"],
    overview: [
      "Rishikesh lies where the Ganga leaves the hills for the plains. It's an important Hindu pilgrimage town, often called the yoga capital of the world, with ashrams along both banks.",
      "It's also a base for white-water rafting, riverside camping and treks into the Garhwal Himalaya.",
    ],
    highlights: ["The evening Ganga aarti", "Suspension bridges across the river, such as Ram Jhula", "Yoga and meditation classes", "Rafting on the Ganga"],
    things: ["Attend the evening aarti by the river", "Join a yoga class", "Raft a stretch of the Ganga in season", "Visit the Beatles Ashram (Chaurasi Kutia)"],
    best: "September to November and February to May are best. Rafting usually pauses in the monsoon.",
    reach: "The nearest airport is Jolly Grant, near Dehradun. Haridwar is the main railhead nearby, and buses run from Delhi.",
    local: "Shared autos and taxis; many riverside spots are easiest on foot.",
    tips: ["The town is largely vegetarian and alcohol-free", "Raft only with licensed operators", "Follow ashram rules and dress modestly"],
    days: [["Riverside and aarti", "Walk along the river and attend the evening aarti."], ["Yoga and the Beatles Ashram", "Morning yoga, then the Beatles Ashram."], ["On the river", "Rafting in season, or a riverside walk."]],
    faqs: [["Can I go rafting all year?", "Rafting usually runs from autumn to spring and pauses during the monsoon. Check with operators."]],
  },
  {
    slug: "srinagar", stateSlug: "jammu-kashmir", name: "Srinagar", kind: "city", lat: 34.0837, lng: 74.7973,
    summary: "Kashmir's summer capital, with houseboats and shikaras on Dal Lake and Mughal gardens on its shores.",
    img: null,
    tripTypes: ["romantic", "nature", "family"],
    overview: [
      "Srinagar is the summer capital of Jammu and Kashmir, set around Dal Lake in the Kashmir Valley.",
      "It's the usual base for trips to Gulmarg, Pahalgam and Sonamarg.",
    ],
    highlights: ["Shikara rides on Dal Lake", "A night on a houseboat", "Mughal gardens such as Shalimar Bagh and Nishat Bagh", "The old city and Jamia Masjid"],
    things: ["Ride a shikara at sunrise to the floating vegetable market", "Walk through the Mughal gardens", "Take a day trip to Gulmarg or Sonamarg", "See the tulip garden in spring"],
    best: "April to October for gardens and mild weather; the tulip garden blooms around April. December to February is cold, with snow in Gulmarg.",
    reach: "Srinagar has an airport with flights from major cities. By road, it's reached from Jammu along the national highway.",
    local: "Taxis for sightseeing; shikaras on the lake.",
    tips: ["Check current travel advisories before you go", "Prepaid SIM cards from other states may not work in Jammu and Kashmir", "Carry ID"],
    days: [["Dal Lake", "Shikara ride and a night on a houseboat."], ["Mughal gardens", "Shalimar Bagh, Nishat Bagh and the old city."], ["Gulmarg day trip", "Meadows in summer, snow in winter."]],
    faqs: [["When can I see snow?", "December to February, especially in Gulmarg."]],
  },
  {
    slug: "leh", stateSlug: "ladakh", name: "Leh", kind: "town", lat: 34.1526, lng: 77.5771,
    summary: "The main town of Ladakh, a high-altitude desert of monasteries, mountain passes and lakes.",
    img: { src: "/images/destinations/ladakh.jpg", alt: "Mountains and desert landscape in Ladakh" },
    tripTypes: ["mountains", "adventure"],
    overview: [
      "Leh sits at around 3,500 m in the Indus valley. It's the base for most of Ladakh: monasteries like Thiksey and Hemis, Nubra Valley and Pangong Tso.",
      "Because of the altitude, plan an easy first day or two to acclimatise before going higher.",
    ],
    highlights: ["Leh Palace and Shanti Stupa", "Thiksey and Hemis monasteries", "Nubra Valley over Khardung La", "Pangong Tso"],
    things: ["Rest and acclimatise on your first day", "Watch the sunset from Shanti Stupa", "Visit monasteries in the Indus valley", "Take an overnight trip to Nubra or Pangong"],
    best: "May to September, when the high passes are open. Winters are severe, though flights still operate.",
    reach: "Leh's airport has flights from Delhi and other cities. By road, Leh is reached from Manali or Srinagar when the highways are open, usually in the warmer months.",
    local: "Hire a local taxi or rent a motorbike for longer trips.",
    tips: ["Acclimatise before going higher", "Drink plenty of water and avoid alcohol for the first days", "Some areas need permits or registration — check current rules"],
    days: [["Acclimatise in Leh", "Rest, then an easy walk to Shanti Stupa."], ["Indus valley monasteries", "Thiksey and Hemis."], ["Nubra Valley", "Cross Khardung La to Nubra."]],
    faqs: [["Do I really need to acclimatise?", "Yes. Plan an easy first day or two in Leh before going higher."]],
  },
  {
    slug: "havelock", stateSlug: "andaman-nicobar", name: "Havelock Island (Swaraj Dweep)", kind: "town", lat: 11.9761, lng: 92.9876,
    summary: "An Andaman island known for white-sand beaches and clear water for snorkelling and diving.",
    img: { src: "/images/destinations/andaman.jpg", alt: "A beach in the Andaman Islands" },
    tripTypes: ["beaches", "romantic", "nature"],
    overview: [
      "Havelock Island, renamed Swaraj Dweep in 2018, is the most visited island in the Andaman group. Ferries connect it with Port Blair and Neil Island (Shaheed Dweep).",
      "Radhanagar Beach is its best-known beach, and the reefs around the island are popular for snorkelling and diving.",
    ],
    highlights: ["Radhanagar Beach", "Snorkelling at Elephant Beach", "Kalapathar Beach at sunrise", "Scuba diving for beginners and experienced divers"],
    things: ["Spend an afternoon at Radhanagar Beach", "Snorkel at Elephant Beach", "Try a beginner scuba dive", "Watch sunrise at Kalapathar"],
    best: "October to May. The monsoon brings rough seas and ferry disruptions.",
    reach: "Fly to Port Blair, then take a ferry to Havelock.",
    local: "Rent a scooter or hire an auto or taxi.",
    tips: ["Book ferries ahead in season", "Carry enough cash", "Use reef-safe sunscreen and don't touch coral"],
    days: [["Arrive and Radhanagar", "Ferry from Port Blair, then sunset at Radhanagar."], ["Under the water", "Snorkelling or a beginner dive."], ["Kalapathar", "Sunrise at Kalapathar before the ferry back."]],
    faqs: [["Do I need a permit?", "Rules differ for some islands and for foreign nationals. Check the current requirements before you travel."]],
  },
  {
    slug: "darjeeling", stateSlug: "west-bengal", name: "Darjeeling", kind: "town", lat: 27.041, lng: 88.2663,
    summary: "A hill town in West Bengal known for tea gardens, the toy train and views of Kanchenjunga.",
    img: { src: "/images/destinations/darjeeling.jpg", alt: "Darjeeling" },
    tripTypes: ["mountains", "family", "romantic"],
    overview: [
      "Darjeeling sits on a ridge at about 2,000 m in the eastern Himalaya, surrounded by tea estates. On clear days, Kanchenjunga, the world's third-highest mountain, fills the northern skyline.",
      "The Darjeeling Himalayan Railway — the 'toy train' — is a UNESCO World Heritage Site.",
    ],
    highlights: ["Sunrise over Kanchenjunga from Tiger Hill", "A ride on the toy train", "Tea estate visits", "The Mall and Chowrasta"],
    things: ["Catch sunrise at Tiger Hill", "Ride the toy train", "Tour a tea estate", "Visit the Himalayan Mountaineering Institute"],
    best: "March to May and October to November for clear mountain views. The monsoon is wet and cloudy.",
    reach: "The nearest airport is Bagdogra and the nearest major railway station is New Jalpaiguri. Shared jeeps and taxis go up to Darjeeling.",
    local: "The town centre is walkable; taxis for sights further out.",
    tips: ["Leave very early for Tiger Hill", "Pack layers", "Book toy-train rides ahead"],
    days: [["Tiger Hill and the town", "Sunrise at Tiger Hill, then the Mall."], ["Toy train and tea", "A toy-train ride and a tea-estate visit."]],
    faqs: [["When is Kanchenjunga visible?", "On clear days, mostly from October to November and in spring."]],
  },
  {
    slug: "varanasi", stateSlug: "uttar-pradesh", name: "Varanasi", kind: "city", lat: 25.3176, lng: 82.9739,
    summary: "One of the oldest living cities in the world, with ghats stepping down to the Ganga.",
    img: { src: "/images/unsplash/varanasi.jpg", alt: "Boats on the Ganga beside the ghats of Varanasi" },
    tripTypes: ["spiritual", "heritage"],
    overview: [
      "Varanasi — also called Kashi or Banaras — is among the holiest cities in Hinduism. Its riverfront is lined with more than 80 ghats.",
      "Sarnath, where the Buddha gave his first sermon, is a short drive away.",
    ],
    highlights: ["The evening Ganga aarti at Dashashwamedh Ghat", "A sunrise boat ride along the ghats", "Kashi Vishwanath Temple", "Sarnath"],
    things: ["Watch the evening aarti", "Take a boat at sunrise", "Wander the old-city lanes", "Visit Sarnath"],
    best: "October to March. Summers are very hot, and the river rises in the monsoon.",
    reach: "Varanasi has an international airport, and Varanasi Junction and Banaras stations have trains from across India.",
    local: "Auto-rickshaws and cycle-rickshaws; the lanes of the old city are best on foot.",
    tips: ["Don't photograph cremations at Manikarnika Ghat", "Hire boats from registered boatmen", "Dress modestly at temples"],
    days: [["Evening aarti", "Walk the ghats and watch the evening aarti."], ["Sunrise and Sarnath", "A sunrise boat ride, then Sarnath."]],
    faqs: [["How many days do I need?", "Two days covers the ghats, the aarti and Sarnath."]],
  },
  {
    slug: "hampi", stateSlug: "karnataka", name: "Hampi", kind: "town", lat: 15.335, lng: 76.46,
    summary: "Ruins of the Vijayanagara capital, spread across a landscape of boulder hills.",
    img: { src: "/images/unsplash/trip-heritage.jpg", alt: "The stone chariot at Hampi" },
    tripTypes: ["heritage", "adventure"],
    overview: [
      "Hampi was the capital of the Vijayanagara Empire. Its ruins, a UNESCO World Heritage Site, are spread across a landscape of giant boulders along the Tungabhadra river.",
      "The Virupaksha Temple is still in active worship.",
    ],
    highlights: ["The Vittala Temple and its stone chariot", "Virupaksha Temple", "The Royal Enclosure and Lotus Mahal", "Sunset from Hemakuta or Matanga Hill"],
    things: ["Cycle between the main ruins", "Visit the Vittala Temple", "Watch the sunset from a hilltop", "Take a coracle ride on the Tungabhadra"],
    best: "October to February. It's very hot from March to May.",
    reach: "The nearest railway station is Hosapete. The nearest large airport is at Hubballi.",
    local: "Hire a bicycle, scooter or auto to get between sites.",
    tips: ["Start early to avoid the heat", "Carry water", "Wear comfortable shoes for rocky paths"],
    days: [["Sacred centre", "Virupaksha Temple and Hemakuta Hill."], ["Royal centre and Vittala", "The Royal Enclosure, Lotus Mahal and the Vittala Temple."]],
    faqs: [["How many days do I need?", "Two days covers the main sites."]],
  },
  {
    slug: "sohra", stateSlug: "meghalaya", name: "Sohra (Cherrapunji)", kind: "town", lat: 25.2702, lng: 91.7323,
    summary: "Waterfalls, deep gorges and living root bridges in the Khasi Hills.",
    img: { src: "/images/unsplash/meghalaya.jpg", alt: "Waterfalls in a green valley in Meghalaya" },
    tripTypes: ["nature", "adventure"],
    overview: [
      "Sohra, also known as Cherrapunji, sits on a plateau in Meghalaya's East Khasi Hills and is famous as one of the wettest places on Earth.",
      "Gorges, waterfalls such as Nohkalikai, and living root bridges grown by Khasi villagers draw travellers here.",
    ],
    highlights: ["Nohkalikai Falls", "The double-decker living root bridge at Nongriat", "Mawsmai Cave", "Seven Sisters Falls"],
    things: ["Trek down to the double-decker root bridge", "See Nohkalikai Falls", "Explore Mawsmai Cave"],
    best: "October to May for trekking. The monsoon makes the waterfalls spectacular, but it rains heavily.",
    reach: "Most travellers fly into Guwahati and drive via Shillong.",
    local: "Hire a taxi from Shillong or Sohra.",
    tips: ["The Nongriat trek involves thousands of steps", "Carry rain gear in any season"],
    days: [["Falls and caves", "Nohkalikai Falls and Mawsmai Cave."], ["Root bridges", "Trek to Nongriat's double-decker root bridge."]],
    faqs: [["Is the root-bridge trek hard?", "It's steep, with thousands of steps each way, but manageable at a steady pace."]],
  },
];

// ---------------------------------------------------------------- pages

const stateBySlug = (slug: string) => SAMPLE_STATES.find((s) => s.slug === slug) ?? null;

function seo(name: string, summary: string) {
  return { seoTitle: `${name} travel guide (sample)`, seoDescription: summary };
}

function placeSnapshot(p: SamplePlace, st: SampleState): PublishedSnapshot {
  const items = (xs: string[]) => xs.map((body) => ({ body }));
  return {
    place: {
      id: `sample-${p.stateSlug}-${p.slug}`,
      kind: p.kind,
      name: p.name,
      slug: p.slug,
      summary: p.summary,
      lat: p.lat,
      lng: p.lng,
      ...seo(p.name, p.summary),
      state: { name: st.name, slug: st.slug },
      parent: null,
      displayMode: "page",
      hero: image(p.img),
    },
    sections: [
      { key: "overview", body: { text: p.overview.join("\n\n") } },
      { key: "highlights", body: { items: items(p.highlights) } },
      { key: "things_to_do", body: { items: items(p.things) } },
      { key: "best_time", body: { text: p.best } },
      { key: "how_to_reach", body: { text: p.reach } },
      { key: "local_transport", body: { text: p.local } },
      { key: "travel_tips", body: { items: items(p.tips) } },
      { key: "faqs", body: { items: p.faqs.map(([title, body]) => ({ title, body })) } },
      { key: "itinerary", body: { items: p.days.map(([title, body], i) => ({ title: `Day ${i + 1}: ${title}`, body })) } },
    ],
  };
}

function stateSnapshot(st: SampleState): PublishedSnapshot {
  const region = matchRegion(st.name);
  const type = region ? INDIA_REGIONS.find((r) => r.name === region)?.type : undefined;
  const zone = zoneOf(st.name);
  const where = zone === "Islands" ? "in the Bay of Bengal or the Arabian Sea" : zone ? `in ${zone === "Northeast" ? "northeast" : zone.toLowerCase()} India` : "in India";
  const kind = type === "Union territory" ? "union territory" : "state";
  const summary = `Sample guide to ${st.name}, a ${kind} ${where}.`;
  return {
    place: {
      id: `sample-${st.slug}`,
      kind: "state",
      name: st.name,
      slug: st.slug,
      summary,
      lat: null,
      lng: null,
      ...seo(st.name, summary),
      state: null,
      parent: null,
      displayMode: "page",
      hero: image(st.img),
    },
    sections: [
      {
        key: "overview",
        body: {
          text: `${st.name} is a ${kind} ${where}.\n\nThis is a sample page for design work. Once destinations in ${st.name} are researched and published, this page will list them with checked facts, maps, itineraries and ways to get there.`,
        },
      },
    ],
  };
}

const childOf = (p: SamplePlace) => ({
  name: p.name,
  slug: p.slug,
  kind: p.kind,
  summary: p.summary,
  lat: p.lat,
  lng: p.lng,
  hero: image(p.img),
  tripTypes: p.tripTypes,
});

/** Sample state page data, or null when there's no sample for this slug. */
export function sampleStatePage(stateSlug: string) {
  const st = stateBySlug(stateSlug);
  if (!st) return null;
  const places = SAMPLE_PLACES.filter((p) => p.stateSlug === st.slug);
  return { snapshot: stateSnapshot(st), items: places.map(childOf), tripTypes: [...new Set(places.flatMap((p) => p.tripTypes))].slice(0, 3) };
}

/** Sample destination page data, or null when there's no sample for this state/place. */
export function samplePlacePage(stateSlug: string, placeSlug: string) {
  const st = stateBySlug(stateSlug);
  const p = SAMPLE_PLACES.find((x) => x.stateSlug === stateSlug && x.slug === placeSlug);
  if (!st || !p) return null;
  return { snapshot: placeSnapshot(p, st), items: [], tripTypes: p.tripTypes };
}
