/**
 * Wikimedia Commons search and import. Only freely licensed files can be
 * imported (public domain, CC0, CC BY, CC BY-SA); NonCommercial/NoDerivatives
 * and non-free files are refused. Images are downloaded server-side from
 * Wikimedia's own hosts only, and the licence, author and source page are
 * recorded so the site can credit them.
 */
import { decodeEntities } from "@/lib/research/safe-fetch";
import { MAX_IMAGE_BYTES } from "./sniff";

const API = "https://commons.wikimedia.org/w/api.php";
const IMAGE_HOSTS = new Set(["upload.wikimedia.org", "thumb.wikimedia.org"]);

/** Test seam: a local mock API (and its host for downloads), honoured outside production only. */
function apiBase(): { api: string; extraHost: string | null } {
  const mock = process.env.NODE_ENV !== "production" ? process.env.COMMONS_TEST_API : undefined;
  if (mock) return { api: mock, extraHost: new URL(mock).host };
  return { api: API, extraHost: null };
}

function userAgent() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vacayout.in";
  return `VacayOut/1.0 (${site}; admin image import) node-fetch`;
}

export type CommonsFile = {
  pageId: number;
  title: string;
  descriptionUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  mime: string;
  license: string;
  licenseUrl: string | null;
  artist: string;
  credit: string | null;
  description: string;
  allowed: boolean;
  reason: string | null;
};

/** Strips HTML from Commons metadata (artist/description are HTML snippets). */
export function plainText(html: string | undefined | null, max = 300): string {
  if (!html) return "";
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim().slice(0, max);
}

/** Free licences we accept. Anything NC/ND, "fair use" or non-free is refused. */
export function licenceVerdict(meta: { License?: string; LicenseShortName?: string; NonFree?: string; Restrictions?: string }): { allowed: boolean; reason: string | null } {
  const id = (meta.License ?? "").toLowerCase().trim();
  const short = (meta.LicenseShortName ?? "").toLowerCase().trim();
  const both = `${id} ${short}`;
  if (meta.NonFree && meta.NonFree !== "false") return { allowed: false, reason: "Not a free file" };
  if (/(^|[\s-])(nc|nd)([\s-]|$)|non-?commercial|no-?deriv|fair[\s-]use/.test(both)) {
    return { allowed: false, reason: "Licence doesn’t allow commercial use or changes" };
  }
  if (/^cc-by(-sa)?-\d/.test(id) || /^cc by(-sa)? \d/.test(short)) return { allowed: true, reason: null };
  if (id === "cc0" || id === "cc-zero" || short === "cc0" || /^pd\b|^pd-|public domain/.test(both)) return { allowed: true, reason: null };
  return { allowed: false, reason: `Licence not on our allow-list (${meta.LicenseShortName || meta.License || "unknown"})` };
}

const OK_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

type ApiPage = {
  pageid: number;
  title: string;
  imageinfo?: {
    url: string;
    descriptionurl: string;
    thumburl?: string;
    width: number;
    height: number;
    mime: string;
    extmetadata?: Record<string, { value: string }>;
  }[];
};

export function parseFiles(json: unknown): CommonsFile[] {
  const pages = ((json as { query?: { pages?: ApiPage[] } })?.query?.pages ?? []) as ApiPage[];
  const out: CommonsFile[] = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii?.thumburl) continue;
    const m = Object.fromEntries(Object.entries(ii.extmetadata ?? {}).map(([k, v]) => [k, String(v?.value ?? "")]));
    const verdict = licenceVerdict(m);
    const mimeOk = OK_MIME.has(ii.mime);
    out.push({
      pageId: p.pageid,
      title: p.title.replace(/^File:/, ""),
      descriptionUrl: ii.descriptionurl,
      thumbUrl: ii.thumburl,
      width: ii.width,
      height: ii.height,
      mime: ii.mime,
      license: m.LicenseShortName || m.License || "Unknown",
      licenseUrl: m.LicenseUrl || null,
      artist: plainText(m.Artist, 160) || "Unknown author",
      credit: plainText(m.Credit, 160) || null,
      description: plainText(m.ImageDescription, 240),
      allowed: verdict.allowed && mimeOk && ii.width >= 800,
      reason: !verdict.allowed ? verdict.reason : !mimeOk ? "Not a photo format we accept" : ii.width < 800 ? "Too small (under 800 px wide)" : null,
    });
  }
  return out;
}

const META = "LicenseShortName|License|LicenseUrl|Artist|Credit|ImageDescription|NonFree|Restrictions";

async function api(params: Record<string, string>, fetchImpl: typeof fetch): Promise<unknown> {
  const { api } = apiBase();
  const url = `${api}?${new URLSearchParams({ action: "query", format: "json", formatversion: "2", origin: "*", ...params })}`;
  const res = await fetchImpl(url, { headers: { "user-agent": userAgent(), "api-user-agent": userAgent() }, signal: AbortSignal.timeout(15_000) });
  if (res.status === 429) throw new Error("Wikimedia Commons is rate-limiting requests. Try again in a minute.");
  if (!res.ok) throw new Error(`Wikimedia Commons returned ${res.status}.`);
  return res.json();
}

export async function searchCommons(query: string, fetchImpl: typeof fetch = fetch): Promise<CommonsFile[]> {
  const q = query.replace(/[^\p{L}\p{N}\s,'-]/gu, " ").trim().slice(0, 100);
  if (q.length < 2) return [];
  const json = await api(
    { generator: "search", gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "18", prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "500", iiextmetadatafilter: META },
    fetchImpl,
  );
  return parseFiles(json);
}

/** Re-reads one file (never trusts licence data from the browser) and downloads a 1920px rendition. */
export async function fetchCommonsImage(pageId: number, fetchImpl: typeof fetch = fetch): Promise<{ file: CommonsFile; bytes: Uint8Array }> {
  const json = await api({ pageids: String(pageId), prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1920", iiextmetadatafilter: META }, fetchImpl);
  const [file] = parseFiles(json);
  if (!file) throw new Error("That file wasn’t found on Wikimedia Commons.");
  if (!file.allowed) throw new Error(file.reason ?? "This file can’t be imported.");

  const { extraHost } = apiBase();
  let url = file.thumbUrl;
  for (let hop = 0; hop < 3; hop++) {
    const u = new URL(url);
    if (u.protocol !== "https:" && !(extraHost && u.host === extraHost)) throw new Error("Unexpected image address.");
    if (!IMAGE_HOSTS.has(u.hostname) && u.host !== extraHost) throw new Error("Unexpected image host.");
    const res = await fetchImpl(url, { headers: { "user-agent": userAgent() }, redirect: "manual", signal: AbortSignal.timeout(30_000) });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url).toString();
      continue;
    }
    if (!res.ok || !res.body) throw new Error(`Image download failed (${res.status}).`);
    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > MAX_IMAGE_BYTES) throw new Error("The image is larger than 5 MB.");
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new Error("The image is larger than 5 MB.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) {
      bytes.set(c, at);
      at += c.length;
    }
    return { file, bytes };
  }
  throw new Error("Too many redirects downloading the image.");
}

/** Credit line in the form Commons asks for: author, licence, source. */
export function attributionFor(f: CommonsFile): string {
  return `${f.artist} via Wikimedia Commons`.slice(0, 200);
}
