/** Map points: India-bounded coordinates only (same bounds the admin form enforces). */
export type MapPoint = { name: string; lat: number; lng: number; href?: string; primary?: boolean };

export function validPoint(lat: unknown, lng: unknown): lat is number {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
}

export function mapPoints(items: { name: string; lat: number | null | undefined; lng: number | null | undefined; href?: string; primary?: boolean }[]): MapPoint[] {
  const out: MapPoint[] = [];
  const seen = new Set<string>();
  for (const i of items) {
    if (!validPoint(i.lat, i.lng) || seen.has(i.name)) continue;
    seen.add(i.name);
    out.push({ name: i.name, lat: i.lat as number, lng: i.lng as number, ...(i.href ? { href: i.href } : {}), ...(i.primary ? { primary: true } : {}) });
  }
  return out.slice(0, 30);
}

export const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
