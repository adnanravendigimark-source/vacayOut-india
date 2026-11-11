import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanArticleHtml, estimateReadTime, excerptFromContent, extractTableOfContents, slugify } from "./html";
import { authorParts, blankPost, parseBlogPost } from "./post";
import { BLOG_DEFAULTS, resolveBlogSettings } from "./settings";

test("article HTML keeps editor formatting and drops anything executable", () => {
  const dirty = `<h1>Title</h1><p onclick="x()">Hi <strong>there</strong> <a href="javascript:alert(1)">bad</a> <a href="/india" target="_blank">ok</a></p>
<script>alert(1)</script><style>p{}</style><iframe src="https://evil"></iframe>
<img src="x" onerror="alert(1)"><img src="https://cdn.test/a.jpg" alt="A"><figure><img src="https://cdn.test/b.jpg" alt=""><figcaption>Cap</figcaption></figure>
<table><tbody><tr><th colspan="2">H</th></tr><tr><td>1</td><td style="color:red">2</td></tr></tbody></table><h5>Small</h5>`;
  const clean = cleanArticleHtml(dirty);
  assert.ok(!/script|onclick|onerror|javascript:|iframe|style/i.test(clean), clean);
  assert.ok(clean.startsWith("<h2>Title</h2>"));
  assert.ok(clean.includes('<a href="/india" target="_blank" rel="noopener noreferrer">ok</a>'));
  assert.ok(clean.includes('<img src="https://cdn.test/a.jpg" alt="A" />'));
  assert.ok(!clean.includes('src="x"'));
  assert.ok(clean.includes("<figcaption>Cap</figcaption>") && clean.includes('<th colspan="2">') && clean.includes("<h3>Small</h3>"));
  assert.ok(cleanArticleHtml('<a href="//evil.com">x</a>').startsWith("<a>"));
});

test("table of contents gives unique ids, skips reserved ones, and keeps markup", () => {
  const { toc, html } = extractTableOfContents('<h2>Best time</h2><h3>Winter <em>(Nov–Feb)</em></h3><h2>Best time</h2><h2>Quick answer</h2>', ["quick-answer"]);
  assert.deepEqual(toc.map((t) => t.id), ["best-time", "winter-novfeb", "best-time-2", "quick-answer-2"]);
  assert.ok(html.includes('<h3 id="winter-novfeb">Winter <em>(Nov–Feb)</em></h3>'));
});

test("excerpt, read time and slug helpers", () => {
  const long = `<p>${"word ".repeat(500)}</p>`;
  const ex = excerptFromContent(long);
  assert.ok(ex.length <= 201 && ex.endsWith("…"));
  assert.equal(estimateReadTime(long), "2 min read");
  assert.equal(slugify("  Best Time to Visit Kerala — 2026 Guide! "), "best-time-to-visit-kerala-2026-guide");
  assert.deepEqual(authorParts("Dr. Asha Menon / Kerala Editor", "VacayOut"), { name: "Dr. Asha Menon", role: "Kerala Editor", initials: "AM" });
  assert.equal(authorParts("", "VacayOut Team").initials, "VT");
});

test("drafts save with little; publishing requires the essentials", () => {
  const base = { ...blankPost("2026-11-06"), slug: "kerala-monsoon", title: "Kerala in the monsoon", content: "<p>Rain and green hills.</p>" };
  const draft = parseBlogPost(base);
  assert.ok(draft.ok && draft.value.excerpt === "Rain and green hills." && draft.value.readTime === "1 min read");
  const pub = parseBlogPost({ ...base, status: "published" });
  assert.ok(!pub.ok && pub.problems && pub.problems.length >= 4);
  const ready = parseBlogPost({ ...base, status: "published", category: "Seasons", image: "https://x.public.blob.vercel-storage.com/a.webp", imageAlt: "Backwaters", metaTitle: "Kerala monsoon", metaDescription: "What to expect." });
  assert.ok(ready.ok);
  assert.equal(parseBlogPost({ ...base, slug: "Bad Slug" }).ok, false);
  assert.equal(parseBlogPost({ ...base, ctaButtonHref: "javascript:alert(1)" }).ok, false);
  assert.equal(parseBlogPost({ ...base, image: "http://insecure.test/a.jpg" }).ok, false);
});

test("blog settings fall back to defaults for blank or wrong-typed values", () => {
  const s = resolveBlogSettings({ heading: "  ", eyebrow: "Stories", noIndex: true, tocLabel: 5 });
  assert.equal(s.heading, BLOG_DEFAULTS.heading);
  assert.equal(s.eyebrow, "Stories");
  assert.equal(s.noIndex, true);
  assert.equal(s.tocLabel, BLOG_DEFAULTS.tocLabel);
});
