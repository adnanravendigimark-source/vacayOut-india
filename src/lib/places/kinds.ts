/** Human labels for place types, shown on public pages and cards. */
export const KIND_LABEL: Record<string, string> = {
  state: "State",
  region: "Region",
  city: "City",
  town: "Town",
  attraction: "Attraction",
  temple: "Temple",
  lake: "Lake",
  viewpoint: "Viewpoint",
  trek: "Trek",
  activity: "Activity",
  nature: "Nature",
  museum: "Museum",
};

export const kindLabel = (kind: string) => KIND_LABEL[kind] ?? kind;
