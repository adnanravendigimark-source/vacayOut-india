/**
 * Fetches a public web page for evidence checks. The URL comes from model
 * output, so it is untrusted (SSRF risk). We:
 *  - allow only http(s) on default ports, no credentials;
 *  - resolve DNS ourselves and refuse private, loopback, link-local and other
 *    non-public addresses — inside the connect step, so a DNS answer can't
 *    change between check and connect;
 *  - follow at most 4 redirects, re-checking each hop;
 *  - cap time and size and accept only HTML/plain text.
 */
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";
import { webUrl } from "./urls";

// Separate lists: a BlockList also matches IPv4 addresses against IPv4-mapped IPv6 rules.
const blocked4 = new net.BlockList();
const blocked6 = new net.BlockList();
for (const [a, p] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 3],
] as const) blocked4.addSubnet(a, p, "ipv4");
for (const [a, p] of [
  ["::", 127], ["64:ff9b::", 96], ["100::", 64], ["2001::", 32], ["2001:db8::", 32], ["2002::", 16],
  ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
] as const) blocked6.addSubnet(a, p, "ipv6");

export function isPublicAddress(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return !blocked4.check(ip, "ipv4");
  if (family === 6) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
    if (mapped) return isPublicAddress(mapped[1]);
    if (/^::ffff:/i.test(ip)) return false; // hex-form mapped addresses: refuse rather than parse
    return !blocked6.check(ip, "ipv6");
  }
  return false;
}

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

function guardedLookup(hostname: string, options: { all?: boolean } | number, cb: LookupCb) {
  const wantAll = typeof options === "object" && options?.all;
  dnsLookup(hostname, { all: true }, (err, addrs) => {
    if (err) return cb(err, "");
    const list = addrs as LookupAddress[];
    if (!list.length || list.some((a) => !isPublicAddress(a.address))) {
      const e: NodeJS.ErrnoException = new Error(`Refusing non-public address for ${hostname}`);
      e.code = "ENOTPUBLIC";
      return cb(e, "");
    }
    if (wantAll) return cb(null, list);
    cb(null, list[0].address, list[0].family);
  });
}

export type PageResult =
  | { ok: true; url: string; status: number; title: string | null; text: string; pageDate: string | null }
  | { ok: false; reason: string };

const UA = "Mozilla/5.0 (compatible; VacayOutResearchBot/1.0; +https://vacayout.in)";

function requestOnce(url: string, timeoutMs: number, maxBytes: number): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  const u = new URL(url);
  if (net.isIP(u.hostname.replace(/^\[|\]$/g, "")) && !isPublicAddress(u.hostname.replace(/^\[|\]$/g, ""))) {
    return Promise.reject(new Error("Refusing non-public address"));
  }
  const mod = u.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = mod.request(
      u,
      {
        method: "GET",
        lookup: guardedLookup as unknown as net.LookupFunction,
        headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,text/plain;q=0.8", "accept-encoding": "gzip, deflate, br", "accept-language": "en-IN,en;q=0.9" },
        timeout: timeoutMs,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, headers: res.headers, body: Buffer.alloc(0) });
        }
        const enc = String(res.headers["content-encoding"] ?? "").toLowerCase();
        const stream =
          enc === "gzip" ? res.pipe(zlib.createGunzip()) : enc === "deflate" ? res.pipe(zlib.createInflate()) : enc === "br" ? res.pipe(zlib.createBrotliDecompress()) : res;
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on("data", (c: Buffer) => {
          size += c.length;
          if (size > maxBytes) {
            req.destroy();
            stream.destroy();
            resolve({ status, headers: res.headers, body: Buffer.concat(chunks) }); // keep what we have
            return;
          }
          chunks.push(c);
        });
        stream.on("end", () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks) }));
        stream.on("error", reject);
      },
    );
    const hard = setTimeout(() => req.destroy(new Error("Timed out")), timeoutMs);
    req.on("timeout", () => req.destroy(new Error("Timed out")));
    req.on("error", (e) => {
      clearTimeout(hard);
      reject(e);
    });
    req.on("close", () => clearTimeout(hard));
    req.end();
  });
}

export async function fetchPage(rawUrl: string, opts: { timeoutMs?: number; maxBytes?: number } = {}): Promise<PageResult> {
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const maxBytes = opts.maxBytes ?? 2_000_000;
  const first = webUrl(rawUrl);
  if (!first) return { ok: false, reason: "Not a public web address" };
  let url: string = first.toString();
  try {
    for (let hop = 0; hop <= 4; hop++) {
      const res = await requestOnce(url, timeoutMs, maxBytes);
      if (res.status >= 300 && res.status < 400 && res.headers.location) {
        const next: URL | null = webUrl(new URL(String(res.headers.location), url).toString());
        if (!next) return { ok: false, reason: "Redirected to a non-public address" };
        url = next.toString();
        continue;
      }
      if (res.status < 200 || res.status >= 300) return { ok: false, reason: `HTTP ${res.status}` };
      const type = String(res.headers["content-type"] ?? "").toLowerCase();
      const isHtml = type.includes("html") || type === "";
      if (!isHtml && !type.startsWith("text/plain")) return { ok: false, reason: `Unsupported content (${type.split(";")[0]})` };
      const charset = /charset=([\w-]+)/.exec(type)?.[1] ?? "utf-8";
      let raw: string;
      try {
        raw = new TextDecoder(charset).decode(res.body);
      } catch {
        raw = new TextDecoder("utf-8").decode(res.body);
      }
      if (!isHtml) return { ok: true, url, status: res.status, title: null, text: raw, pageDate: null };
      return { ok: true, url, status: res.status, title: extractTitle(raw), text: htmlToText(raw), pageDate: extractPageDate(raw) };
    }
    return { ok: false, reason: "Too many redirects" };
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return { ok: false, reason: e.code === "ENOTPUBLIC" ? "Not a public web address" : (e.message || "Could not open page").slice(0, 160) };
  }
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", rupee: "₹" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article|br)\s*>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function extractTitle(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodeEntities(m[1]).replace(/\s+/g, " ").trim().slice(0, 200) || null : null;
}

/** The page's own modified/published date when it declares one (meta tags or JSON-LD). */
export function extractPageDate(html: string): string | null {
  const patterns = [
    /<meta[^>]+(?:property|name|itemprop)=["'](?:article:modified_time|og:updated_time|dateModified|last-modified)["'][^>]*content=["']([^"']+)["']/i,
    /"dateModified"\s*:\s*"([^"]+)"/i,
    /<meta[^>]+(?:property|name|itemprop)=["'](?:article:published_time|datePublished)["'][^>]*content=["']([^"']+)["']/i,
    /"datePublished"\s*:\s*"([^"]+)"/i,
  ];
  for (const p of patterns) {
    const m = p.exec(html);
    const d = m?.[1] && /^\d{4}-\d{2}(-\d{2})?/.exec(m[1].trim());
    if (d) return d[0];
  }
  return null;
}
