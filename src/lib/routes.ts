/**
 * Single place that decides public URLs. The final URL scheme is still an
 * open decision; changing it should only require editing this file.
 */
type Placeable = { slug: string; stateSlug: string; level: "state" | "place" };

export const routes = {
  home: "/",
  destinations: "/india",
  thingsToDo: "/things-to-do",
  travelGuides: "/travel-guides",
  itineraries: "/itineraries",
  about: "/about",
  destination: (d: Placeable) =>
    d.level === "state" ? `/india/${d.stateSlug}` : `/india/${d.stateSlug}/${d.slug}`,
  state: (slug: string) => `/india/${slug}`,
  chat: "/chat",
  chatThread: (id: string) => `/chat/${id}`,
  chatWithPrompt: (prompt: string) => `/chat?q=${encodeURIComponent(prompt)}`,
};
