import { defineConfig } from "drizzle-kit";

// Migrations are generated into ./drizzle and applied with `npm run db:migrate`.
// Never use `drizzle-kit push` against production: every schema change must be a reviewed migration file.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
});
