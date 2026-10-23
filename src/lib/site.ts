/** Site-wide settings. Social profiles render only once a real URL is set. */
export const site = {
  name: "VacayOut",
  tagline: "Discover India. Your Way.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://vacayout.in",
  social: {
    instagram: "",
    youtube: "",
    facebook: "",
    x: "",
  },
} as const;
