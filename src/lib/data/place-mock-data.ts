import type { Name } from "@/components/icons/icon";

export type MonthStatus = "best" | "good" | "not_ideal";

export interface DestinationFeature {
  title: string;
  subtitle: string;
  icon: Name;
}

export interface PlaceCardItem {
  id: string;
  name: string;
  tag: string;
  image: string;
  href?: string;
  prompt?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface QuickFactItem {
  label: string;
  value: string;
  icon: Name;
}

export interface DestinationPageData {
  name: string;
  slug: string;
  stateSlug: string;
  stateName: string;
  badge: string;
  subtitle: string;
  locationLabel: string;
  typeLabel: string;
  ratingText: string;
  heroImage: string;
  photoCredit: {
    photographer: string;
    source: string;
    url: string;
  };
  overview: {
    description: string;
    features: DestinationFeature[];
  };
  topPlaces: {
    title: string;
    items: PlaceCardItem[];
  };
  itinerary: {
    heading: string;
    days: { dayNumber: number; text: string }[];
    image: string;
    prompt: string;
  };
  bestTime: {
    months: { name: string; status: MonthStatus }[];
  };
  faqs: FaqItem[];
  quickFacts: QuickFactItem[];
  travelTips: string[];
  bookingLinks: {
    title: string;
    subtitle?: string;
    actionLabel: string;
    icon: Name;
    href: string;
  }[];
}

export interface StatePageData {
  name: string;
  slug: string;
  badge: string;
  subtitle: string;
  regionLabel: string;
  tagsLabel: string;
  popularForLabel: string;
  heroImage: string;
  photoCredit: {
    photographer: string;
    source: string;
    url: string;
  };
  about: {
    description: string;
    features: DestinationFeature[];
  };
  popularDestinations: {
    title: string;
    count: number;
    items: {
      name: string;
      state: string;
      slug: string;
      image: string;
      href: string;
    }[];
  };
  travelTypes: {
    title: string;
    icon: Name;
    prompt: string;
  }[];
  quickFacts: QuickFactItem[];
  planYourTrip: {
    title: string;
    description: string;
    href: string;
    icon: Name;
  }[];
  relatedStates: {
    name: string;
    region: string;
    slug: string;
    image: string;
    href: string;
  }[];
}

export const MANALI_MOCK_DATA: DestinationPageData = {
  name: "Manali",
  slug: "manali",
  stateSlug: "himachal-pradesh",
  stateName: "Himachal Pradesh",
  badge: "Mountain Town",
  subtitle: "Snowy peaks, pine forests and a perfect blend of adventure and peace.",
  locationLabel: "Himachal Pradesh",
  typeLabel: "Hill Station",
  ratingText: "4.6 (based on traveller reviews)",
  heroImage: "/images/destinations/manali-hero.jpg",
  photoCredit: {
    photographer: "Saurabh Sood",
    source: "Unsplash",
    url: "https://unsplash.com",
  },
  overview: {
    description:
      "Manali is a charming hill station in Himachal Pradesh, known for its snow-capped mountains, lush valleys and adventure activities. Whether you're looking for a peaceful getaway or an adrenaline rush, Manali has something for everyone. From scenic treks and river rafting to ancient temples and local markets, this destination offers a perfect mix of nature, culture and adventure.",
    features: [
      {
        title: "Mountain Ranges",
        subtitle: "The majestic Himalayas",
        icon: "mountain",
      },
      {
        title: "Best time to visit",
        subtitle: "March to June, September to November",
        icon: "calendar",
      },
      {
        title: "Nearest airport",
        subtitle: "Bhuntar (50 km)",
        icon: "plane",
      },
      {
        title: "Nearest railway station",
        subtitle: "Joginder Nagar (145 km)",
        icon: "train",
      },
    ],
  },
  topPlaces: {
    title: "Top Places to Visit",
    items: [
      {
        id: "solang-valley",
        name: "Solang Valley",
        tag: "Adventure, Snow Activities",
        image: "/images/destinations/solang-valley.jpg",
        prompt: "Tell me about adventure sports and things to do in Solang Valley near Manali",
      },
      {
        id: "hidimba-temple",
        name: "Hidimba Temple",
        tag: "Temple, Culture",
        image: "/images/destinations/hidimba-temple.jpg",
        prompt: "Tell me about history, architecture and visiting timings of Hidimba Temple in Manali",
      },
      {
        id: "old-manali",
        name: "Old Manali",
        tag: "Cafes, Shopping",
        image: "/images/destinations/old-manali.jpg",
        prompt: "What are the best bohemian cafes and live music spots in Old Manali?",
      },
      {
        id: "rohtang-pass",
        name: "Rohtang Pass",
        tag: "Snow, Scenic Views",
        image: "/images/destinations/rohtang-pass.jpg",
        prompt: "How to visit Rohtang Pass, permit requirements and best time for snow?",
      },
    ],
  },
  itinerary: {
    heading: "3 Days in Manali",
    days: [
      {
        dayNumber: 1,
        text: "Arrive in Manali, explore Mall Road, Hadimba Temple",
      },
      {
        dayNumber: 2,
        text: "Solang Valley (adventure activities), local sightseeing",
      },
      {
        dayNumber: 3,
        text: "Rohtang Pass (optional), return",
      },
    ],
    image: "/images/destinations/manali-hero.jpg",
    prompt: "Plan a detailed 3-day itinerary for Manali covering Mall Road, Solang, and Rohtang Pass",
  },
  bestTime: {
    months: [
      { name: "Jan", status: "best" },
      { name: "Feb", status: "good" },
      { name: "Mar", status: "best" },
      { name: "Apr", status: "best" },
      { name: "May", status: "best" },
      { name: "Jun", status: "best" },
      { name: "Jul", status: "not_ideal" },
      { name: "Aug", status: "not_ideal" },
      { name: "Sep", status: "not_ideal" },
      { name: "Oct", status: "best" },
      { name: "Nov", status: "best" },
      { name: "Dec", status: "best" },
    ],
  },
  faqs: [
    {
      question: "Is Manali safe for solo travellers?",
      answer:
        "Yes, Manali is widely regarded as one of the safest destinations in India for solo travellers, including female solo travellers. The local community is hospitable, and tourist transit, homestays, and cafes are very welcoming.",
    },
    {
      question: "What are the main adventure activities in Manali?",
      answer:
        "Top activities include paragliding, zorbing, skiing, and quad biking in Solang Valley, white-water river rafting along the Beas River, and trekking routes such as Hampta Pass and Bhrigu Lake.",
    },
    {
      question: "How many days are enough for Manali?",
      answer:
        "3 to 4 days are ideal to experience the main highlights: Mall Road, Hadimba Temple, Old Manali's cafes, an adventure day in Solang Valley, and an excursion to Rohtang Pass or Naggar Castle.",
    },
    {
      question: "Can I visit Manali in November?",
      answer:
        "Yes, November is a scenic month with crisp autumn sunshine, clear mountain views, fewer crowds, and the earliest dusting of winter snow on Rohtang Pass.",
    },
  ],
  quickFacts: [
    { label: "Location", value: "Himachal Pradesh", icon: "pin" },
    { label: "Elevation", value: "2,050 m (approx.)", icon: "mountain" },
    { label: "Language", value: "Hindi, English", icon: "chat" },
    { label: "Currency", value: "Indian Rupee (INR)", icon: "coins" },
  ],
  travelTips: [
    "Carry warm clothes, even in summer.",
    "Book adventure activities in advance.",
    "Keep some cash for local markets.",
    "Respect local culture and environment.",
  ],
  bookingLinks: [
    {
      title: "Hotels in Manali",
      actionLabel: "View options →",
      icon: "hotel",
      href: "/chat?q=Show+me+the+best+hotels+and+mountain+stays+in+Manali",
    },
    {
      title: "Flights to Bhuntar",
      actionLabel: "Check prices →",
      icon: "plane",
      href: "/chat?q=How+to+book+flights+to+Bhuntar+Kullu+Manali+airport",
    },
    {
      title: "Activities & Tours",
      actionLabel: "Book now →",
      icon: "compass",
      href: "/chat?q=Find+adventure+activities+and+guided+tours+in+Manali",
    },
  ],
};

export const HIMACHAL_PRADESH_MOCK_DATA: StatePageData = {
  name: "Himachal Pradesh",
  slug: "himachal-pradesh",
  badge: "State",
  subtitle: "Snowy mountains, charming hill towns, and endless adventure await in India's most loved hill state.",
  regionLabel: "North India",
  tagsLabel: "Hill Stations, Adventure, Nature",
  popularForLabel: "Popular for: Mountains, Trekking, Scenic Beauty",
  heroImage: "/images/destinations/himachal-hero.jpg",
  photoCredit: {
    photographer: "Saurabh Sood",
    source: "Unsplash",
    url: "https://unsplash.com",
  },
  about: {
    description:
      "Himachal Pradesh is a dream destination for nature lovers, adventure seekers and those looking for a peaceful escape. From snow-capped mountains and lush valleys to charming hill towns and ancient temples, the state offers a perfect mix of natural beauty, culture and adventure. Whether you're trekking in the Himalayas, exploring colonial towns or simply soaking in the fresh mountain air, Himachal has something for everyone.",
    features: [
      {
        title: "Mountain Ranges",
        subtitle: "The majestic Himalayas",
        icon: "mountain",
      },
      {
        title: "Hill Towns",
        subtitle: "Shimla, Manali, Dharamshala...",
        icon: "palace",
      },
      {
        title: "Adventure",
        subtitle: "Trekking, skiing, paragliding...",
        icon: "route",
      },
      {
        title: "Culture & Heritage",
        subtitle: "Temples, monasteries, local tribes",
        icon: "temple",
      },
    ],
  },
  popularDestinations: {
    title: "Popular Destinations",
    count: 18,
    items: [
      {
        name: "Manali",
        state: "Himachal Pradesh",
        slug: "manali",
        image: "/images/destinations/solang-valley.jpg",
        href: "/india/himachal-pradesh/manali",
      },
      {
        name: "Shimla",
        state: "Himachal Pradesh",
        slug: "shimla",
        image: "/images/destinations/shimla.jpg",
        href: "/india/himachal-pradesh/shimla",
      },
      {
        name: "Dharamshala",
        state: "Himachal Pradesh",
        slug: "dharamshala",
        image: "/images/destinations/dharamshala.jpg",
        href: "/india/himachal-pradesh/dharamshala",
      },
      {
        name: "Dalhousie",
        state: "Himachal Pradesh",
        slug: "dalhousie",
        image: "/images/destinations/dalhousie.jpg",
        href: "/india/himachal-pradesh/dalhousie",
      },
    ],
  },
  travelTypes: [
    { title: "Hill Stations", icon: "mountain", prompt: "Suggest the best hill stations in Himachal Pradesh" },
    { title: "Trekking", icon: "route", prompt: "What are the most scenic Himalayan treks in Himachal Pradesh?" },
    { title: "Temples", icon: "temple", prompt: "Tell me about sacred ancient temples and monasteries in Himachal" },
    { title: "Adventure", icon: "compass", prompt: "What adventure sports can I experience in Himachal Pradesh?" },
    { title: "Nature", icon: "palm", prompt: "Suggest tranquil pine forests and quiet mountain valleys in Himachal" },
    { title: "Wildlife", icon: "paw", prompt: "Tell me about Great Himalayan National Park and wildlife in Himachal" },
  ],
  quickFacts: [
    { label: "Capital", value: "Shimla", icon: "palace" },
    { label: "Major Cities", value: "Shimla, Manali, Dharamshala", icon: "grid" },
    { label: "Best Time", value: "Mar – Jun, Sep – Nov", icon: "calendar" },
    { label: "Language", value: "Hindi, English", icon: "chat" },
    { label: "Currency", value: "Indian Rupee (INR)", icon: "coins" },
  ],
  planYourTrip: [
    {
      title: "Top Destinations",
      description: "Explore popular places in Himachal Pradesh",
      href: "#destinations",
      icon: "map",
    },
    {
      title: "Travel Itineraries",
      description: "Ready-made trips for every duration",
      href: "/#itineraries",
      icon: "fileText",
    },
    {
      title: "Travel Guides",
      description: "Tips, articles and useful information",
      href: "/#guides",
      icon: "book",
    },
  ],
  relatedStates: [
    {
      name: "Jammu & Kashmir",
      region: "North India",
      slug: "jammu-and-kashmir",
      image: "/images/destinations/ladakh.jpg",
      href: "/india/jammu-and-kashmir",
    },
    {
      name: "Uttarakhand",
      region: "North India",
      slug: "uttarakhand",
      image: "/images/destinations/rishikesh.jpg",
      href: "/india/uttarakhand",
    },
    {
      name: "Ladakh",
      region: "North India",
      slug: "ladakh",
      image: "/images/destinations/spiti.jpg",
      href: "/india/ladakh",
    },
  ],
};

/**
 * Returns mock destination data for any state/place requested.
 */
export function getDestinationMockData(stateSlug: string, placeSlug: string): DestinationPageData {
  if (placeSlug.toLowerCase() === "manali") {
    return MANALI_MOCK_DATA;
  }

  // Format capitalized names
  const placeName = placeSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const stateName = stateSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    ...MANALI_MOCK_DATA,
    name: placeName,
    slug: placeSlug,
    stateSlug,
    stateName,
    subtitle: `Discover unforgettable viewpoints, heritage and local culture in ${placeName}.`,
    locationLabel: stateName,
    overview: {
      description: `${placeName} is one of the most beloved travel destinations in ${stateName}, offering a blend of natural beauty, authentic local lifestyle and memorable sights.`,
      features: MANALI_MOCK_DATA.overview.features,
    },
  };
}

/**
 * Returns mock state data for any state requested.
 */
export function getStateMockData(stateSlug: string): StatePageData {
  if (stateSlug.toLowerCase() === "himachal-pradesh") {
    return HIMACHAL_PRADESH_MOCK_DATA;
  }

  const stateName = stateSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    ...HIMACHAL_PRADESH_MOCK_DATA,
    name: stateName,
    slug: stateSlug,
    subtitle: `Explore rich culture, scenic landscapes and iconic destinations across ${stateName}.`,
    about: {
      description: `${stateName} offers travellers a diverse mix of landscapes, rich cultural traditions, and warm hospitality.`,
      features: HIMACHAL_PRADESH_MOCK_DATA.about.features,
    },
  };
}
