"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon, type Name } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";

interface StateCardItem {
  id: string;
  name: string;
  slug: string;
  region: "north" | "south" | "east" | "west" | "central" | "northeast";
  destinationsCount: number;
  image: string;
  prompt: string;
}

const ALL_STATES: StateCardItem[] = [
  // Row 1
  {
    id: "jammu-kashmir",
    name: "Jammu & Kashmir",
    slug: "jammu-kashmir",
    region: "north",
    destinationsCount: 12,
    image: "/images/cinematic/hero-india-poster.jpg",
    prompt: "Plan a trip to Jammu & Kashmir covering Gulmarg, Srinagar, and Pahalgam",
  },
  {
    id: "himachal-pradesh",
    name: "Himachal Pradesh",
    slug: "himachal-pradesh",
    region: "north",
    destinationsCount: 18,
    image: "/images/unsplash/manali.jpg",
    prompt: "Plan a trip to Himachal Pradesh covering Manali, Shimla, and Spiti Valley",
  },
  {
    id: "uttarakhand",
    name: "Uttarakhand",
    slug: "uttarakhand",
    region: "north",
    destinationsCount: 15,
    image: "/images/destinations/rishikesh.jpg",
    prompt: "Plan a trip to Uttarakhand covering Rishikesh, Mussoorie, and Nainital",
  },
  {
    id: "punjab",
    name: "Punjab",
    slug: "punjab",
    region: "north",
    destinationsCount: 8,
    image: "/images/states/punjab.jpg",
    prompt: "Plan a heritage and food trip to Amritsar and Punjab",
  },

  // Row 2
  {
    id: "rajasthan",
    name: "Rajasthan",
    slug: "rajasthan",
    region: "west",
    destinationsCount: 24,
    image: "/images/cinematic/dest-jaipur.jpg",
    prompt: "Plan a royal palace tour across Jaipur, Jodhpur, and Udaipur in Rajasthan",
  },
  {
    id: "uttar-pradesh",
    name: "Uttar Pradesh",
    slug: "uttar-pradesh",
    region: "central",
    destinationsCount: 20,
    image: "/images/cinematic/dest-varanasi.jpg",
    prompt: "Plan a spiritual and cultural tour of Varanasi, Agra, and Lucknow in Uttar Pradesh",
  },
  {
    id: "bihar",
    name: "Bihar",
    slug: "bihar",
    region: "east",
    destinationsCount: 10,
    image: "/images/states/bihar.jpg",
    prompt: "Plan a Buddhist circuit pilgrimage to Bodh Gaya, Nalanda, and Rajgir in Bihar",
  },
  {
    id: "jharkhand",
    name: "Jharkhand",
    slug: "jharkhand",
    region: "east",
    destinationsCount: 7,
    image: "/images/states/jharkhand.jpg",
    prompt: "Plan a nature and waterfall exploration of Jharkhand including Betla and Dassam",
  },

  // Row 3
  {
    id: "west-bengal",
    name: "West Bengal",
    slug: "west-bengal",
    region: "east",
    destinationsCount: 16,
    image: "/images/states/west-bengal.jpg",
    prompt: "Plan a trip to Kolkata heritage, Darjeeling tea hills, and Sundarbans in West Bengal",
  },
  {
    id: "sikkim",
    name: "Sikkim",
    slug: "sikkim",
    region: "northeast",
    destinationsCount: 6,
    image: "/images/states/sikkim.jpg",
    prompt: "Plan a mountain holiday in Gangtok, Pelling, and North Sikkim",
  },
  {
    id: "assam",
    name: "Assam",
    slug: "assam",
    region: "northeast",
    destinationsCount: 9,
    image: "/images/states/assam.jpg",
    prompt: "Plan a wildlife safari in Kaziranga and Brahmaputra cruise in Assam",
  },
  {
    id: "meghalaya",
    name: "Meghalaya",
    slug: "meghalaya",
    region: "northeast",
    destinationsCount: 5,
    image: "/images/cinematic/dest-meghalaya.jpg",
    prompt: "Plan a trip to Shillong, Cherrapunji, and Dawki living root bridges in Meghalaya",
  },

  // Row 4
  {
    id: "manipur",
    name: "Manipur",
    slug: "manipur",
    region: "northeast",
    destinationsCount: 4,
    image: "/images/states/manipur.jpg",
    prompt: "Plan a scenic tour to Loktak Lake, Imphal, and Keibul Lamjao in Manipur",
  },
  {
    id: "nagaland",
    name: "Nagaland",
    slug: "nagaland",
    region: "northeast",
    destinationsCount: 3,
    image: "/images/states/nagaland.jpg",
    prompt: "Plan a cultural trip to Kohima, Dzukou Valley, and Hornbill Festival in Nagaland",
  },
  {
    id: "tripura",
    name: "Tripura",
    slug: "tripura",
    region: "northeast",
    destinationsCount: 3,
    image: "/images/states/tripura.jpg",
    prompt: "Plan a heritage tour to Neermahal, Ujjayanta Palace, and Unakoti in Tripura",
  },
  {
    id: "mizoram",
    name: "Mizoram",
    slug: "mizoram",
    region: "northeast",
    destinationsCount: 2,
    image: "/images/states/mizoram.jpg",
    prompt: "Plan a peaceful hill trip to Aizawl, Reiek, and Champhai in Mizoram",
  },

  // Row 5
  {
    id: "andhra-pradesh",
    name: "Andhra Pradesh",
    slug: "andhra-pradesh",
    region: "south",
    destinationsCount: 8,
    image: "/images/states/andhra-pradesh.jpg",
    prompt: "Plan a temple and coastal trip to Tirupati, Visakhapatnam, and Araku in Andhra Pradesh",
  },
  {
    id: "karnataka",
    name: "Karnataka",
    slug: "karnataka",
    region: "south",
    destinationsCount: 12,
    image: "/images/states/karnataka.jpg",
    prompt: "Plan an itinerary for Hampi ruins, Coorg coffee estates, and Mysore Palace in Karnataka",
  },
  {
    id: "kerala",
    name: "Kerala",
    slug: "kerala",
    region: "south",
    destinationsCount: 14,
    image: "/images/unsplash/kerala.jpg",
    prompt: "Plan a backwater and beach vacation in Alleppey, Munnar, and Varkala in Kerala",
  },
  {
    id: "tamil-nadu",
    name: "Tamil Nadu",
    slug: "tamil-nadu",
    region: "south",
    destinationsCount: 16,
    image: "/images/states/tamil-nadu.jpg",
    prompt: "Plan a grand temple tour of Madurai, Thanjavur, and Chennai in Tamil Nadu",
  },

  // Page 2 & Other States & UTs (making 36 total)
  {
    id: "goa",
    name: "Goa",
    slug: "goa",
    region: "west",
    destinationsCount: 14,
    image: "/images/cinematic/dest-goa.jpg",
    prompt: "Plan a relaxed vacation in North and South Goa",
  },
  {
    id: "gujarat",
    name: "Gujarat",
    slug: "gujarat",
    region: "west",
    destinationsCount: 16,
    image: "/images/cinematic/dest-udaipur.jpg",
    prompt: "Plan a trip to Rann of Kutch, Gir National Park, and Somnath in Gujarat",
  },
  {
    id: "maharashtra",
    name: "Maharashtra",
    slug: "maharashtra",
    region: "west",
    destinationsCount: 22,
    image: "/images/unsplash/trip-weekend.jpg",
    prompt: "Plan a tour of Mumbai, Ajanta-Ellora caves, and Western Ghats in Maharashtra",
  },
  {
    id: "madhya-pradesh",
    name: "Madhya Pradesh",
    slug: "madhya-pradesh",
    region: "central",
    destinationsCount: 18,
    image: "/images/destinations/wildlife.jpg",
    prompt: "Plan a wildlife safari in Bandhavgarh and Khajuraho temples in Madhya Pradesh",
  },
  {
    id: "chhattisgarh",
    name: "Chhattisgarh",
    slug: "chhattisgarh",
    region: "central",
    destinationsCount: 9,
    image: "/images/destinations/trekking.jpg",
    prompt: "Plan a nature and tribal tour of Bastar and Chitrakote Falls in Chhattisgarh",
  },
  {
    id: "odisha",
    name: "Odisha",
    slug: "odisha",
    region: "east",
    destinationsCount: 12,
    image: "/images/unsplash/trip-heritage.jpg",
    prompt: "Plan a heritage tour of Puri Jagannath, Konark Sun Temple, and Chilika Lake in Odisha",
  },
  {
    id: "telangana",
    name: "Telangana",
    slug: "telangana",
    region: "south",
    destinationsCount: 10,
    image: "/images/states/andhra-pradesh.jpg",
    prompt: "Plan a cultural and historic visit to Hyderabad, Golconda Fort, and Warangal in Telangana",
  },
  {
    id: "haryana",
    name: "Haryana",
    slug: "haryana",
    region: "north",
    destinationsCount: 7,
    image: "/images/unsplash/trip-family.jpg",
    prompt: "Plan a heritage weekend to Kurukshetra and Sultanpur Bird Sanctuary in Haryana",
  },
  {
    id: "delhi",
    name: "Delhi",
    slug: "delhi",
    region: "north",
    destinationsCount: 15,
    image: "/images/cinematic/hero-india-poster.jpg",
    prompt: "Plan a 3-day exploration of Old Delhi food, monuments, and museums",
  },
  {
    id: "ladakh",
    name: "Ladakh",
    slug: "ladakh",
    region: "north",
    destinationsCount: 14,
    image: "/images/destinations/ladakh.jpg",
    prompt: "Plan an adventure road trip through Leh, Nubra Valley, and Pangong Lake in Ladakh",
  },
  {
    id: "arunachal-pradesh",
    name: "Arunachal Pradesh",
    slug: "arunachal-pradesh",
    region: "northeast",
    destinationsCount: 6,
    image: "/images/destinations/spiti.jpg",
    prompt: "Plan a mountain trek to Tawang Monastery and Ziro Valley in Arunachal Pradesh",
  },
  {
    id: "andaman-nicobar",
    name: "Andaman & Nicobar",
    slug: "andaman-nicobar",
    region: "south",
    destinationsCount: 8,
    image: "/images/destinations/andaman.jpg",
    prompt: "Plan a scuba diving and beach holiday in Havelock and Neil Islands",
  },
  {
    id: "chandigarh",
    name: "Chandigarh",
    slug: "chandigarh",
    region: "north",
    destinationsCount: 5,
    image: "/images/states/punjab.jpg",
    prompt: "Plan a city break to Rock Garden and Sukhna Lake in Chandigarh",
  },
  {
    id: "puducherry",
    name: "Puducherry",
    slug: "puducherry",
    region: "south",
    destinationsCount: 6,
    image: "/images/cinematic/dest-goa.jpg",
    prompt: "Plan a French colonial promenade and Auroville getaway in Puducherry",
  },
  {
    id: "lakshadweep",
    name: "Lakshadweep",
    slug: "lakshadweep",
    region: "south",
    destinationsCount: 4,
    image: "/images/destinations/andaman.jpg",
    prompt: "Plan an island escape to Bangaram and Agatti lagoons in Lakshadweep",
  },
  {
    id: "daman-diu",
    name: "Daman & Diu",
    slug: "daman-diu",
    region: "west",
    destinationsCount: 4,
    image: "/images/cinematic/dest-goa.jpg",
    prompt: "Plan a coastal fort and beach weekend in Daman and Diu",
  },
];

