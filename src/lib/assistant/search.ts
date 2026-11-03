import type { LocalAnswer, Note, Pack } from "./types";

/**
 * Plain-code question answering over a page's notes: no AI, runs in the browser.
 * 1. Spot the intent (when to go, how to reach, cost…) from keywords, including
 *    common Hinglish, and boost the sections that answer it.
 * 2. Score every note with BM25 plus light fuzzy matching (typos, plurals).
 */

const STOP = new Set(
  "a an the is are was were be to of in on at for from by with and or but if then than so do does did can could should would will i me my we our you your it its this that these those there here what which who whom when where why how any some much many about into over near more most very just also please tell know want need get go going visit trip place try like good best hai hain ka ki ke ko se me mein kya kaun kaise kab kahan".split(" "),
);

/** Intent → keywords (stems/prefixes) and the topics that answer it. */
const INTENTS: { words: string[]; topics: string[] }[] = [
  { words: ["best time", "when", "season", "weather", "month", "snow", "snowfall", "monsoon", "rain", "winter", "summer", "temperature", "cold", "climate", "kab", "mausam", "barf", "baraf", "thand"], topics: ["best_time", "key_facts"] },
  { words: ["reach", "get there", "airport", "flight", "fly", "train", "railway", "station", "bus", "volvo", "road", "drive", "driving", "distance", "far", "from delhi", "km", "pahunch", "kaise jaye"], topics: ["how_to_reach", "key_facts"] },
  { words: ["taxi", "cab", "get around", "local transport", "auto", "rickshaw", "rent", "bike", "scooty", "walk", "parking"], topics: ["local_transport"] },
  { words: ["cost", "price", "fee", "fees", "budget", "charge", "ticket", "entry", "how much", "expensive", "cheap", "money", "rupee", "inr", "kharcha", "kitna", "paisa", "rate", "tax"], topics: ["budget", "visit_info", "practical_info"] },
  { words: ["permit", "permission", "pass", "green tax", "inner line", "ilp", "document", "id proof", "visa"], topics: ["practical_info", "budget", "faqs", "visit_info"] },
  { words: ["stay", "hotel", "homestay", "hostel", "where to stay", "accommodation", "area", "base", "night", "rukna", "resort"], topics: ["where_to_stay", "neighbourhoods"] },
  { words: ["food", "eat", "dish", "restaurant", "cafe", "café", "khana", "veg", "non veg", "breakfast", "dinner", "cuisine", "trout", "drink"], topics: ["food"] },
  { words: ["shop", "shopping", "buy", "market", "souvenir", "shawl", "bazaar", "kharid"], topics: ["shopping"] },
  { words: ["atm", "cash", "upi", "card", "network", "sim", "internet", "wifi", "language"], topics: ["practical_info"] },
  { words: ["safe", "safety", "danger", "emergency", "hospital", "doctor", "police", "sick", "altitude sickness", "women", "solo female", "scam", "landslide"], topics: ["safety_health", "practical_info"] },
  { words: ["things to do", "activities", "activity", "do", "see", "attractions", "places", "sightseeing", "adventure", "paragliding", "trek", "trekking", "ski", "skiing", "rafting", "ghumne", "ghoomne", "dekhne", "famous", "must"], topics: ["activity", "attraction", "things_to_do", "highlights"] },
  { words: ["days", "itinerary", "plan", "how many days", "weekend", "schedule", "din"], topics: ["itinerary"] },
  { words: ["kids", "family", "families", "children", "child", "couple", "honeymoon", "solo", "friends", "elderly", "senior", "first time"], topics: ["who_its_for", "accessibility"] },
  { words: ["wheelchair", "accessible", "accessibility", "stairs", "steps", "elderly", "senior", "altitude"], topics: ["accessibility"] },
  { words: ["etiquette", "dress", "culture", "custom", "rules", "photography", "respect"], topics: ["culture_etiquette"] },
  { words: ["nearby", "near", "around", "day trip", "excursion", "close to"], topics: ["nearby", "attraction"] },
  { words: ["timing", "timings", "open", "opening", "close", "closing", "hours", "closed", "time"], topics: ["visit_info", "practical_info"] },
  { words: ["tip", "tips", "mistake", "mistakes", "avoid", "advice", "pack", "packing", "carry", "wear"], topics: ["travel_tips", "common_mistakes", "practical_info"] },
  { words: ["region", "regions", "districts", "valleys"], topics: ["regions"] },
  { words: ["guide", "article", "read"], topics: ["guide"] },
];

export function normalize(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9₹\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(w: string) {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
}

/** Edit distance ≤ 1 (substitution, insertion or deletion). */
function nearlyEqual(a: string, b: string) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 5) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Topics the question is about, from intent keywords. */
export function intentTopics(question: string): Set<string> {
  const q = ` ${normalize(question)} `;
  const out = new Set<string>();
  for (const intent of INTENTS) {
    if (intent.words.some((w) => q.includes(` ${w} `) || (w.length > 4 && q.includes(` ${w}`)))) intent.topics.forEach((t) => out.add(t));
  }
  return out;
}

type Indexed = { note: Note; terms: Map<string, number>; length: number };
const cache = new WeakMap<Pack, { docs: Indexed[]; df: Map<string, number>; avg: number }>();

