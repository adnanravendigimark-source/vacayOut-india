/** The fixed questions for the chat eval. `expect` is the format a good answer must have. */
export type Expect = "compare" | "itinerary" | "best_time" | "reach" | "budget" | "out_of_scope" | "greeting";
export const QUESTIONS: { q: string; expect: Expect }[] = [
  { q: "Manali or Shimla for a family trip in December?", expect: "compare" },
  { q: "Compare Goa and Kerala for a 5-day beach holiday in January", expect: "compare" },
  { q: "Kedarkantha vs Brahmatal trek for a first-time trekker", expect: "compare" },
  { q: "Plan 3 days in Jaipur", expect: "itinerary" },
  { q: "5-day Kerala itinerary for a couple in October", expect: "itinerary" },
  { q: "Plan a 7-day Rajasthan trip with my parents", expect: "itinerary" },
  { q: "Best time to visit Ladakh", expect: "best_time" },
  { q: "Is August a good time to visit Coorg?", expect: "best_time" },
  { q: "How do I reach Munnar from Kochi?", expect: "reach" },
  { q: "How to get to Spiti Valley from Delhi?", expect: "reach" },
  { q: "Budget for 4 days in Goa for two people", expect: "budget" },
  { q: "How much does a week in Himachal cost on a backpacker budget?", expect: "budget" },
  { q: "Write a Python function to sort a list", expect: "out_of_scope" },
  { q: "Plan 5 days in Bali", expect: "out_of_scope" },
  { q: "Hello!", expect: "greeting" },
];
