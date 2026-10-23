import type { Name } from "@/components/icons/icon";

export interface InterestCard {
  id: string;
  title: string;
  countText: string;
  icon: Name;
  image: string;
  category: string;
  prompt: string;
  href?: string;
}

export interface PopularActivity {
  id: string;
  title: string;
  tagsText: string;
  image: string;
  prompt: string;
  href?: string;
}

export interface FeaturedExperience {
  id: string;
  title: string;
  location: string;
  badges: string[];
  image: string;
  prompt: string;
  href?: string;
}

export interface ThingsToDoData {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    image: string;
    credit: string;
    creditUrl: string;
    searchPlaceholder: string;
  };
  filterPills: { id: string; label: string }[];
  interests: InterestCard[];
  popularActivities: PopularActivity[];
  whyChooseUs: string[];
  featuredExperiences: FeaturedExperience[];
}

export const THINGS_TO_DO_MOCK: ThingsToDoData = {
  hero: {
    eyebrow: "EXPLORE BY INTEREST",
    title: "Things to Do in India",
    subtitle:
      "From majestic mountains to pristine beaches, sacred temples to thrilling adventures – find experiences that match your travel style.",
    image: "/images/things-to-do/dal-lake-hero.jpg",
    credit: "Dal Lake, Srinagar | Photo by Deepak Santhosh on Unsplash",
    creditUrl: "https://unsplash.com",
    searchPlaceholder: "Search activities, interests or destinations...",
  },
  filterPills: [
    { id: "all", label: "All" },
    { id: "mountains", label: "Mountains" },
    { id: "beaches", label: "Beaches" },
    { id: "heritage", label: "Heritage" },
    { id: "spiritual", label: "Spiritual" },
    { id: "wildlife", label: "Wildlife" },
    { id: "adventure", label: "Adventure" },
    { id: "food-culture", label: "Food & Culture" },
    { id: "family", label: "Family" },
  ],
  interests: [
    {
      id: "mountains",
      title: "Mountains",
      countText: "42 destinations",
      icon: "mountain",
      image: "/images/destinations/solang-valley.jpg",
      category: "mountains",
      prompt: "Show me the best mountain destinations, hill stations, and Himalayan retreats in India",
      href: "/india/himachal-pradesh/manali",
    },
    {
      id: "beaches",
      title: "Beaches",
      countText: "28 destinations",
      icon: "waves",
      image: "/images/cinematic/dest-goa.jpg",
      category: "beaches",
      prompt: "Show me the best beach destinations and coastal escapes in India",
      href: "/india/goa",
    },
    {
      id: "heritage",
      title: "Heritage",
      countText: "36 destinations",
      icon: "palace",
      image: "/images/cinematic/dest-jaipur.jpg",
      category: "heritage",
      prompt: "Show me royal palaces, UNESCO heritage sites, and historical forts in India",
      href: "/india/rajasthan",
    },
    {
      id: "spiritual",
      title: "Spiritual",
      countText: "24 destinations",
      icon: "temple",
      image: "/images/cinematic/dest-varanasi.jpg",
      category: "spiritual",
      prompt: "Show me spiritual journeys, sacred ghats, and pilgrimage temple cities in India",
      href: "/india/uttar-pradesh",
    },
    {
      id: "wildlife",
      title: "Wildlife",
      countText: "18 destinations",
      icon: "paw",
      image: "/images/destinations/wildlife.jpg",
      category: "wildlife",
      prompt: "What are the best national parks, tiger reserves, and wildlife safaris in India?",
      href: "/chat?q=Best+wildlife+safaris+and+tiger+reserves+in+India",
    },
    {
      id: "adventure",
      title: "Adventure",
      countText: "26 destinations",
      icon: "route",
      image: "/images/things-to-do/adventure-rafting.jpg",
      category: "adventure",
      prompt: "What are the top adventure activities in India including river rafting, trekking, and skiing?",
      href: "/india/himachal-pradesh/manali",
    },
    {
      id: "food-culture",
      title: "Food & Culture",
      countText: "20 destinations",
      icon: "utensils",
      image: "/images/things-to-do/food-culture.jpg",
      category: "food-culture",
      prompt: "Take me on a culinary and street food journey across India",
      href: "/chat?q=Top+food+and+cultural+cities+in+India+to+visit",
    },
    {
      id: "family",
      title: "Family",
      countText: "16 destinations",
      icon: "family",
      image: "/images/unsplash/trip-family.jpg",
      category: "family",
      prompt: "Suggest the best family-friendly holidays and scenic vacation destinations in India",
      href: "/india/kerala",
    },
    {
      id: "honeymoon",
      title: "Honeymoon",
      countText: "12 destinations",
      icon: "heart",
      image: "/images/unsplash/trip-romantic.jpg",
      category: "family",
      prompt: "Suggest romantic honeymoon destinations and couple getaways in India",
      href: "/india/himachal-pradesh/manali",
    },
  ],
  popularActivities: [
    {
      id: "trekking-himachal",
      title: "Trekking in Himachal Pradesh",
      tagsText: "Adventure • Mountains",
      image: "/images/destinations/trekking.jpg",
      prompt: "Tell me about beginner and intermediate treks in Himachal Pradesh like Triund and Kheerganga",
      href: "/india/himachal-pradesh",
    },
    {
      id: "houseboat-srinagar",
      title: "Houseboat Stay in Srinagar",
      tagsText: "Relaxation • Lakes",
      image: "/images/things-to-do/dal-lake-hero.jpg",
      prompt: "How to plan a traditional cedar houseboat stay on Dal Lake or Nigeen Lake in Srinagar",
      href: "/chat?q=Plan+a+traditional+houseboat+stay+on+Dal+Lake+Srinagar",
    },
    {
      id: "temple-tours-tn",
      title: "Temple Tours in Tamil Nadu",
      tagsText: "Spiritual • Culture",
      image: "/images/things-to-do/meenakshi-temple.jpg",
      prompt: "Guide to great living Chola temples and Meenakshi Amman Temple in Tamil Nadu",
      href: "/chat?q=Show+me+a+temple+heritage+itinerary+for+Tamil+Nadu",
    },
    {
      id: "wildlife-corbett",
      title: "Wildlife Safari in Jim Corbett",
      tagsText: "Wildlife • Nature",
      image: "/images/destinations/wildlife.jpg",
      prompt: "Best zones and safari booking tips for Jim Corbett National Park in Uttarakhand",
      href: "/chat?q=Safari+zones+and+booking+guide+for+Jim+Corbett+National+Park",
    },
    {
      id: "beach-hopping-goa",
      title: "Beach Hopping in Goa",
      tagsText: "Beaches • Water Sports",
      image: "/images/cinematic/dest-goa.jpg",
      prompt: "What are the most beautiful beaches in South and North Goa for water sports and sunsets?",
      href: "/india/goa",
    },
  ],
  whyChooseUs: [
    "Curated experiences from real destinations",
    "Verified information and local insights",
    "AI-powered trip planning",
    "Transparent booking links (may earn a commission)",
  ],
  featuredExperiences: [
    {
      id: "triund-trek",
      title: "Triund Trek",
      location: "Dharamshala, Himachal Pradesh",
      badges: ["Trekking", "Mountains"],
      image: "/images/destinations/trekking.jpg",
      prompt: "How to prepare and plan the Triund Trek from McLeod Ganj Dharamshala",
      href: "/india/himachal-pradesh/dharamshala",
    },
    {
      id: "kerala-backwaters",
      title: "Kerala Backwaters Cruise",
      location: "Alappuzha, Kerala",
      badges: ["Boating", "Nature"],
      image: "/images/unsplash/kerala.jpg",
      prompt: "How to book and experience a day cruise or overnight houseboat in Alleppey Kerala",
      href: "/india/kerala",
    },
    {
      id: "camel-safari",
      title: "Camel Safari",
      location: "Jaisalmer, Rajasthan",
      badges: ["Adventure", "Heritage"],
      image: "/images/things-to-do/camel-safari.jpg",
      prompt: "Best desert camp and sunset camel safari in Sam Sand Dunes Jaisalmer",
      href: "/india/rajasthan",
    },
    {
      id: "meenakshi-temple",
      title: "Meenakshi Temple Visit",
      location: "Madurai, Tamil Nadu",
      badges: ["Culture", "Spiritual"],
      image: "/images/things-to-do/meenakshi-temple.jpg",
      prompt: "History, timings, and sacred ceremonies at Meenakshi Amman Temple in Madurai",
      href: "/chat?q=Tell+me+about+visiting+Meenakshi+Temple+in+Madurai",
    },
    {
      id: "scuba-diving",
      title: "Scuba Diving",
      location: "Havelock Island, Andaman & Nicobar",
      badges: ["Adventure", "Water Sports"],
      image: "/images/destinations/andaman.jpg",
      prompt: "Best dive spots and certified scuba diving schools on Havelock Island Andaman",
      href: "/chat?q=Scuba+diving+and+reef+sites+in+Andaman+Islands",
    },
  ],
};
