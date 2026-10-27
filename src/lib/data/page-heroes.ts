import type { PageHero } from "@/components/explore/explore-page";

/**
 * Hero photos for the listing pages. Real photographs from Wikimedia Commons,
 * licence checked (CC BY-SA 4.0) and credited as the licence requires. Files
 * are 1920px renditions in public/images/licensed/.
 */
const BY_SA_4 = { license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" };

export const PAGE_HEROES = {
  exploreIndia: {
    src: "/images/licensed/udaipur-city-palace-lake-pichola.jpg",
    alt: "City Palace and Mohan Temple seen across Lake Pichola in Udaipur, Rajasthan",
    caption: "Lake Pichola, Udaipur, Rajasthan",
    credit: "Jakub Hałun / Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:20191207_City_Palace,_Mohan_Temple_and_Lake_Pichola,_Udaipur,_1523_7262.jpg",
    ...BY_SA_4,
  },
  thingsToDo: {
    src: "/images/licensed/dal-lake-srinagar.jpg",
    alt: "Houseboats moored on Dal Lake in Srinagar, Jammu and Kashmir",
    caption: "Dal Lake, Srinagar, Jammu and Kashmir",
    credit: "Dashrathgoyal85 / Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Dal_Lake,_Srinagar,_Jammu_and_Kashmir.jpg",
    ...BY_SA_4,
  },
  travelGuides: {
    src: "/images/licensed/solang-valley-manali.jpg",
    alt: "Snow-capped peaks above the meadows of Solang Valley near Manali, Himachal Pradesh",
    caption: "Solang Valley, Manali, Himachal Pradesh",
    credit: "Harvinder Chandigarh / Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Solang_Valley_,Manali,_Himachal_Pardes,_India.JPG",
    ...BY_SA_4,
  },
  itineraries: {
    src: "/images/licensed/kerala-backwaters-houseboat.jpg",
    alt: "A traditional houseboat moored on the backwaters at Nedumudy, Kerala",
    caption: "Backwaters near Alappuzha, Kerala",
    credit: "Ingo Mehling / Wikimedia Commons",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Nedumudy_-_Houseboat.jpg",
    ...BY_SA_4,
  },
} satisfies Record<string, PageHero>;
