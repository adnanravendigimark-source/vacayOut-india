/**
 * Helpers for drawing on the @svg-maps/india paths (viewBox 0 0 612 696). That map is a
 * Mercator projection; the constants below were fitted to its outline (Gujarat's west edge,
 * Arunachal's east edge, Himachal's north edge) and check out within about a pixel on Goa,
 * Himachal and Tamil Nadu.
 */
const LNG0 = 68.16;
const PX_PER_DEG = 611.9 / (97.41 - LNG0);
const PX_PER_RAD = (PX_PER_DEG * 180) / Math.PI;
const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const M0 = merc(33.21);
const Y0 = 97.5;

export function projectIndia(lat: number, lng: number): { x: number; y: number } {
  return { x: (lng - LNG0) * PX_PER_DEG, y: Y0 + (M0 - merc(lat)) * PX_PER_RAD };
}

/** Bounding box of a path made of m/M/l/L/z commands, as [minX, minY, maxX, maxY]. */
export function pathBBox(d: string): [number, number, number, number] {
  const t = d.match(/[mMlLzZ]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  let x = 0, y = 0, sx = 0, sy = 0, cmd = "m", start = true;
  const b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i < t.length; ) {
    const k = t[i];
    if (/^[a-zA-Z]$/.test(k)) {
      cmd = k;
      i++;
      if (k === "z" || k === "Z") { x = sx; y = sy; }
      start = true;
      continue;
    }
    const a = Number(t[i]), c = Number(t[i + 1]);
    i += 2;
    if (!Number.isFinite(a) || !Number.isFinite(c)) continue;
    if (cmd === "m" || cmd === "l") { x += a; y += c; } else { x = a; y = c; }
    if ((cmd === "m" || cmd === "M") && start) { sx = x; sy = y; }
    if (cmd === "m") cmd = "l";
    if (cmd === "M") cmd = "L";
    start = false;
    b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y);
  }
  return b;
}