function index(pack: Pack) {
  const hit = cache.get(pack);
  if (hit) return hit;
  const df = new Map<string, number>();
  const docs = pack.notes.map((note) => {
    const terms = new Map<string, number>();
    const add = (t: string, w: number) => terms.set(t, (terms.get(t) ?? 0) + w);
    for (const t of tokens(note.text)) add(t, 1);
    for (const t of tokens(note.title ?? "")) add(t, 2);
    for (const t of tokens(note.label)) add(t, 0.5);
    for (const t of terms.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return { note, terms, length: [...terms.values()].reduce((a, b) => a + b, 0) };
  });
  const avg = docs.reduce((a, d) => a + d.length, 0) / Math.max(1, docs.length);
  const built = { docs, df, avg };
  cache.set(pack, built);
  return built;
}

export type Scored = { note: Note; score: number };

/** Visitor words that our content says differently. */
const EXPAND: Record<string, string[]> = { kid: ["family", "famili"], children: ["family", "famili"], child: ["family", "famili"], honeymoon: ["couple"], wife: ["couple"], husband: ["couple"], rain: ["monsoon"], hotel: ["stay"], eat: ["food"], fly: ["air"], flight: ["air"] };

export function search(pack: Pack, question: string, limit = 8): Scored[] {
  const { docs, df, avg } = index(pack);
  const base = tokens(question);
  const qTerms = [...new Set([...base, ...base.flatMap((t) => EXPAND[t] ?? [])])];
  const topics = intentTopics(question);
  const N = docs.length;
  const placeTerms = new Set(tokens(pack.place.name));
  const scored = docs.map((d) => {
    let s = 0;
    for (const qt of qTerms) {
      // The place's own name appears everywhere; it says nothing about which note answers.
      if (placeTerms.has(qt)) continue;
      let tf = d.terms.get(qt) ?? 0;
      let weight = 1;
      if (!tf) {
        for (const [t, n] of d.terms) {
          if ((qt.length >= 4 && t.startsWith(qt)) || nearlyEqual(qt, t)) {
            tf = n;
            weight = 0.7;
            break;
          }
        }
      }
      if (!tf) continue;
      const idf = Math.log(1 + (N - (df.get(qt) ?? 1) + 0.5) / ((df.get(qt) ?? 1) + 0.5));
      s += weight * idf * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (d.length / avg))));
    }
    if (topics.has(d.note.topic)) s += 3;
    // A FAQ whose question shares several words with the visitor's is usually the best answer.
    if (d.note.topic === "faqs" && d.note.title) {
      const ft = new Set(tokens(d.note.title));
      const overlap = qTerms.filter((t) => ft.has(t) && !placeTerms.has(t)).length;
      if (overlap >= 2) s += 1.5 * overlap;
    }
    return { note: d.note, score: s };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

const TOPIC_QUESTION: Record<string, (name: string) => string> = {
  best_time: (n) => `When is the best time to visit ${n}?`,
  how_to_reach: (n) => `How do I reach ${n}?`,
  activity: (n) => `What are the top things to do in ${n}?`,
  itinerary: (n) => `How many days do I need in ${n}?`,
  budget: () => "What fees should I budget for?",
  where_to_stay: (n) => `Where should I stay in ${n}?`,
  food: () => "What local food should I try?",
  safety_health: (n) => `Is ${n} safe? Any tips?`,
};

/** The best answer we can give from the notes alone. */
export function answerLocally(pack: Pack, question: string): LocalAnswer {
  const hits = search(pack, question, 8);
  const topics = Object.entries(TOPIC_QUESTION)
    .filter(([t]) => pack.notes.some((n) => n.topic === t))
    .map(([t, q]) => ({ label: pack.notes.find((n) => n.topic === t)?.label ?? t, question: q(pack.place.name) }))
    .slice(0, 4);
  if (!hits.length || hits[0].score < 1.6) return { confidence: "none", notes: [], topics };
  const top = hits[0];
  // Keep notes close to the best one, preferring its topic, without repeating text.
  const picked: Note[] = [];
  for (const h of hits) {
    if (picked.length >= 3) break;
    const sameTopic = h.note.topic === top.note.topic;
    if (h.score < top.score * (sameTopic ? 0.4 : 0.8)) continue;
    if (picked.some((p) => p.text === h.note.text)) continue;
    picked.push(h.note);
  }
  // Same-topic notes read best in the order the page shows them.
  if (picked.every((n) => n.topic === picked[0].topic)) picked.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  // "High" (answer without AI) only when the question's intent is clear and the best note is
  // about that intent, or when it closely matches one of our FAQs. Anything else (off-topic
  // questions included) goes to the AI, which can say it isn't covered.
  const intents = intentTopics(question);
  const faqOverlap = top.note.topic === "faqs" && top.note.title ? tokens(top.note.title).filter((t) => tokens(question).includes(t)).length : 0;
  const strongFaq = faqOverlap >= 2 && top.score >= 6;
  const onIntent = intents.has(top.note.topic) && top.score >= 4.5;
  const confidence = strongFaq || onIntent ? "high" : "low";
  return { confidence, notes: picked, topics };
}

/** The notes sent to the AI: the best matches, compact. */
export function notesForAi(pack: Pack, question: string, limit = 6): Note[] {
  return search(pack, question, limit).map((s) => s.note);
}