interface TravelInterest {
  title: string;
  count: string;
  icon: Name;
  prompt: string;
}

const TRAVEL_INTERESTS: TravelInterest[] = [
  {
    title: "Mountains",
    count: "87 destinations",
    icon: "mountain",
    prompt: "Suggest the best mountain destinations and Himalayan hill retreats in India",
  },
  {
    title: "Beaches",
    count: "62 destinations",
    icon: "waves",
    prompt: "Suggest the most scenic beach and coastal getaways in India",
  },
  {
    title: "Temples",
    count: "54 destinations",
    icon: "temple",
    prompt: "Suggest ancient temples and sacred spiritual routes across India",
  },
  {
    title: "Wildlife",
    count: "41 destinations",
    icon: "paw",
    prompt: "Suggest the top national parks and tiger reserves for wildlife lovers in India",
  },
  {
    title: "Heritage",
    count: "38 destinations",
    icon: "palace",
    prompt: "Suggest royal palaces, UNESCO forts, and ancient monuments in India",
  },
  {
    title: "Adventure",
    count: "33 destinations",
    icon: "route",
    prompt: "Suggest the best adventure treks, river rafting, and camping spots in India",
  },
  {
    title: "Food & Culture",
    count: "24 destinations",
    icon: "utensils",
    prompt: "Suggest the best culinary and authentic cultural cities to explore in India",
  },
];

