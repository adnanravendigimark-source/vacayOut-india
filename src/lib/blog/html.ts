import sanitizeHtml from "sanitize-html";

/**
 * Article HTML helpers. Pure (no I/O) so the admin editor, the server and tests share them.
 *
 * The editor writes HTML, and staff (admins and editors) can paste anything into it, so every
 * save runs `cleanArticleHtml`: only the tags the editor itself produces survive, links and
 * images are limited to safe URL schemes, and scripts, styles, iframes and event handlers are
 * dropped. The public page then renders the stored, already-clean HTML.
 */

const SAFE_URL = /^(https?:\/\/|\/(?!\/)|#|mailto:)/i;

export function isSafeHref(url: string) {
  return SAFE_URL.test(url.trim());
}

/** Images: https, or a site-relative path (local dev uploads). */
export function isSafeImageUrl(url: string) {
  return /^(https:\/\/|\/(?!\/))/i.test(url.trim());
}

export function cleanArticleHtml(html: string): string {
  return sanitizeHtml(html ?? "", {
    allowedTags: ["p", "h2", "h3", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "blockquote", "br", "hr", "img", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col", "code", "pre"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    transformTags: {
      // A pasted H1 or H4–H6 keeps its meaning at the nearest level the article uses (the post title is the page's H1).
      h1: "h2",
      h4: "h3",
      h5: "h3",
      h6: "h3",
      a: (tagName, attribs) => {
        const out: Record<string, string> = {};
        if (attribs.href && isSafeHref(attribs.href)) out.href = attribs.href.trim();
        const rel = new Set((attribs.rel ?? "").split(/\s+/).filter((r) => ["nofollow", "noopener", "noreferrer", "sponsored", "ugc"].includes(r)));
        if (attribs.target === "_blank") {
          out.target = "_blank";
          rel.add("noopener");
          rel.add("noreferrer");
        }
        if (rel.size) out.rel = [...rel].join(" ");
        return { tagName, attribs: out };
      },
    },
    exclusiveFilter: (frame) => (frame.tag === "img" && !isSafeImageUrl(frame.attribs.src ?? "")) || (frame.tag === "a" && !frame.attribs.href && !frame.text.trim()),
  }).trim();
}

export function stripHtml(html: string): string {
  return (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Listing-card excerpt from the article body: about three lines, cut on a word boundary. */
export function excerptFromContent(html: string, maxChars = 200): string {
  const text = stripHtml(html);
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).replace(/\s+\S*$/, "") + "…";
}

export function wordCount(html: string) {
  return stripHtml(html).split(/\s+/).filter(Boolean).length;
}

/** "6 min read" at ~220 words a minute; used when the editor leaves read time blank. */
export function estimateReadTime(html: string) {
  return `${Math.max(1, Math.round(wordCount(html) / 220))} min read`;
}

export type TocItem = { id: string; text: string; level: 2 | 3 };

function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Gives every H2/H3 a stable id and returns the table of contents. Ids are unique even for repeated headings. */
export function extractTableOfContents(html: string, reserved: string[] = []): { toc: TocItem[]; html: string } {
  const toc: TocItem[] = [];
  const seen = new Map<string, number>(reserved.map((r) => [r, 1]));
  const out = (html ?? "").replace(/<h([23])((?:\s+[^>]*)?)>([\s\S]*?)<\/h\1>/gi, (match, lv: string, attrs: string, inner: string) => {
    const level: 2 | 3 = lv === "3" ? 3 : 2;
    const text = stripHtml(inner);
    if (!text) return match;
    let id = slugifyHeading(text) || `section-${toc.length + 1}`;
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    if (n > 0) id = `${id}-${n + 1}`;
    toc.push({ id, text, level });
    const rest = (attrs ?? "").replace(/\s+id="[^"]*"/i, "");
    return `<h${level} id="${id}"${rest}>${inner}</h${level}>`;
  });
  return { toc, html: out };
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
