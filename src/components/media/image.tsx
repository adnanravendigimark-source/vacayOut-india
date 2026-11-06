"use client";

import NextImage, { type ImageLoaderProps, type ImageProps } from "next/image";
import { parseRenditionUrl, pickWidth, renditionUrl } from "@/lib/media/renditions";

/** Maps the width next/image asks for to the nearest pre-encoded rendition — a static CDN file, no optimiser call. */
export function renditionLoader({ src, width }: ImageLoaderProps) {
  const r = parseRenditionUrl(src);
  return r ? renditionUrl(r, pickWidth(width, r.maxWidth)) : src;
}

/**
 * Drop-in replacement for next/image.
 * Rendition URLs (every photo uploaded since the media pipeline) are served as ready-made
 * files; anything else (old uploads, /public files, remote URLs) still goes through the
 * built-in optimiser, so the swap is safe for every existing image.
 */
export function Image(props: ImageProps) {
  const rendition = typeof props.src === "string" && parseRenditionUrl(props.src);
  return rendition ? <NextImage {...props} loader={renditionLoader} /> : <NextImage {...props} />;
}

export default Image;