const REGION_TABS = [
  { key: "all", label: "All (36)" },
  { key: "north", label: "North (9)" },
  { key: "south", label: "South (7)" },
  { key: "east", label: "East (6)" },
  { key: "west", label: "West (6)" },
  { key: "central", label: "Central (4)" },
  { key: "northeast", label: "Northeast (8)" },
];

export function ExplorePage() {
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);

  const handleOpenAi = (prompt: string) => {
    setActivePrompt(prompt);
    setIsModalOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      handleOpenAi(`Plan a trip exploring ${q}`);
    }
  };

  // Filter states by region & search query
  const filteredStates = useMemo(() => {
    return ALL_STATES.filter((item) => {
      const matchesRegion =
        selectedRegion === "all" || item.region === selectedRegion;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRegion && matchesSearch;
    });
  }, [selectedRegion, searchQuery]);

  // 20 items per page as shown in screenshot
  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredStates.length / ITEMS_PER_PAGE) || 1;
  const paginatedStates = filteredStates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="bg-white min-h-screen">
      {/* 1. Panoramic Photographic Hero Banner */}
      <section className="relative isolate flex min-h-[440px] sm:min-h-[480px] lg:min-h-[520px] w-full items-center overflow-hidden">
        {/* Background Image: Udaipur Lake Pichola & City Palace at Sunset */}
        <div className="absolute inset-0 -z-20">
          <Image
            src="/images/cinematic/dest-udaipur.jpg"
            alt="Explore India - Udaipur Lake Pichola and City Palace"
            fill
            priority
            className="object-cover object-[center_35%]"
          />
        </div>

        {/* Gradient Overlay for Readability */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/45 to-transparent sm:w-3/4"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 -z-10 bg-gradient-to-t from-black/60 to-transparent"
        />

        {/* Hero Content */}
        <div className="container-site relative z-10 pt-20 pb-12 sm:pt-24 sm:pb-16 text-white">
          <div className="max-w-2xl">
            <p className="text-[0.6875rem] sm:text-xs font-bold tracking-[0.2em] uppercase text-white/90 mb-2">
              DISCOVER INCREDIBLE PLACES
            </p>
            <h1 className="font-serif text-[clamp(2.5rem,5vw,3.75rem)] font-bold tracking-tight text-white leading-[1.08] drop-shadow-sm">
              Explore India
            </h1>
            <p className="mt-3 text-sm sm:text-base text-white/85 leading-relaxed drop-shadow-xs max-w-xl">
              From snow-capped mountains to golden beaches, ancient temples to vibrant cities — discover the best destinations across India.
            </p>

            {/* Search Capsule Input */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-6 flex max-w-lg items-center gap-2 rounded-full bg-white p-1.5 pl-4 sm:pl-5 shadow-lg"
            >
              <Icon name="search" size={18} className="text-[#666666] shrink-0" />
              <label htmlFor="explore-search-input" className="sr-only">
                Search states, cities or destinations...
              </label>
              <input
                id="explore-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search states, cities or destinations..."
                className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-ink outline-none placeholder:text-[#888888] font-medium py-1.5"
              />
              <button
                type="submit"
                aria-label="Search or plan with AI"
                className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-[#234832] text-white hover:bg-[#1A3826] transition-transform active:scale-95 shadow-xs"
              >
                <Icon name="arrowRight" size={16} strokeWidth={2.2} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom-right photo credit badge matching screenshot */}
        <div className="absolute right-4 bottom-4 sm:right-8 sm:bottom-6 z-10 text-right text-[0.6875rem] text-white/80 drop-shadow-xs">
          <p className="flex items-center gap-1 justify-end font-medium">
            <Icon name="pin" size={11} className="text-coral" />
            <span>Udaipur, Rajasthan</span>
          </p>
          <p className="text-white/60 text-[0.625rem]">
            Photo by Pexels on Unsplash ↗
          </p>
        </div>
      </section>

      {/* 2. Main Two-Column Content Area */}
      <div className="container-site py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Main Left Column (Grid of States & Tabs) */}
          <main className="lg:col-span-8 xl:col-span-9">
            {/* Section Title */}
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-sans">
              Browse by State &amp; Union Territory
            </h2>

            {/* Region Filter Tabs / Pills matching screenshot */}
            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {REGION_TABS.map((tab) => {
                const isActive = selectedRegion === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setSelectedRegion(tab.key);
                      setCurrentPage(1);
                    }}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#234832] text-white shadow-xs"
                        : "border border-[#E5E2DC] bg-white text-ink/80 hover:border-ink hover:text-ink shadow-xs"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* 4-Column Grid of State Cards */}
            {paginatedStates.length === 0 ? (
              <div className="py-16 text-center text-[#777777]">
                <p className="text-base font-semibold text-ink">No states match your search.</p>
                <p className="mt-1 text-xs">Try selecting “All” or clearing your search term.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRegion("all");
                    setSearchQuery("");
                  }}
                  className="mt-4 rounded-full bg-[#234832] text-white px-4 py-1.5 text-xs font-semibold"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
                {paginatedStates.map((st) => (
                  <Link
                    key={st.id}
                    href={`/india/${st.slug}`}
                    className="group flex flex-col rounded-xl border border-[#ECE9E2] bg-white shadow-xs hover:border-coral hover:shadow-md transition-all overflow-hidden cursor-pointer"
                  >
                    {/* Card Thumbnail */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#EFECE6]">
                      <Image
                        src={st.image}
                        alt={`${st.name} tourism and travel guide`}
                        fill
                        sizes="(min-width: 1280px) 20vw, (min-width: 768px) 25vw, 50vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                      />
                    </div>

                    {/* Card Info */}
                    <div className="p-3">
                      <h3 className="text-xs sm:text-sm font-bold text-ink group-hover:text-coral transition-colors truncate">
                        {st.name}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1 text-[0.6875rem] sm:text-xs text-[#777777]">
                        <Icon name="pin" size={11} className="text-[#999999] shrink-0" />
                        <span>{st.destinationsCount} destinations</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination Controls matching screenshot */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pNum = i + 1;
                  const isCurrent = currentPage === pNum;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      className={`size-8 rounded-full text-xs font-bold transition-all flex items-center justify-center ${
                        isCurrent
                          ? "bg-[#234832] text-white shadow-xs"
                          : "border border-[#E5E2DC] bg-white text-ink hover:border-ink"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                {currentPage < totalPages && (
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    aria-label="Next page"
                    className="size-8 rounded-full border border-[#E5E2DC] bg-white text-ink hover:border-ink flex items-center justify-center transition-all"
                  >
                    <Icon name="arrowRight" size={12} />
                  </button>
                )}
              </div>
            )}
          </main>

          {/* Right Sidebar Column (3 Widgets) */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
            {/* Widget 1: 36 States & Union Territories Map Card */}
            <div className="rounded-2xl border border-[#E5E2DC] bg-[#F7F9F6] p-5 shadow-xs flex flex-col justify-between">
              {/* Soft Green India Map Silhouette */}
              <div className="relative flex items-center justify-center py-2">
                <svg
                  viewBox="0 0 200 240"
                  className="w-full h-auto max-h-[160px] opacity-85 drop-shadow-xs"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M85 20 C90 15, 105 15, 110 25 C115 35, 120 45, 110 55 C100 65, 85 65, 80 55 C75 45, 80 25, 85 20 Z"
                    fill="#CDE2D3"
                    stroke="#A5C9B7"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M60 60 C70 55, 110 55, 115 75 C110 95, 100 110, 75 115 C55 110, 45 90, 55 75 C60 65, 60 60, 60 60 Z"
                    fill="#D8E8DC"
                    stroke="#BED6C4"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M75 115 C100 110, 130 115, 135 145 C130 170, 100 175, 80 165 C65 155, 60 130, 75 115 Z"
                    fill="#C2DDD0"
                    stroke="#A5C9B7"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M145 75 C165 70, 190 75, 190 95 C190 115, 165 125, 145 110 C135 100, 135 85, 145 75 Z"
                    fill="#D8E8DC"
                    stroke="#BED6C4"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M80 165 C100 175, 125 170, 115 205 C105 235, 95 240, 90 240 C85 240, 75 235, 70 205 C65 185, 75 170, 80 165 Z"
                    fill="#B5D6C5"
                    stroke="#98BFAC"
                    strokeWidth="1.2"
                  />
                </svg>
              </div>

              <div className="mt-3">
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  36 States &amp; Union Territories
                </h3>
                <p className="mt-1 text-xs text-[#666666] leading-relaxed">
                  Discover all destinations across India&apos;s incredible regions.
                </p>

                <button
                  type="button"
                  onClick={() => handleOpenAi("Give me a complete regional overview of travel destinations in India by state")}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D5DCD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-ink shadow-xs hover:border-[#234832] hover:text-[#234832] transition-all"
                >
                  <Icon name="compass" size={14} className="text-[#234832]" />
                  <span>View Indian map</span>
                  <Icon name="arrowRight" size={11} />
                </button>
              </div>
            </div>

            {/* Widget 2: Popular Travel Interests matching screenshot */}
            <div className="rounded-2xl border border-[#E5E2DC] bg-white p-5 shadow-xs">
              <h3 className="text-sm sm:text-base font-bold text-ink mb-3.5">
                Popular Travel Interests
              </h3>

              <div className="space-y-1">
                {TRAVEL_INTERESTS.map((interest) => (
                  <button
                    key={interest.title}
                    type="button"
                    onClick={() => handleOpenAi(interest.prompt)}
                    className="group flex w-full items-center justify-between p-2 rounded-xl hover:bg-[#F7F9F6] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-ink group-hover:text-coral transition-colors">
                        <Icon name={interest.icon} size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink group-hover:text-coral transition-colors truncate">
                          {interest.title}
                        </p>
                        <p className="text-[0.6875rem] text-[#777777] truncate">
                          {interest.count}
                        </p>
                      </div>
                    </div>
                    <Icon
                      name="arrowRight"
                      size={12}
                      className="text-[#AAAAAA] group-hover:text-coral group-hover:translate-x-0.5 transition-all shrink-0 ml-1"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Widget 3: Plan your perfect trip with AI */}
            <div className="relative overflow-hidden rounded-2xl border border-[#D5E5DA] bg-gradient-to-br from-[#EEF5F0] via-[#E8F2EC] to-[#E2EFE7] p-5 shadow-xs">
              <div className="relative z-10">
                <h3 className="text-base font-bold text-ink leading-tight">
                  Plan your perfect trip with AI
                </h3>
                <p className="mt-2 text-xs text-[#55695A] leading-relaxed">
                  Get personalised itineraries, budget estimates and local tips for your next adventure.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAi("Help me plan my next dream trip across India with AI")}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#234832] hover:bg-[#1A3826] text-white px-4 py-2 text-xs font-semibold shadow-xs transition-all active:scale-95"
                >
                  <span>Start planning</span>
                  <Icon name="arrowRight" size={12} strokeWidth={2.2} />
                </button>
              </div>

              {/* Decorative scenic mountain background in bottom right */}
              <div className="absolute right-0 bottom-0 size-28 opacity-15 pointer-events-none -mr-4 -mb-4">
                <Icon name="mountain" size={112} className="text-[#234832]" />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Interactive AI Travel Planner Modal Dialog */}
      <AiPlannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPrompt={activePrompt}
        examples={[
          { label: "5-day Golden Triangle", prompt: "Plan a 5-day trip across Delhi, Agra and Jaipur", icon: "temple" },
          { label: "Kerala backwaters", prompt: "Plan a relaxing 5-day family trip to Kerala backwaters and Munnar", icon: "palm" },
          { label: "Himachal mountain trip", prompt: "Suggest a scenic 6-day road trip through Himachal Pradesh", icon: "mountain" },
        ]}
      />
    </div>
  );
}
