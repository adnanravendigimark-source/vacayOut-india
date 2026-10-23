/** Shared by the server schema and the browser renderer (kept free of zod so the client bundle stays small). */
export const BOOKING_HOSTS = ["www.irctc.co.in", "www.booking.com", "www.getyourguide.com", "www.redbus.in"] as const;

export function isAllowedBookingUrl(href: string) {
  try {
    const url = new URL(href);
    return url.protocol === "https:" && (BOOKING_HOSTS as readonly string[]).includes(url.hostname);
  } catch {
    return false;
  }
}

/** Our own images only: bundled photos, dev uploads, or our Vercel Blob store. */
export const IMAGE_SRC_RE = /^(\/images\/[a-z0-9/_-]+\.jpg|\/uploads\/[A-Za-z0-9/._-]+|https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/[A-Za-z0-9/._%-]+)$/;

export function isLocalImage(src: string) {
  return IMAGE_SRC_RE.test(src);
}

/** Internal guide links only. */
export const GUIDE_HREF_RE = /^\/india(\/[a-z0-9-]+){1,2}(#[a-z0-9-]+)?$/;

export const MAX_MESSAGE_CHARS = 500;
