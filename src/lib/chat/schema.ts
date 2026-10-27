import { z } from "zod";
import { GUIDE_HREF_RE, IMAGE_SRC_RE, MAX_MESSAGE_CHARS, isAllowedBookingUrl } from "./constants";

/**
 * The contract between the travel agent and the chat UI. Every block is validated on the server before it is streamed,
 * so a misbehaving model can never inject arbitrary URLs, HTML or huge payloads.
 */

const shortText = z.string().trim().min(1).max(200);
const longText = z.string().trim().min(1).max(1500);

/** Only our own photos (bundled, or uploaded through the admin). */
export const photoSchema = z.object({
  src: z.string().regex(IMAGE_SRC_RE),
  alt: shortText,
  position: z.string().regex(/^\d{1,3}% \d{1,3}%$/).optional(),
});

/** Booking links may only point at providers we have vetted. */
const bookingUrl = z.string().url().refine(isAllowedBookingUrl, "Booking link host is not on the allowlist");

const monthRating = z.enum(["best", "good", "avoid"]);

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: longText }),
  z.object({
    type: z.literal("destination"),
    name: shortText,
    stateName: shortText,
    tagline: shortText,
    photo: photoSchema,
    days: z.number().int().min(1).max(30).optional(),
    group: shortText.optional(),
    bestTime: shortText.optional(),
    /** Typical seasonal range — never live weather. */
    climate: z.object({ range: shortText, label: shortText }).optional(),
    /** Link to our published guide. */
    href: z.string().regex(GUIDE_HREF_RE).optional(),
    /** Photo credit (required for CC-licensed photos). */
    credit: shortText.optional(),
  }),
  /** Places with coordinates from our published guides. Built by the server. */
  z.object({
    type: z.literal("map"),
    title: shortText,
    points: z
      .array(
        z.object({
          name: shortText,
          lat: z.number().min(6).max(38),
          lng: z.number().min(68).max(98),
          href: z.string().regex(GUIDE_HREF_RE).optional(),
          primary: z.boolean().optional(),
        }),
      )
      .min(1)
      .max(30),
  }),
  /** Server-written notices: coverage ("not in our guides yet"), paused research, limits. */
  z.object({ type: z.literal("notice"), tone: z.enum(["info", "warning"]), text: longText }),
  /** Where the answer came from. Built by the server, never by the model. */
  z.object({
    type: z.literal("sources"),
    guides: z.array(z.object({ name: shortText, href: z.string().regex(GUIDE_HREF_RE) })).max(8),
    web: z
      .array(
        z.object({
          title: shortText,
          site: shortText,
          url: z.string().url().refine((u) => /^https?:\/\//.test(u)),
          retrieved: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
      .max(12),
    note: shortText.optional(),
  }),
  z.object({
    type: z.literal("attractions"),
    title: shortText,
    items: z.array(z.object({ name: shortText, category: shortText, photo: photoSchema.optional() })).min(1).max(8),
  }),
  z.object({
    type: z.literal("itinerary"),
    title: shortText,
    days: z
      .array(z.object({ title: shortText, items: z.array(shortText).min(1).max(6), photo: photoSchema.optional() }))
      .min(1)
      .max(14),
  }),
  z.object({
    type: z.literal("reach"),
    items: z.array(z.object({ mode: shortText, text: shortText })).min(1).max(5),
    localTransport: shortText.optional(),
  }),
  z.object({ type: z.literal("stay"), body: longText, areas: z.array(shortText).max(6), photo: photoSchema.optional() }),
  z.object({ type: z.literal("food"), body: longText, dishes: z.array(shortText).max(8), photo: photoSchema.optional() }),
  z.object({
    type: z.literal("budget"),
    basis: shortText,
    tiers: z
      .array(
        z.object({
          label: shortText,
          low: z.number().int().min(0).max(10_000_000),
          high: z.number().int().min(0).max(10_000_000).optional(),
        }),
      )
      .min(1)
      .max(4),
    note: shortText,
  }),
  z.object({
    type: z.literal("bookings"),
    items: z
      .array(
        z.object({
          label: shortText,
          provider: shortText,
          href: bookingUrl,
          icon: z.enum(["train", "hotel", "ticket", "plane", "bus"]),
        }),
      )
      .min(1)
      .max(6),
    /** Shown when links carry affiliate IDs. */
    disclosure: shortText.optional(),
  }),
  z.object({ type: z.literal("tips"), items: z.array(shortText).min(1).max(8) }),
  z.object({ type: z.literal("bestTime"), destination: shortText, months: z.array(monthRating).length(12), summary: longText }),
  z.object({ type: z.literal("faqs"), items: z.array(z.object({ question: shortText, answer: longText })).min(1).max(8) }),
  z.object({ type: z.literal("suggestions"), items: z.array(z.string().trim().min(1).max(80)).min(1).max(4) }),
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockOf<T extends Block["type"]> = Extract<Block, { type: T }>;
export type MonthRating = z.infer<typeof monthRating>;

/** What the browser sends: the conversation so far, as text, plus the trip memory from the last answer. */
export const MAX_TURNS = 30;

const memText = z.string().trim().max(80);
export const tripMemorySchema = z.object({
  destination: memText.nullable(),
  days: z.number().int().min(1).max(30).nullable(),
  travellers: memText.nullable(),
  budget: memText.nullable(),
  month: memText.nullable(),
  interests: z.array(memText).max(6),
  plan: z.array(z.string().trim().max(120)).max(10),
});
export type TripMemory = z.infer<typeof tripMemorySchema>;

export const chatRequestSchema = z.object({
  /** Browser-generated id of the conversation; free chats are counted per id. */
  chatId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
      }),
    )
    .min(1)
    .max(MAX_TURNS)
    .refine((m) => m[m.length - 1].role === "user", "The last message must be from the user"),
  memory: tripMemorySchema.nullable().optional(),
});

export type ChatTurn = z.infer<typeof chatRequestSchema>["messages"][number];

/** Server -> browser stream events, one JSON object per line. */
export type StreamEvent =
  | { type: "status"; text: string }
  | { type: "block"; block: Block }
  | { type: "done"; summary: string; memory?: TripMemory | null; freeLeft?: number | null }
  | { type: "error"; message: string };
