import type { IconName } from "@/lib/data/types";
type PlanIcon =
  | "palace" | "waves" | "palette" | "bag" | "plane" | "train" | "car" | "bus"
  | "hotel" | "ticket";

export type Name =
  | IconName
  | PlanIcon
  | UiIcon
  | "search"
  | "arrowRight"
  | "checkCircle"
  | "menu"
  | "logoMountains"
  | "instagram"
  | "youtube"
  | "facebook"
  | "x"
  | "linkedin"
  | "send"
  | "award"
  | "camera"
  | "book"
  | "fileText"
  | "paw"
  | "dollarSign";

type UiIcon =
  | "arrowLeft" | "chevronDown" | "user" | "calendar" | "clock" | "sun" | "coins" | "bulb"
  | "utensils" | "help" | "chat" | "image" | "star" | "grid" | "map" | "maximize";

const paths: Record<Name, React.ReactNode> = {
  palace: <path d="M3.5 21V10.5l4-3 4.5 3 4.5-3 4 3V21M3.5 21h17M10 21v-4.5a2 2 0 0 1 4 0V21M7.5 7.5V4.5M16.5 7.5V4.5M12 10.5V6" />,
  waves: <path d="M3 9.5c3-2.2 6 2.2 9 0s6-2.2 9 0M3 14.5c3-2.2 6 2.2 9 0s6-2.2 9 0M3 19.5c3-2.2 6 2.2 9 0s6-2.2 9 0" />,
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.6 0-1.5-1.5-1.5-1.5-3 0-1 .8-1.6 1.8-1.6H16a5 5 0 0 0 5-5C21 6.6 17 3 12 3Z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" />
      <circle cx="10" cy="7" r="1" fill="currentColor" />
      <circle cx="15" cy="7.5" r="1" fill="currentColor" />
    </>
  ),
  bag: <path d="M5 8h14l-1.2 12.5H6.2ZM9 8V6.5a3 3 0 0 1 6 0V8" />,
  plane: <path d="M21 4.5c-.8-.8-2.2-.6-3 .2l-3.5 3.6-8-2.3-1.8 1.8 6.5 3.9-3.2 3.3-2.6-.4L4 16l3.5 1.5L9 21l1.4-1.4-.4-2.6 3.3-3.2 3.9 6.5 1.8-1.8-2.3-8 3.6-3.5c.8-.8 1-2.2.2-3Z" />,
  train: (
    <>
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M5 10.5h14M8.5 21l1.5-4M15.5 21 14 17" />
      <circle cx="8.8" cy="13.8" r="0.7" fill="currentColor" />
      <circle cx="15.2" cy="13.8" r="0.7" fill="currentColor" />
    </>
  ),
  car: (
    <>
      <path d="M3 16.5V12l2-5.5h14l2 5.5v4.5ZM3 12h18" />
      <path d="M5.5 16.5V19M18.5 16.5V19" />
      <circle cx="7.5" cy="14.3" r="0.8" fill="currentColor" />
      <circle cx="16.5" cy="14.3" r="0.8" fill="currentColor" />
    </>
  ),
  bus: (
    <>
      <rect x="4.5" y="3.5" width="15" height="14" rx="2.5" />
      <path d="M4.5 11h15M7.5 17.5V20M16.5 17.5V20M8 3.5v7.5M16 3.5v7.5" />
    </>
  ),
  hotel: <path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5V21M14 10h4.5A1.5 1.5 0 0 1 20 11.5V21M2.5 21h19M7.5 8h3M7.5 12h3M7.5 16h3M16.5 14h1M16.5 17.5h1" />,
  ticket: <path d="M3.5 7.5h17v3a2 2 0 0 0 0 3v3h-17v-3a2 2 0 0 0 0-3ZM14 7.5v1.5M14 11.2v1.6M14 15v1.5" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  coins: <path d="M4.5 7c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3-3.4-3-7.5-3-7.5 1.3-7.5 3ZM4.5 7v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V7M4.5 12v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5" />,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1v.1h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3Z" />,
  utensils: <path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17.5 21V3c-2.3 1-3.5 4-3.5 7.5h3.5" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.2-1 .7-1 1.3v.6M12 17h.01" />
    </>
  ),
  chat: <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1.3-4.8A8.5 8.5 0 1 1 21 11.5Z" />,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m20.5 15.5-4.5-4.5-9 8.5" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" fill="currentColor" />,
  grid: <path d="M4 4h6.5v6.5H4ZM13.5 4H20v6.5h-6.5ZM4 13.5h6.5V20H4ZM13.5 13.5H20V20h-6.5Z" />,
  map: <path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2ZM9 4.5v13M15 6.5v13" />,
  maximize: <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />,
  sparkles: (
    <>
      <path d="M12 3.5 13.9 8.6 19 10.5 13.9 12.4 12 17.5 10.1 12.4 5 10.5 10.1 8.6Z" />
      <path d="M19 3v3.5M17.25 4.75h3.5M5 17v3M3.5 18.5h3" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  bed: <path d="M3 19v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8M3 15h18M6 9V6.5A1.5 1.5 0 0 1 7.5 5h9A1.5 1.5 0 0 1 18 6.5V9M3 19v1.5M21 19v1.5" />,
  shield: (
    <>
      <path d="M12 3 19 6v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6Z" />
      <path d="m9 12 2.2 2.2L15.2 10" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1Z" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />,
  family: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9.5" r="2.3" />
      <path d="M15.6 14.4A4.5 4.5 0 0 1 21 18.8" />
    </>
  ),
  mountain: <path d="m3 19 6.2-10 3.8 6 2.3-3.4L21 19Z" />,
  temple: <path d="M12 3.5 14 6.5h-4ZM8.5 9h7M7.5 20V9h9v11M4.5 20h15M10.5 20v-4.5h3V20" />,
  palm: <path d="M12 21v-9M12 12c-1.2-3.6-4.6-4.8-8-3.8 3.2.3 5.6 1.8 8 3.8ZM12 12c1.2-3.6 4.6-4.8 8-3.8-3.2.3-5.6 1.8-8 3.8ZM12 12c.3-3.8-1.6-6.6-4.6-7.8 1.9 1.9 3.6 4.2 4.6 7.8ZM12 12c-.3-3.8 1.6-6.6 4.6-7.8-1.9 1.9-3.6 4.2-4.6 7.8Z" />,
  route: (
    <>
      <rect x="4" y="8" width="16" height="11" rx="2" />
      <path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 13h16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  logoMountains: <path d="M2 19 9.5 8l4 5.5L16.5 9 22 19M7.2 11.4l2.3 1.8 1.6-1.4" />,
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="m10.5 9.5 4.5 2.5-4.5 2.5Z" fill="currentColor" />
    </>
  ),
  facebook: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M13.5 21v-7h2.4l.4-2.8h-2.8V9.5c0-.8.3-1.4 1.4-1.4h1.5V5.6c-.3 0-1.2-.1-2.2-.1-2.2 0-3.6 1.3-3.6 3.7v2h-2.4V14h2.4v7" />
    </>
  ),
  x: <path d="M4.5 4.5 19.5 19.5M19.5 4.5 4.5 19.5" />,
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 11v6M8 8v.01M12 17v-3.5c0-1.4 1-2.5 2.5-2.5s2.5 1.1 2.5 2.5V17M12 11v6" />
    </>
  ),
  send: (
    <path d="m21.5 2.5-19 9 7.5 2.5 2.5 7.5 9-19Z M10 14l11.5-11.5" />
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="m8.5 14.5-2.5 6.5 6-3 6 3-2.5-6.5" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5a2 2 0 0 1 2-2h2.5l1.5-2h4l1.5 2H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v16.5H6.5a2.5 2.5 0 0 0-2.5 2.5v.5h16" />
    </>
  ),
  fileText: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </>
  ),
  paw: (
    <>
      <circle cx="12" cy="15.5" r="3.5" />
      <circle cx="7" cy="10" r="2" />
      <circle cx="17" cy="10" r="2" />
      <circle cx="10" cy="5.5" r="1.8" />
      <circle cx="14" cy="5.5" r="1.8" />
    </>
  ),
  dollarSign: (
    <>
      <path d="M12 2v20M17 6.5A4.5 4.5 0 0 0 12 4.5c-3 0-5 1.8-5 4 0 3 4 3.8 6 4.5 3 .8 5 2.2 5 4.5 0 2.5-2.2 4.5-6 4.5a6 6 0 0 1-5-2" />
    </>
  ),
};

export function Icon({ name, size = 20, className = "", strokeWidth = 1.7 }: { name: Name; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
