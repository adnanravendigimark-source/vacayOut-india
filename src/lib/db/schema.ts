import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/**
 * VacayOut core schema (Phase 1).
 *
 * The database is the source of truth. Public pages and the AI assistant read
 * ONLY published snapshots (place_versions); drafts never leave the admin.
 * Research tables (Phase 2) hold UNAPPROVED findings for admin review; they never
 * feed public pages or the assistant until a human approves them.
 */

export const userRole = pgEnum("user_role", ["admin", "editor"]);

export const placeKind = pgEnum("place_kind", [
  "state",
  "region",
  "city",
  "town",
  "attraction",
  "temple",
  "lake",
  "viewpoint",
  "trek",
  "activity",
  "nature",
  "museum",
]);

export const placeStatus = pgEnum("place_status", ["draft", "in_review", "published", "archived"]);

export const sectionKey = pgEnum("section_key", [
  "overview",
  "highlights",
  "things_to_do",
  "best_time",
  "how_to_reach",
  "local_transport",
  "travel_tips",
  "faqs",
  "itinerary",
  "budget",
  // Travel-guide sections (migration 0007).
  "visit_info",
  "where_to_stay",
  "food",
  "culture_etiquette",
  "practical_info",
  "safety_health",
]);

export const sectionStatus = pgEnum("section_status", ["draft", "approved"]);

/** "page": own public URL. "parent_section": shown inside its parent's page (for places too thin for their own page). */
export const displayMode = pgEnum("display_mode", ["page", "parent_section"]);
export const mediaKind = pgEnum("media_kind", ["photo", "ai_generated"]);
export const relationType = pgEnum("relation_type", ["nearby", "day_trip"]);
export const jobStatus = pgEnum("job_status", ["pending", "done", "failed"]);

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("editor"),
    active: boolean("active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(sql`lower(${t.email})`)],
);

/** Failed sign-ins, used for durable (serverless-safe) login throttling. */
export const authFailures = pgTable(
  "auth_failures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    ip: text("ip").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_failures_email_at_idx").on(t.email, t.at), index("auth_failures_ip_at_idx").on(t.ip, t.at)],
);

/**
 * Every state, city, town, attraction, trek… is one row. `parentId` gives the
 * hierarchy; `stateId` (the root state) keeps public URLs (/india/{state}/{slug})
 * unique without deep paths.
 */
export const places = pgTable(
  "places",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: placeKind("kind").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => places.id, { onDelete: "restrict" }),
    stateId: uuid("state_id").references((): AnyPgColumn => places.id, { onDelete: "restrict" }),
    summary: text("summary"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    wikidataId: text("wikidata_id"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: placeStatus("status").notNull().default("draft"),
    displayMode: displayMode("display_mode").notNull().default("page"),
    featured: boolean("featured").notNull().default(false),
    /** Editor-confirmed trip types (see src/lib/places/trip-types.ts). */
    tripTypes: text("trip_types").array().notNull().default(sql`'{}'::text[]`),
    /** Types suggested by generation; shown to the editor, never public. */
    suggestedTripTypes: text("suggested_trip_types").array().notNull().default(sql`'{}'::text[]`),
    heroMediaId: uuid("hero_media_id").references((): AnyPgColumn => media.id, { onDelete: "set null" }),
    publishedVersionId: uuid("published_version_id").references((): AnyPgColumn => placeVersions.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("places_state_slug_idx").on(t.slug).where(sql`${t.kind} = 'state'`),
    uniqueIndex("places_in_state_slug_idx").on(t.stateId, t.slug).where(sql`${t.kind} <> 'state'`),
    uniqueIndex("places_wikidata_idx").on(t.wikidataId).where(sql`${t.wikidataId} is not null`),
    index("places_parent_idx").on(t.parentId),
    index("places_status_idx").on(t.status),
  ],
);

/**
 * Editable page sections. `locked` marks human-edited content so future AI
 * refreshes propose changes instead of overwriting it.
 */
export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    key: sectionKey("key").notNull(),
    body: jsonb("body").$type<SectionBody>().notNull(),
    status: sectionStatus("status").notNull().default("draft"),
    locked: boolean("locked").notNull().default(false),
    /** Sources behind AI-drafted text (from approved research findings); shown on the public page. */
    sources: jsonb("sources").$type<SectionSource[]>().notNull().default([]),
    /** Research findings this text was written from. Approving the section approves the eligible ones. */
    findingIds: jsonb("finding_ids").$type<string[]>().notNull().default([]),
    updatedBy: uuid("updated_by").references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("sections_place_key_idx").on(t.placeId, t.key)],
);

