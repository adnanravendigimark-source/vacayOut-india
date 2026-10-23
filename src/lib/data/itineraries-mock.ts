export interface ItineraryCardItem {
  id: string;
  title: string;
  daysBadge: string;
  daysCount: number;
  subtitle: string;
  tagsText: string;
  snippet: string;
  image: string;
  category: string;
  isWeekend?: boolean;
  prompt: string;
  href: string;
}

export interface ItinerariesPageData {
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
  itineraries: ItineraryCardItem[];
  popularCities: {
    name: string;
    slug: string;
    image: string;
    href: string;
    prompt: string;
  }[];
  startingCities: string[];
}

export const ITINERARIES_MOCK: ItinerariesPageData = {
  hero: {
    eyebrow: "CURATED TRAVEL PLANS",
    title: "India Itineraries",
    subtitle:
      "Discover ready-made travel plans for every kind of trip – from quick weekend getaways to week-long adventures, with day-wise itineraries, estimated time and must-visit places.",
    image: "/images/things-to-do/dal-lake-hero.jpg",
    credit: "Photo by Pranav Kumar on Unsplash",
    creditUrl: "https://unsplash.com",
    searchPlaceholder: "Search itineraries (e.g. 3 days in Manali, Rajasthan, Kerala...)",
  },
  filterPills: [
    { id: "all", label: "All" },
    { id: "2-3-days", label: "2–3 Days" },
    { id: "4-5-days", label: "4–5 Days" },
    { id: "6-7-days", label: "6–7 Days" },
    { id: "weekends", label: "Weekends" },
    { id: "mountain", label: "Mountain" },
    { id: "beach", label: "Beach" },
    { id: "heritage", label: "Heritage" },
    { id: "family", label: "Family" },
  ],
  itineraries: [
    {
      id: "manali-3d",
      title: "3 Days in Manali",
      daysBadge: "3 days",
      daysCount: 3,
      subtitle: "Manali, Solang Valley, Old Manali",
      tagsText: "Mountains • Adventure • Nature",
      snippet:
        "Explore scenic valleys, enjoy adventure activities and experience the charm of Himachal's hill town.",
      image: "/images/destinations/solang-valley.jpg",
      category: "mountain",
      isWeekend: true,
      prompt: "Show me a detailed 3-day itinerary for Manali covering Solang, Old Manali, and Mall Road",
      href: "/india/himachal-pradesh/manali",
    },
    {
      id: "rajasthan-5d",
      title: "Rajasthan Heritage Trail",
      daysBadge: "5 days",
      daysCount: 5,
      subtitle: "Jaipur, Jodhpur, Udaipur",
      tagsText: "Heritage • Culture • Photography",
      snippet:
        "Visit royal palaces, ancient forts and vibrant markets on this classic Rajasthan journey.",
      image: "/images/cinematic/dest-jaipur.jpg",
      category: "heritage",
      prompt: "Show me a detailed 5-day itinerary for Rajasthan covering Jaipur, Jodhpur, and Udaipur",
      href: "/india/rajasthan",
    },
    {
      id: "kerala-4d",
      title: "Kerala Backwaters & Beaches",
      daysBadge: "4 days",
      daysCount: 4,
      subtitle: "Kochi, Alleppey, Varkala",
      tagsText: "Beaches • Nature • Relaxation",
      snippet:
        "Cruise through peaceful backwaters, relax on pristine beaches and enjoy local cuisine.",
      image: "/images/unsplash/kerala.jpg",
      category: "beach",
      isWeekend: true,
      prompt: "Show me a detailed 4-day itinerary for Kerala backwaters, Kochi fort, and Varkala cliff",
      href: "/india/kerala",
    },
    {
      id: "himachal-6d",
      title: "Himachal Winter Escape",
      daysBadge: "6 days",
      daysCount: 6,
      subtitle: "Shimla, Kufri, Manali",
      tagsText: "Mountains • Snow • Adventure",
      snippet:
        "Enjoy snow-covered landscapes, charming hill stations and winter adventures.",
      image: "/images/destinations/shimla.jpg",
      category: "mountain",
      prompt: "Show me a 6-day winter holiday itinerary for Shimla, Kufri and Manali snow resorts",
      href: "/india/himachal-pradesh",
    },
    {
      id: "goa-6d",
      title: "Goa Sun, Sand & Culture",
      daysBadge: "6 days",
      daysCount: 6,
      subtitle: "North Goa, South Goa",
      tagsText: "Beaches • Food • Nightlife",
      snippet:
        "Relax on golden beaches, explore Portuguese heritage and enjoy the vibrant Goan culture.",
      image: "/images/cinematic/dest-goa.jpg",
      category: "beach",
      prompt: "Show me a 6-day itinerary for Goa covering South Goa quiet beaches and North Goa nightlife",
      href: "/india/goa",
    },
    {
      id: "ladakh-7d",
      title: "Ladakh Adventure",
      daysBadge: "7 days",
      daysCount: 7,
      subtitle: "Leh, Nubra Valley, Pangong Lake",
      tagsText: "Mountains • Adventure • Culture",
      snippet:
        "Experience high-altitude landscapes, ancient monasteries and stunning blue lakes.",
      image: "/images/destinations/ladakh.jpg",
      category: "mountain",
      prompt: "Show me a complete 7-day road trip itinerary for Ladakh with Nubra and Pangong Lake",
      href: "/india/ladakh",
    },
    {
      id: "varanasi-4d",
      title: "Spiritual Varanasi",
      daysBadge: "4 days",
      daysCount: 4,
      subtitle: "Varanasi, Sarnath",
      tagsText: "Spirituality • Culture • Heritage",
      snippet:
        "Discover ancient temples, experience the Ganga aarti and explore Buddhist heritage.",
      image: "/images/cinematic/dest-varanasi.jpg",
      category: "spiritual",
      isWeekend: true,
      prompt: "Show me a 4-day spiritual and cultural itinerary for Varanasi and Sarnath",
      href: "/india/uttar-pradesh",
    },
    {
      id: "corbett-5d",
      title: "Jim Corbett Wildlife Tour",
      daysBadge: "5 days",
      daysCount: 5,
      subtitle: "Ramnagar, Corbett National Park",
      tagsText: "Wildlife • Nature • Adventure",
      snippet:
        "Spot tigers, explore forest trails and experience the rich biodiversity of Uttarakhand.",
      image: "/images/destinations/wildlife.jpg",
      category: "wildlife",
      prompt: "Show me a 5-day Jim Corbett wildlife safari itinerary with river lodge stay",
      href: "/chat?q=5-day+Jim+Corbett+wildlife+safari+itinerary",
    },
    {
      id: "kasol-3d",
      title: "Weekend Getaway to Kasol",
      daysBadge: "3 days",
      daysCount: 3,
      subtitle: "Kasol, Kheerganga",
      tagsText: "Mountains • Trekking • Nature",
      snippet:
        "Enjoy riverside cafes, short treks and peaceful mountain views on a perfect weekend trip.",
      image: "/images/destinations/trekking.jpg",
      category: "mountain",
      isWeekend: true,
      prompt: "Show me a 3-day weekend itinerary for Kasol, Manikaran, and Kheerganga trek",
      href: "/india/himachal-pradesh",
    },
  ],
  popularCities: [
    {
      name: "Manali",
      slug: "manali",
      image: "/images/destinations/solang-valley.jpg",
      href: "/india/himachal-pradesh/manali",
      prompt: "Plan a trip to Manali",
    },
    {
      name: "Jaipur",
      slug: "jaipur",
      image: "/images/cinematic/dest-jaipur.jpg",
      href: "/india/rajasthan",
      prompt: "Plan a trip to Jaipur",
    },
    {
      name: "Goa",
      slug: "goa",
      image: "/images/cinematic/dest-goa.jpg",
      href: "/india/goa",
      prompt: "Plan a trip to Goa",
    },
    {
      name: "Kerala",
      slug: "kerala",
      image: "/images/unsplash/kerala.jpg",
      href: "/india/kerala",
      prompt: "Plan a trip to Kerala",
    },
    {
      name: "Rishikesh",
      slug: "rishikesh",
      image: "/images/destinations/rishikesh.jpg",
      href: "/chat?q=Plan+a+trip+to+Rishikesh",
      prompt: "Plan a trip to Rishikesh",
    },
  ],
  startingCities: [
    "New Delhi",
    "Mumbai",
    "Bangalore",
    "Kolkata",
    "Chennai",
    "Hyderabad",
    "Chandigarh",
    "Kochi",
    "Ahmedabad",
    "Pune",
  ],
};
