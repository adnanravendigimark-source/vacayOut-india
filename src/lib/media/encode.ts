// No "server-only" marker: sharp is Node-only anyway, and this keeps the encoder unit-testable.
import sharp from "sharp";
import { RENDITION_TYPE, planWidths, qualityFor } from "./renditions";

export type EncodedFile = { width: number; bytes: Uint8Array };
export type EncodedImage = { width: number; height: number; contentType: typeof RENDITION_TYPE; files: EncodedFile[] };

/** Formats we resize. Others (SVG, GIF) are stored as they are. */
const RASTER = new Set(["image/jpeg", "image/png", "image/webp"]);
export function isRaster(contentType: string) {
  return RASTER.has(contentType);
}

/**
 * Decodes an image once and writes the WebP rendition ladder.
 * EXIF orientation is applied, metadata is stripped, and sources are never upscaled.
 * Throws on undecodable input; callers decide whether to fall back.
 */
export async function encodeRenditions(input: Uint8Array): Promise<EncodedImage> {
  // limitInputPixels guards against decompression bombs (a 30,000 x 30,000 PNG is 900 MP).
  const base = sharp(input, { failOn: "error", limitInputPixels: 120_000_000 }).rotate();
  const meta = await base.metadata();
  const srcW = meta.autoOrient?.width ?? meta.width;
  const srcH = meta.autoOrient?.height ?? meta.height;
  if (!srcW || !srcH) throw new Error("Image has no dimensions");

  const files: EncodedFile[] = [];
  // Sequential on purpose: each resize holds a decoded bitmap, so parallel encodes multiply peak memory.
  for (const width of planWidths(srcW)) {
    const buf = await base
      .clone()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: qualityFor(width), effort: 4 })
      .toBuffer();
    files.push({ width, bytes: new Uint8Array(buf) });
  }
  const top = files[files.length - 1].width;
  return { width: top, height: Math.round((srcH * top) / srcW), contentType: RENDITION_TYPE, files };
}