/** Immutable published snapshots. Public pages and the AI read only these. */
export const placeVersions = pgTable(
  "place_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<PublishedSnapshot>().notNull(),
    publishedBy: uuid("published_by").references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("place_versions_place_version_idx").on(t.placeId, t.version)],
);

/** Images (Vercel Blob). Licence and alt text are required; AI images are labelled everywhere they appear. */
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: uuid("place_id")
      .notNull()
      .references((): AnyPgColumn => places.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    bytes: integer("bytes").notNull(),
    alt: text("alt").notNull(),
    caption: text("caption"),
    kind: mediaKind("kind").notNull().default("photo"),
    license: text("license").notNull(),
    /** Link to the licence text (CC licences require it alongside the credit). */
    licenseUrl: text("license_url"),
    attribution: text("attribution"),
    sourceUrl: text("source_url"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_place_idx").on(t.placeId)],
);

/**
 * Ready-made trip plans (2–3, 4–5, 7 days…) for a destination. Same rules as
 * places: drafts stay in the admin; an editor publishes, which freezes a
 * snapshot. Public pages read ONLY `publishedSnapshot` of published rows.
 * The plan's shape is validated in src/lib/itineraries/plan.ts.
 */
export const itineraries = pgTable(
  "itineraries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    /** Main destination (its guide is linked from the itinerary). */
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    durationDays: integer("duration_days").notNull(),
    tripTypes: text("trip_types").array().notNull().default(sql`'{}'::text[]`),
    plan: jsonb("plan").$type<ItineraryPlan>().notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    heroMediaId: uuid("hero_media_id").references((): AnyPgColumn => media.id, { onDelete: "set null" }),
    sources: jsonb("sources").$type<SectionSource[]>().notNull().default([]),
    /** Research findings the plan relies on; they must be approved before it can be published. */
    findingIds: jsonb("finding_ids").$type<string[]>().notNull().default([]),
    status: placeStatus("status").notNull().default("draft"),
    /** Set when a person edits the plan, so re-seeding/regeneration never overwrites it. */
    locked: boolean("locked").notNull().default(false),
    publishedSnapshot: jsonb("published_snapshot").$type<ItinerarySnapshot>(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: uuid("published_by").references(() => users.id),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("itineraries_slug_idx").on(t.slug),
    index("itineraries_place_idx").on(t.placeId),
    index("itineraries_status_idx").on(t.status),
    check("itineraries_days_range", sql`${t.durationDays} between 1 and 21`),
  ],
);

/** Permanent redirects for URLs that changed after being published. */
export const redirects = pgTable("redirects", {
  fromPath: text("from_path").primaryKey(),
  toPath: text("to_path").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const placeRelations = pgTable(
  "place_relations",
  {
    fromId: uuid("from_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    toId: uuid("to_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    type: relationType("type").notNull().default("nearby"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.fromId, t.toId, t.type] }), check("place_relations_not_self", sql`${t.fromId} <> ${t.toId}`)],
);

/**
 * Text index of PUBLISHED content only, written in the same transaction as
 * the published version. The AI assistant searches this (and re-checks the
 * place is still published), never drafts.
 */
export const searchDocuments = pgTable(
  "search_documents",
  {
    placeId: uuid("place_id")
      .primaryKey()
      .references(() => places.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => placeVersions.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    name: text("name").notNull(),
    kind: placeKind("kind").notNull(),
    stateName: text("state_name"),
    content: text("content").notNull(),
    tsv: tsvector("tsv")
      .notNull()
      .generatedAlwaysAs(sql`to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(state_name, '') || ' ' || content)`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("search_documents_tsv_idx").using("gin", t.tsv)],
);

/**
 * Cache refreshes to run after a publish commits. Kept in the database so a
 * failed refresh is retried (cron + admin button) instead of silently lost.
 */
export const publishJobs = pgTable(
  "publish_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: uuid("place_id").references(() => places.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    paths: jsonb("paths").$type<string[]>().notNull(),
    status: jobStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    ...timestamps,
  },
  (t) => [index("publish_jobs_status_idx").on(t.status)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_at_idx").on(t.at), index("audit_log_entity_idx").on(t.entityType, t.entityId)],
);

// ---------- Research (Phase 2) ----------

export const researchKind = pgEnum("research_kind", ["place_facts", "discover_places", "draft", "generate", "image"]);
export const researchStatus = pgEnum("research_status", ["queued", "running", "done", "failed"]);
export const findingStatus = pgEnum("finding_status", ["pending", "approved", "rejected"]);
/** Computed from the support checks. "Verified" is never automatic: only admin approval makes a fact trusted. */
export const findingVerification = pgEnum("finding_verification", ["unsupported", "single_source", "corroborated", "conflicting"]);
export const claimType = pgEnum("claim_type", ["general", "price", "schedule", "opening_hours", "distance", "rule", "contact"]);
export const sourceAuthority = pgEnum("source_authority", ["government", "reference", "media", "travel_platform", "other"]);
/** Result of our own check of one piece of evidence. */
export const supportResult = pgEnum("support_result", ["not_checked", "supports", "partial", "does_not_support", "contradicts", "quote_not_found", "unreachable"]);
export const candidateStatus = pgEnum("candidate_status", ["pending", "accepted", "rejected"]);

/** One research request. Cost is tracked in micro-dollars (1e-6 USD) to keep arithmetic exact. */
export const researchRuns = pgTable(
  "research_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: researchKind("kind").notNull(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    status: researchStatus("status").notNull().default("queued"),
    focus: jsonb("focus").$type<string[]>().notNull().default([]),
    model: text("model").notNull(),
    requestedBy: uuid("requested_by").references(() => users.id),
    reservedMicroUsd: integer("reserved_micro_usd").notNull().default(0),
    costMicroUsd: integer("cost_micro_usd").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    searchCalls: integer("search_calls").notNull().default(0),
    notes: text("notes"),
    error: text("error"),
    /** Generation: the job this paid step belongs to, and which step it is (one row per job+step). */
    parentRunId: uuid("parent_run_id").references((): AnyPgColumn => researchRuns.id, { onDelete: "set null" }),
    stepKey: text("step_key"),
    /** A step holds a short lease while it runs, so a duplicate delivery can't run it twice at once. */
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    /** Background OpenAI request for this step: a retry resumes it instead of paying again. */
    openaiResponseId: text("openai_response_id"),
    /** Responses whose cost has already been added (so a resumed response isn't counted twice). */
    billedResponses: jsonb("billed_responses").$type<string[]>().notNull().default([]),
    /** Generation job: step-by-step progress shown in the admin. */
    progress: jsonb("progress").$type<GenerationProgress>(),
    workflowRunId: text("workflow_run_id"),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("research_runs_place_idx").on(t.placeId, t.createdAt),
    index("research_runs_status_idx").on(t.status),
    index("research_runs_created_idx").on(t.createdAt),
    uniqueIndex("research_runs_parent_step_idx").on(t.parentRunId, t.stepKey).where(sql`${t.parentRunId} is not null`),
  ],
);

export type GenerationStepStatus = "pending" | "running" | "done" | "skipped" | "failed" | "waiting_budget";
export type GenerationProgress = {
  steps: { key: string; label: string; status: GenerationStepStatus; detail?: string }[];
  /** Sections this job writes (all, or the ones selected for "Regenerate selected"). */
  sections: string[];
  /** Which parts of the destination to generate. */
  include: { research: boolean; discover: boolean; details: boolean; image: boolean; coordinates: boolean };
  needsImage?: boolean;
};

/** A web page used as evidence. One row per normalised URL, reused across runs. */
export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull().unique(),
  host: text("host").notNull(),
  /** Registrable domain; two sources on the same site are not independent. */
  site: text("site").notNull(),
  title: text("title"),
  authority: sourceAuthority("authority").notNull().default("other"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastRetrievedAt: timestamp("last_retrieved_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A single researched claim about a place, waiting for (or after) admin review. */
export const researchFindings = pgTable(
  "research_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => researchRuns.id, { onDelete: "cascade" }),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    sectionKey: sectionKey("section_key"),
    topic: text("topic").notNull(),
    claim: text("claim").notNull(),
    /** Set when an admin edits the claim before approving; the researched wording is kept here. */
    originalClaim: text("original_claim"),
    claimType: claimType("claim_type").notNull().default("general"),
    /** The model's own note on disagreement between sources. */
    conflictNote: text("conflict_note"),
    verification: findingVerification("verification").notNull().default("unsupported"),
    status: findingStatus("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("research_findings_place_idx").on(t.placeId, t.status), index("research_findings_run_idx").on(t.runId)],
);

export const findingEvidence = pgTable(
  "finding_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    findingId: uuid("finding_id")
      .notNull()
      .references(() => researchFindings.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    quote: text("quote").notNull(),
    /** The date the source itself shows (published/updated), as written by it. Null when the page shows none. */
    sourceDate: text("source_date"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
    support: supportResult("support").notNull().default("not_checked"),
    supportNote: text("support_note"),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
  },
  (t) => [index("finding_evidence_finding_idx").on(t.findingId)],
);

/** Places suggested by a discovery run. Accepting one creates an empty draft place. */
export const placeCandidates = pgTable(
  "place_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => researchRuns.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: placeKind("kind").notNull(),
    reason: text("reason").notNull(),
    evidence: jsonb("evidence").$type<CandidateEvidence[]>().notNull(),
    /** An existing place that looks like the same one. */
    matchedPlaceId: uuid("matched_place_id").references(() => places.id, { onDelete: "set null" }),
    createdPlaceId: uuid("created_place_id").references(() => places.id, { onDelete: "set null" }),
    status: candidateStatus("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("place_candidates_parent_idx").on(t.parentId, t.status)],
);

/** Small admin-editable settings (e.g. the monthly research budget). */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const suggestionStatus = pgEnum("suggestion_status", ["pending", "applied", "discarded"]);

/**
 * AI-drafted content built only from approved findings. Shown to admins as a
 * suggestion; it changes a section or the place details only when someone clicks "Use".
 */
export const contentSuggestions = pgTable(
  "content_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    runId: uuid("run_id").references(() => researchRuns.id, { onDelete: "set null" }),
    /** null = place details (summary, SEO title, meta description). */
    sectionKey: sectionKey("section_key"),
    body: jsonb("body").$type<SectionBody | DetailsSuggestion>().notNull(),
    sources: jsonb("sources").$type<SectionSource[]>().notNull().default([]),
    findingIds: jsonb("finding_ids").$type<string[]>().notNull().default([]),
    notes: text("notes"),
    status: suggestionStatus("status").notNull().default("pending"),
    createdBy: uuid("created_by").references(() => users.id),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("content_suggestions_place_idx").on(t.placeId, t.status)],
);

export type DetailsSuggestion = { summary: string; seoTitle: string; seoDescription: string };
export type SectionSource = { url: string; title: string | null; site: string };

export type CandidateEvidence = { url: string; title: string | null; quote: string; site: string };

// ---------- Travellers and chat (Phase 4) ----------

/** Public accounts for the chat. Separate from admin `users`, so a traveller can never reach the admin. */
export const travellers = pgTable(
  "travellers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    /** Null for Google-only accounts. */
    passwordHash: text("password_hash"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    googleSub: text("google_sub"),
    active: boolean("active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("travellers_email_idx").on(sql`lower(${t.email})`), uniqueIndex("travellers_google_idx").on(t.googleSub).where(sql`${t.googleSub} is not null`)],
);

/** Single-use email links (verification). Only a SHA-256 of the token is stored. */
export const emailTokens = pgTable(
  "email_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    travellerId: uuid("traveller_id")
      .notNull()
      .references(() => travellers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    purpose: text("purpose").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_tokens_traveller_idx").on(t.travellerId)],
);

/** Fixed-window counters for rate limits and quotas (used when Upstash Redis isn't configured). */
export const usageCounters = pgTable(
  "usage_counters",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] }), index("usage_counters_expires_idx").on(t.expiresAt)],
);

/** One row per chat message handled: outcome and estimated cost (for budgets and the admin overview). */
export const chatRequests = pgTable(
  "chat_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    /** Hashed visitor key — never the raw IP or cookie. */
    visitor: text("visitor").notNull(),
    travellerId: uuid("traveller_id").references(() => travellers.id, { onDelete: "set null" }),
    outcome: text("outcome").notNull(),
    destination: text("destination"),
    usedGuides: boolean("used_guides").notNull().default(false),
    researched: boolean("researched").notNull().default(false),
    researchCacheHit: boolean("research_cache_hit").notNull().default(false),
    costMicroUsd: integer("cost_micro_usd").notNull().default(0),
  },
  (t) => [index("chat_requests_at_idx").on(t.at)],
);

export const webResearchReview = pgEnum("web_research_review", ["new", "reviewed", "dismissed"]);

/**
 * Web research done for chat answers: a cache (so repeat questions cost
 * nothing) and a review queue (admins see what travellers ask about that the
 * guides don't cover). Never merged into curated records automatically.
 */
export const webResearch = pgTable(
  "web_research",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cacheKey: text("cache_key").notNull().unique(),
    destination: text("destination").notNull(),
    topic: text("topic").notNull(),
    placeId: uuid("place_id").references(() => places.id, { onDelete: "set null" }),
    facts: jsonb("facts").$type<WebFact[]>().notNull(),
    notes: text("notes"),
    model: text("model").notNull(),
    costMicroUsd: integer("cost_micro_usd").notNull().default(0),
    hits: integer("hits").notNull().default(1),
    review: webResearchReview("review").notNull().default("new"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("web_research_review_idx").on(t.review, t.retrievedAt)],
);

/** Server errors (from onRequestError and our own catch blocks), shown on the admin System page. */
export const appErrors = pgTable(
  "app_errors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source").notNull(),
    message: text("message").notNull(),
    digest: text("digest"),
    path: text("path"),
  },
  (t) => [index("app_errors_at_idx").on(t.at)],
);

export type WebFact = { claim: string; claimType: string; sources: SectionSource[] };

// ---------- JSON shapes (validated in src/lib/places/sections.ts) ----------

export type SectionBody = {
  text?: string;
  items?: { title?: string; body: string }[];
};

export type SnapshotImage = {
  url: string;
  alt: string;
  caption: string | null;
  kind: "photo" | "ai_generated";
  license: string;
  licenseUrl?: string | null;
  attribution: string | null;
  sourceUrl: string | null;
};

export type ItineraryStop = { time?: string; name: string; placeSlug?: string; duration?: string; note?: string };
export type ItineraryDay = { title: string; summary?: string; stops: ItineraryStop[]; travel?: string; meals?: string; overnight?: string };
export type ItineraryPlan = {
  /** Who it suits and the pace. */
  overview: string;
  days: ItineraryDay[];
  budget: { assumptions: string; lines: { label: string; amount: string; basis: string }[] };
  booking: { item: string; detail: string }[];
  alternatives: string[];
  tips?: string[];
};
export type ItinerarySnapshot = {
  slug: string;
  title: string;
  summary: string;
  durationDays: number;
  tripTypes: string[];
  seoTitle: string;
  seoDescription: string;
  plan: ItineraryPlan;
  sources: SectionSource[];
  hero: SnapshotImage | null;
  place: { name: string; slug: string; kind: string; stateSlug: string | null; stateName: string | null; path: string | null };
};

export type PublishedSnapshot = {
  place: {
    id: string;
    kind: string;
    name: string;
    slug: string;
    summary: string | null;
    lat: number | null;
    lng: number | null;
    seoTitle: string;
    seoDescription: string;
    state: { name: string; slug: string } | null;
    parent: { name: string; slug: string; kind: string } | null;
    displayMode: "page" | "parent_section";
    hero: SnapshotImage | null;
  };
  sections: { key: string; body: SectionBody; sources?: SectionSource[] }[];
};
