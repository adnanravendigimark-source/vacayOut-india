import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; kind: "staff" | "traveller"; loginAt: number } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    kind?: "staff" | "traveller";
    loginAt?: number;
  }
}
