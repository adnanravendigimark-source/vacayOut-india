/**
 * The 28 states and 8 union territories of India — reference data for the
 * "Create destination" picker only. A state becomes a destination (a row in
 * `places`) the first time an admin creates something in it.
 */
export const INDIA_REGIONS = [
  { name: "Andhra Pradesh", type: "State" },
  { name: "Arunachal Pradesh", type: "State" },
  { name: "Assam", type: "State" },
  { name: "Bihar", type: "State" },
  { name: "Chhattisgarh", type: "State" },
  { name: "Goa", type: "State" },
  { name: "Gujarat", type: "State" },
  { name: "Haryana", type: "State" },
  { name: "Himachal Pradesh", type: "State" },
  { name: "Jharkhand", type: "State" },
  { name: "Karnataka", type: "State" },
  { name: "Kerala", type: "State" },
  { name: "Madhya Pradesh", type: "State" },
  { name: "Maharashtra", type: "State" },
  { name: "Manipur", type: "State" },
  { name: "Meghalaya", type: "State" },
  { name: "Mizoram", type: "State" },
  { name: "Nagaland", type: "State" },
  { name: "Odisha", type: "State" },
  { name: "Punjab", type: "State" },
  { name: "Rajasthan", type: "State" },
  { name: "Sikkim", type: "State" },
  { name: "Tamil Nadu", type: "State" },
  { name: "Telangana", type: "State" },
  { name: "Tripura", type: "State" },
  { name: "Uttar Pradesh", type: "State" },
  { name: "Uttarakhand", type: "State" },
  { name: "West Bengal", type: "State" },
  { name: "Andaman and Nicobar Islands", type: "Union territory" },
  { name: "Chandigarh", type: "Union territory" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", type: "Union territory" },
  { name: "Delhi", type: "Union territory" },
  { name: "Jammu and Kashmir", type: "Union territory" },
  { name: "Ladakh", type: "Union territory" },
  { name: "Lakshadweep", type: "Union territory" },
  { name: "Puducherry", type: "Union territory" },
] as const;

export type RegionName = (typeof INDIA_REGIONS)[number]["name"];

const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^a-z]+/g, " ").trim();
const ALIASES: Record<string, RegionName> = {
  "national capital territory of delhi": "Delhi",
  "nct of delhi": "Delhi",
  "new delhi": "Delhi",
  orissa: "Odisha",
  pondicherry: "Puducherry",
  "andaman and nicobar": "Andaman and Nicobar Islands",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  uttaranchal: "Uttarakhand",
};

/** Matches a free-text state name (e.g. from OpenStreetMap) to the official list. */
export function matchRegion(input: string | null | undefined): RegionName | null {
  if (!input) return null;
  const n = norm(input);
  const hit = INDIA_REGIONS.find((r) => norm(r.name) === n);
  return hit ? hit.name : (ALIASES[n] ?? null);
}

/**
 * Homepage grouping of states and UTs, following the Zonal Councils set up under
 * the States Reorganisation Act (Sikkim joined the North Eastern Council in 2002).
 * The island UTs aren't council members, so they get their own group.
 */
export const ZONES = ["North", "Central", "East", "West", "South", "Northeast", "Islands"] as const;
export type Zone = (typeof ZONES)[number];

export const ZONE_OF = {
  "Haryana": "North", "Himachal Pradesh": "North", "Punjab": "North", "Rajasthan": "North", "Delhi": "North", "Chandigarh": "North", "Jammu and Kashmir": "North", "Ladakh": "North",
  "Chhattisgarh": "Central", "Madhya Pradesh": "Central", "Uttar Pradesh": "Central", "Uttarakhand": "Central",
  "Bihar": "East", "Jharkhand": "East", "Odisha": "East", "West Bengal": "East",
  "Goa": "West", "Gujarat": "West", "Maharashtra": "West", "Dadra and Nagar Haveli and Daman and Diu": "West",
  "Andhra Pradesh": "South", "Karnataka": "South", "Kerala": "South", "Tamil Nadu": "South", "Telangana": "South", "Puducherry": "South",
  "Arunachal Pradesh": "Northeast", "Assam": "Northeast", "Manipur": "Northeast", "Meghalaya": "Northeast", "Mizoram": "Northeast", "Nagaland": "Northeast", "Sikkim": "Northeast", "Tripura": "Northeast",
  "Andaman and Nicobar Islands": "Islands", "Lakshadweep": "Islands",
} as const satisfies Record<RegionName, Zone>;

/** The zone for a state/UT name as stored on a place, or null if it isn't recognised. */
export function zoneOf(stateName: string): Zone | null {
  const r = matchRegion(stateName);
  return r ? ZONE_OF[r] : null;
}
