import type { Name } from "@/components/icons/icon";

export interface TravelGuideItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  categoryKey: string;
  snippet: string;
  image: string;
  author: string;
  publishedDate: string;
  href: string;
  prompt: string;
}

export interface GuideCategory {
  name: string;
  key: string;
  count: number;
  icon: Name;
}

export interface TravelGuidesData {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    image: string;
    credit: string;
    creditUrl: string;
    searchPlaceholder: string;
  };
  categories: GuideCategory[];
  guides: TravelGuideItem[];
  popularGuides: {
    id: string;
    title: string;
    date: string;
    image: string;
    href: string;
    prompt: string;
  }[];
}

export const TRAVEL_GUIDES_MOCK: TravelGuidesData = {
  hero: {
    eyebrow: "TRAVEL GUIDES",
    title: "Plan Smarter, Travel Better",
    subtitle:
      "Discover in-depth travel guides, local tips and expert advice to help you explore India's most incredible destinations with confidence.",
    image: "/images/destinations/himachal-hero.jpg",
    credit: "Photo by Sarthak Tiwari on Unsplash",
    creditUrl: "https://unsplash.com",
    searchPlaceholder: "Search guides (e.g. Manali, Goa, Jaipur...)",
  },
  categories: [
    { name: "Hill Stations", key: "hill-stations", count: 42, icon: "mountain" },
    { name: "Beaches", key: "beaches", count: 28, icon: "waves" },
    { name: "Heritage", key: "heritage", count: 36, icon: "palace" },
    { name: "Spiritual", key: "spiritual", count: 24, icon: "temple" },
    { name: "Wildlife", key: "wildlife", count: 18, icon: "paw" },
    { name: "Adventure", key: "adventure", count: 22, icon: "route" },
    { name: "Nature", key: "nature", count: 20, icon: "palm" },
    { name: "Food & Culture", key: "food-culture", count: 16, icon: "utensils" },
    { name: "Family", key: "family", count: 14, icon: "family" },
  ],
  guides: [
    {
      id: "manali-guide",
      title: "Manali Travel Guide: Best Time, Things to Do, Where to Stay",
      slug: "manali",
      category: "HILL STATIONS",
      categoryKey: "hill-stations",
      snippet:
        "From snow-capped mountains to adventure sports, here's your complete guide to Manali, Himachal Pradesh.",
      image: "/images/destinations/solang-valley.jpg",
      author: "VacayOut Team",
      publishedDate: "28 Oct 2026",
      href: "/india/himachal-pradesh/manali",
      prompt: "Show me the complete travel guide for Manali with best time, hotels and activities",
    },
    {
      id: "goa-guide",
      title: "Goa Travel Guide: Beaches, Nightlife, Food & Best Places to Visit",
      slug: "goa",
      category: "BEACHES",
      categoryKey: "beaches",
      snippet:
        "Explore Goa's stunning beaches, vibrant nightlife, local food and top attractions for an unforgettable trip.",
      image: "/images/cinematic/dest-goa.jpg",
      author: "VacayOut Team",
      publishedDate: "25 Oct 2026",
      href: "/india/goa",
      prompt: "Show me the complete travel guide for Goa covering beaches, nightlife and food",
    },
    {
      id: "jaipur-guide",
      title: "Jaipur Travel Guide: Top Attractions, Local Food & Travel Tips",
      slug: "jaipur",
      category: "HERITAGE",
      categoryKey: "heritage",
      snippet:
        "Discover the best places to visit in Jaipur, where to eat, and essential travel tips for a smooth trip.",
      image: "/images/cinematic/dest-jaipur.jpg",
      author: "VacayOut Team",
      publishedDate: "22 Oct 2026",
      href: "/india/rajasthan",
      prompt: "Show me the complete travel guide for Jaipur forts, palaces and food",
    },
    {
      id: "kerala-guide",
      title: "Kerala Travel Guide: Backwaters, Beaches, Ayurveda & More",
      slug: "kerala",
      category: "NATURE",
      categoryKey: "nature",
      snippet:
        "Explore Kerala's tranquil backwaters, pristine beaches, rich culture and wellness experiences.",
      image: "/images/unsplash/kerala.jpg",
      author: "VacayOut Team",
      publishedDate: "20 Oct 2026",
      href: "/india/kerala",
      prompt: "Show me the complete travel guide for Kerala covering houseboats, Munnar hills and beaches",
    },
    {
      id: "varanasi-guide",
      title: "Varanasi Travel Guide: Ghats, Temples, Food & Cultural Experiences",
      slug: "varanasi",
      category: "SPIRITUAL",
      categoryKey: "spiritual",
      snippet:
        "Experience the spiritual heart of India with this complete guide to Varanasi's ghats, temples and local life.",
      image: "/images/cinematic/dest-varanasi.jpg",
      author: "VacayOut Team",
      publishedDate: "18 Oct 2026",
      href: "/india/uttar-pradesh",
      prompt: "Show me the complete travel guide for Varanasi ghats, ceremonies and street food",
    },
    {
      id: "ladakh-guide",
      title: "Ladakh Travel Guide: Best Time, Permits, Places to Visit",
      slug: "ladakh",
      category: "ADVENTURE",
      categoryKey: "adventure",
      snippet:
        "Plan your Ladakh trip with this complete guide covering permits, best time, must-visit places and travel tips.",
      image: "/images/destinations/ladakh.jpg",
      author: "VacayOut Team",
      publishedDate: "15 Oct 2026",
      href: "/india/ladakh",
      prompt: "Show me the complete travel guide for Ladakh including permits, altitude advice and lakes",
    },
    {
      id: "andaman-guide",
      title: "Andaman & Nicobar Travel Guide: Islands, Activities & How to Reach",
      slug: "andaman",
      category: "ISLANDS",
      categoryKey: "beaches",
      snippet:
        "Discover the best islands, water activities, where to stay and travel tips for Andaman & Nicobar.",
      image: "/images/destinations/andaman.jpg",
      author: "VacayOut Team",
      publishedDate: "12 Oct 2026",
      href: "/chat?q=Complete+travel+guide+for+Andaman+and+Nicobar+Islands",
      prompt: "Show me the complete travel guide for Andaman Islands beaches and scuba diving",
    },
    {
      id: "udaipur-guide",
      title: "Udaipur Travel Guide: Palaces, Lakes, Food & Things to Do",
      slug: "udaipur",
      category: "HERITAGE",
      categoryKey: "heritage",
      snippet:
        "Explore the City of Lakes with this guide to top attractions, local food, shopping and travel tips.",
      image: "/images/cinematic/dest-udaipur.jpg",
      author: "VacayOut Team",
      publishedDate: "10 Oct 2026",
      href: "/india/rajasthan",
      prompt: "Show me the complete travel guide for Udaipur lake palaces and heritage sights",
    },
    {
      id: "munnar-guide",
      title: "Munnar Travel Guide: Tea Gardens, Sightseeing & Best Time to Visit",
      slug: "munnar",
      category: "NATURE",
      categoryKey: "nature",
      snippet:
        "Plan your Munnar trip with this complete guide covering top attractions, activities, food and travel tips.",
      image: "/images/cinematic/dest-munnar.jpg",
      author: "VacayOut Team",
      publishedDate: "8 Oct 2026",
      href: "/india/kerala",
      prompt: "Show me the complete travel guide for Munnar tea plantations and viewpoint treks",
    },
    {
      id: "rishikesh-guide",
      title: "Rishikesh Travel Guide: Adventure, Yoga & Local Experiences",
      slug: "rishikesh",
      category: "CULTURE",
      categoryKey: "adventure",
      snippet:
        "From river rafting to yoga retreats, explore the best things to do in Rishikesh with practical travel tips.",
      image: "/images/destinations/rishikesh.jpg",
      author: "VacayOut Team",
      publishedDate: "5 Oct 2026",
      href: "/chat?q=Complete+travel+guide+for+Rishikesh+yoga+and+adventure",
      prompt: "Show me the complete travel guide for Rishikesh rafting, ashrams and cafes",
    },
    {
      id: "jaisalmer-guide",
      title: "Jaisalmer Travel Guide: Forts, Desert Safari & Local Culture",
      slug: "jaisalmer",
      category: "HERITAGE",
      categoryKey: "heritage",
      snippet:
        "Discover the golden city with this guide to must-see places, desert safaris, local food and travel tips.",
      image: "/images/things-to-do/camel-safari.jpg",
      author: "VacayOut Team",
      publishedDate: "2 Oct 2026",
      href: "/india/rajasthan",
      prompt: "Show me the complete travel guide for Jaisalmer fort and Sam desert safari",
    },
    {
      id: "shimla-guide",
      title: "Shimla Travel Guide: Top Attractions, Shopping & Travel Tips",
      slug: "shimla",
      category: "HILL STATIONS",
      categoryKey: "hill-stations",
      snippet:
        "Explore Shimla's colonial charm, scenic views, local food and the best places to visit in and around the town.",
      image: "/images/destinations/shimla.jpg",
      author: "VacayOut Team",
      publishedDate: "29 Sep 2026",
      href: "/india/himachal-pradesh",
      prompt: "Show me the complete travel guide for Shimla colonial landmarks and scenic spots",
    },
  ],
  popularGuides: [
    {
      id: "pop-manali",
      title: "Manali Travel Guide",
      date: "28 Oct 2026",
      image: "/images/destinations/solang-valley.jpg",
      href: "/india/himachal-pradesh/manali",
      prompt: "Show me the complete travel guide for Manali",
    },
    {
      id: "pop-goa",
      title: "Goa Travel Guide",
      date: "25 Oct 2026",
      image: "/images/cinematic/dest-goa.jpg",
      href: "/india/goa",
      prompt: "Show me the complete travel guide for Goa",
    },
    {
      id: "pop-jaipur",
      title: "Jaipur Travel Guide",
      date: "22 Oct 2026",
      image: "/images/cinematic/dest-jaipur.jpg",
      href: "/india/rajasthan",
      prompt: "Show me the complete travel guide for Jaipur",
    },
    {
      id: "pop-kerala",
      title: "Kerala Travel Guide",
      date: "20 Oct 2026",
      image: "/images/unsplash/kerala.jpg",
      href: "/india/kerala",
      prompt: "Show me the complete travel guide for Kerala",
    },
    {
      id: "pop-varanasi",
      title: "Varanasi Travel Guide",
      date: "18 Oct 2026",
      image: "/images/cinematic/dest-varanasi.jpg",
      href: "/india/uttar-pradesh",
      prompt: "Show me the complete travel guide for Varanasi",
    },
  ],
};
