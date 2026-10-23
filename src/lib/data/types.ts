/**
 * Shapes for the VacayOut homepage. Everything that names a destination comes
 * from published places; only section copy and the hero are static.
 */

export type Photo = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Image source or provenance. */
  source: string;
  /** CSS object-position focal point for crops, e.g. "50% 30%". */
  position?: string;
};

export type IconName =
  | "sparkles" | "pin" | "bed" | "shield" | "compass"
  | "heart" | "family" | "mountain" | "temple" | "palm" | "route";

export type ExamplePrompt = { label: string; prompt: string; icon: IconName };

/** A published destination as the homepage shows it. */
export type Destination = {
  slug: string;
  name: string;
  stateSlug: string;
  stateName: string;
  level: "state" | "place";
  /** Place type (town, trek, temple…). */
  kind: string;
  /** Human label for the place type, e.g. "Town". */
  tagline?: string;
  description: string;
  featured?: boolean;
  tripTypes: string[];
  /** ISO date of the current published version. */
  publishedAt: string;
  photo: Photo | null;
  /** True when the image is an AI-generated illustration (always labelled). */
  aiImage?: boolean;
  /** Sample content for design work: there is no guide page to link to. */
  sample?: boolean;
};

export type ZoneGroup = {
  zone: string;
  states: { name: string; slug: string; places: number; photo: Photo | null; sample?: boolean }[];
};

export type TripTypeGroup = {
  key: string;
  label: string;
  icon: string;
  prompt: string;
  places: Destination[];
};

export type Itinerary = {
  destination: Destination;
  days: string[];
};

export type SampleSection = "destinations" | "zones" | "tripTypes" | "featured" | "itineraries" | "guides";

export type ValuePoint = { icon: string; title: string; body: string };

export type SectionCopy = { eyebrow: string; title: string; body: string };

export type HomepageData = {
  hero: { eyebrow: string; title: string; body: string; inputPlaceholder: string; photo: Photo };
  examplePrompts: ExamplePrompt[];
  copy: {
    destinations: SectionCopy;
    zones: SectionCopy;
    tripTypes: SectionCopy;
    planner: SectionCopy & { cta: string; includes: string[]; note: string };
    featured: SectionCopy;
    itineraries: SectionCopy;
    guides: SectionCopy;
    smarter: SectionCopy;
  };
  /** Section 2 — published places (not states). */
  destinations: Destination[];
  /** Section 3 — published states, grouped by zone. */
  zones: ZoneGroup[];
  /** Section 4 — every trip type, with the published places an editor tagged. */
  tripTypes: TripTypeGroup[];
  /** Section 6 — destinations an admin marked as featured. */
  featured: Destination[];
  /** Section 7 — published places with an approved itinerary. */
  itineraries: Itinerary[];
  /** Section 8 — most recently published or updated guides. */
  latestGuides: Destination[];
  /** Section 9 */
  smarter: ValuePoint[];
  /** Whether booking links carry affiliate IDs (drives the disclosure). */
  affiliateLinks: boolean;
  /** Sections currently filled with sample content (see HOMEPAGE_SAMPLE_CONTENT). */
  sampleSections: SampleSection[];
};
