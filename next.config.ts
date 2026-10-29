import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Only our own Vercel Blob store (destination images uploaded in the admin).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    // No 2048/3840 px variants: a full-width hero at 1920 px is plenty, and the larger
    // sizes cost seconds to generate and megabytes to download on retina screens.
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
    // Optimised images are cached for 31 days (source images never change in place).
    minimumCacheTTL: 2678400,
  },
  experimental: {
    // Image uploads go through a server action; the default 1 MB limit is too small for photos.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

// Durable background jobs (destination generation). Adds routes under /.well-known/workflow.
export default withWorkflow(nextConfig);
