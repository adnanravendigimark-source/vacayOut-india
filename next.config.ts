import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Only our own Vercel Blob store (destination images uploaded in the admin).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  experimental: {
    // Image uploads go through a server action; the default 1 MB limit is too small for photos.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

// Durable background jobs (destination generation). Adds routes under /.well-known/workflow.
export default withWorkflow(nextConfig);
