import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Vercel Blob store, Unsplash and Wikimedia Commons for curated photography.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
    ],
    // No 2048/3840 px variants: a full-width hero at 1920 px is plenty, and the larger
    // sizes cost seconds to generate and megabytes to download on retina screens.
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
    // Optimised images are cached for 31 days (source images never change in place).
    minimumCacheTTL: 2678400,
  },
  // Baseline security headers on every response. A full script CSP is left for later: Next inline
  // scripts, Leaflet and reCAPTCHA need a nonce setup and testing first.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self' https://accounts.google.com" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        ],
      },
    ];
  },
  experimental: {
    // Image uploads go through a server action; the default 1 MB limit is too small for photos.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

// Durable background jobs (destination generation). Adds routes under /.well-known/workflow.
export default withWorkflow(nextConfig);
