"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePostAction } from "@/app/admin/(protected)/blog/actions";
import { excerptFromContent, slugify, stripHtml, wordCount } from "@/lib/blog/html";
import type { BlogPostInput } from "@/lib/blog/post";
import { ArticleEditor } from "./article-editor";
import { ImageField } from "./image-field";
import { CharCounter, fieldHint, fieldInput, fieldLabel, SeoFieldsCard, SeoPreview, SocialPreview } from "./seo";

const TABS = [
  { key: "content", label: "Content", icon: "📝" },
  { key: "seo", label: "SEO & Preview", icon: "🔍" },
  { key: "advanced", label: "Advanced SEO", icon: "⚙️" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={fieldLabel} htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <p className={fieldHint}>{hint}</p> : null}
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-6">
      <p className="font-semibold text-ink">{title}</p>
      {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      <div className="mt-4 space-y-5">{children}</div>
    </div>
  );
}

export type PlaceOption = { id: string; name: string; kind: string };

export function PostForm({
  id,
  initial,
  places,
  redirects = [],
  canDelete = false,
  deleteButton,
}: {
  /** null for a new post. */
  id: string | null;
  initial: BlogPostInput;
  places: PlaceOption[];
  redirects?: { oldSlug: string }[];
  canDelete?: boolean;
  deleteButton?: React.ReactNode;
}) {
  const router = useRouter();
  const isNew = id === null;
  const [post, setPost] = useState<BlogPostInput>(initial);
  const [savedSlug, setSavedSlug] = useState(initial.slug);
  const [savedStatus, setSavedStatus] = useState(initial.status);
  const [tab, setTab] = useState<TabKey>("content");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; problems?: string[] } | null>(null);
  const [saving, start] = useTransition();

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update<K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) {
    setPost((p) => ({ ...p, [key]: value }));
    setDirty(true);
    setResult(null);
  }

  function updateTitle(value: string) {
    setPost((p) => ({ ...p, title: value, ...(isNew && !slugTouched ? { slug: slugify(value) } : {}) }));
    setDirty(true);
    setResult(null);
  }

  const words = useMemo(() => wordCount(post.content), [post.content]);
  const autoExcerpt = useMemo(() => excerptFromContent(post.content), [post.content]);
  const slugChanged = !isNew && post.slug !== savedSlug;

  const checklist = useMemo(() => {
    const kw = post.focusKeyword.trim().toLowerCase();
    if (!kw) return null;
    const body = stripHtml(post.content).toLowerCase();
    return [
      { label: "Appears in the SEO title", pass: (post.metaTitle || post.title).toLowerCase().includes(kw) },
      { label: "Appears in the H1 title", pass: post.title.toLowerCase().includes(kw) },
      { label: "Appears in the meta description", pass: (post.metaDescription || autoExcerpt).toLowerCase().includes(kw) },
      { label: "Appears in the URL slug", pass: post.slug.includes(slugify(kw)) },
      { label: "Appears early in the article", pass: body.slice(0, 300).includes(kw) },
      { label: "Appears in the hero image alt text", pass: post.imageAlt.toLowerCase().includes(kw) },
      { label: "Article is at least 300 words", pass: words >= 300 },
    ];
  }, [post.focusKeyword, post.metaTitle, post.title, post.metaDescription, autoExcerpt, post.slug, post.content, post.imageAlt, words]);

  function save(status: BlogPostInput["status"]) {
    const payload = { ...post, status };
    start(async () => {
      const r = await savePostAction(id, payload);
      setResult(r);
      if (!r.ok) return;
      setPost(payload);
      setDirty(false);
      setSavedStatus(status);
      if (r.slug) setSavedSlug(r.slug);
      if (isNew && r.id) router.push(`/admin/blog/${r.id}`);
      else router.refresh();
    });
  }

  function cancel() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setDirty(false);
    router.push("/admin/blog");
  }

  const live = savedStatus === "published";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(post.status);
      }}
      className="pb-24"
    >
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Sticky tab bar, so the tabs and "View Post" stay reachable on a long article. */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white/95 p-1.5 shadow-sm backdrop-blur">
          <div className="flex flex-wrap gap-1" role="tablist">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${tab === t.key ? "bg-ink text-white shadow-sm" : "text-ink/70 hover:bg-sand"}`}>
                <span aria-hidden="true">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
          {!isNew && live ? (
            <a href={`/blog/${savedSlug}`} target="_blank" rel="noopener noreferrer" title="Open this post on the live site" className="flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-sm font-medium text-ink/80 hover:bg-sand">
              View Post ↗
            </a>
          ) : null}
        </div>

        {result ? (
          <div role="status" className={`rounded-lg px-3 py-2 text-sm ${result.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>
            {!result.ok && result.problems && result.problems.length > 1 ? "Fix these first:" : result.message}
            {!result.ok && result.problems && result.problems.length > 1 ? (
              <ul className="mt-1 list-disc pl-5">
                {result.problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            ) : null}
          </div>
        ) : null}

        {tab === "content" ? (
          <div className="space-y-5">
            <SectionCard title="Basics" description="What readers see as the title, and where the page lives.">
              <Field label="Title (H1 on the page)" htmlFor="post-title">
                <input id="post-title" required value={post.title} onChange={(e) => updateTitle(e.target.value)} className={fieldInput} placeholder="e.g. Best Time to Visit Kerala" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="URL slug"
                  htmlFor="post-slug"
                  hint={
                    isNew
                      ? `Auto-fills from the title. Page will live at /blog/${post.slug || "…"}`
                      : slugChanged
                        ? `Changing this redirects the old address (/blog/${savedSlug}) to the new one, so links and rankings aren’t lost.`
                        : "Safe to change — the old address will redirect to the new one."
                  }
                >
                  <input
                    id="post-slug"
                    required
                    value={post.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      update("slug", slugify(e.target.value));
                    }}
                    className={`${fieldInput} ${slugChanged ? "border-amber-400 bg-amber-50" : ""}`}
                    placeholder="best-time-to-visit-kerala"
                  />
                </Field>
                <Field label="Category" htmlFor="post-category">
                  <input id="post-category" value={post.category} onChange={(e) => update("category", e.target.value)} className={fieldInput} placeholder="e.g. Trip Planning" />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Publish date" htmlFor="post-date">
                  <input id="post-date" type="date" required value={post.publishDate} onChange={(e) => update("publishDate", e.target.value)} className={fieldInput} />
                </Field>
                <Field label="Read time" htmlFor="post-read" hint="Leave blank to calculate it from the article length.">
                  <input id="post-read" value={post.readTime} onChange={(e) => update("readTime", e.target.value)} className={fieldInput} placeholder={`e.g. ${Math.max(1, Math.round(words / 220))} min read`} />
                </Field>
              </div>
              <Field label="Author" htmlFor="post-author" hint='Shown as the byline ("By <name>"). Format: "Name / Role", e.g. "Asha Menon / Kerala Editor".'>
                <input id="post-author" value={post.author} onChange={(e) => update("author", e.target.value)} className={fieldInput} placeholder="e.g. Asha Menon / Kerala Editor" />
              </Field>
              <ImageField
                label="Hero image"
                value={post.image}
                onChange={(url) => update("image", url)}
                aspect="aspect-[21/9]"
                onCredit={(credit, alt) => {
                  setPost((p) => ({ ...p, imageCredit: credit ?? p.imageCredit, imageAlt: p.imageAlt || alt }));
                  setDirty(true);
                }}
              />
              <Field label="Image alt text" htmlFor="post-alt" hint="Describe the photo for screen readers and Google Images.">
                <input id="post-alt" value={post.imageAlt} onChange={(e) => update("imageAlt", e.target.value)} className={fieldInput} />
              </Field>
              <Field label="Image credit (optional)" htmlFor="post-credit" hint="Shown under the cover. Required for licensed photos (e.g. “Photo: Jane Doe (CC BY-SA 4.0)”) — filled in for you when you pick from the Media Library.">
                <input id="post-credit" value={post.imageCredit} onChange={(e) => update("imageCredit", e.target.value)} className={fieldInput} />
              </Field>
            </SectionCard>

            <SectionCard title="Summary" description="Shown on the blog listing card and at the top of the article.">
              <div>
                <p className={fieldLabel}>Excerpt</p>
                <p className={`${fieldInput} min-h-[3.5rem] cursor-default bg-canvas text-ink/70`}>
                  <span className="line-clamp-3">{autoExcerpt || "Start writing the article below and this fills in automatically."}</span>
                </p>
                <p className={fieldHint}>Auto-generated from the article content (3 lines, then “…”). Nothing to fill in here.</p>
              </div>
              <Field label="Quick Answer callout" htmlFor="post-qa" hint="The highlighted “TL;DR” box at the top of the article. Leave blank to hide it.">
                <textarea id="post-qa" rows={2} value={post.quickAnswer} onChange={(e) => update("quickAnswer", e.target.value)} className={fieldInput} />
              </Field>
            </SectionCard>

            <SectionCard title="Article Content" description="Write the article top to bottom, like a normal document. Use the toolbar for headings, bold, links, lists, tables or images.">
              <ArticleEditor value={post.content} onChange={(html) => update("content", html)} placeholder="Write the article here… use the toolbar for headings, bold, links, lists, tables, or images." stickyOffset="3.75rem" />
              <p className="text-xs text-muted">~{words} words in the article body.</p>
              <div className="border-t border-line pt-5">
                <Field label="Recommended destination (optional)" htmlFor="post-place" hint="Shows that destination’s card under the article, before the closing box. Only published destinations are listed.">
                  <select id="post-place" value={post.recommendedPlaceId ?? ""} onChange={(e) => update("recommendedPlaceId", e.target.value || null)} className={fieldInput}>
                    <option value="">None</option>
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.kind})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Closing call-to-action" description="The box at the end of the article.">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Heading" htmlFor="cta-h"><input id="cta-h" value={post.ctaHeading} onChange={(e) => update("ctaHeading", e.target.value)} className={fieldInput} /></Field>
                <Field label="Button text" htmlFor="cta-b"><input id="cta-b" value={post.ctaButtonText} onChange={(e) => update("ctaButtonText", e.target.value)} className={fieldInput} /></Field>
              </div>
              <Field label="Body text" htmlFor="cta-body"><textarea id="cta-body" rows={2} value={post.ctaBody} onChange={(e) => update("ctaBody", e.target.value)} className={fieldInput} /></Field>
              <Field label="Button link" htmlFor="cta-href" hint="A site path (e.g. /chat or /india/kerala) or a full https:// URL. Leave the heading blank to hide the box.">
                <input id="cta-href" value={post.ctaButtonHref} onChange={(e) => update("ctaButtonHref", e.target.value)} className={fieldInput} />
              </Field>
              {post.ctaHeading ? (
                <div className="rounded-2xl border border-coral/20 bg-coral-soft p-6">
                  <p className="text-sm font-semibold text-ink">{post.ctaHeading}</p>
                  <p className="mt-1 text-sm text-ink/70">{post.ctaBody}</p>
                  {post.ctaButtonText ? <span className="mt-4 inline-flex rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white">{post.ctaButtonText}</span> : null}
                </div>
              ) : null}
            </SectionCard>
          </div>
        ) : null}

        {tab === "seo" ? (
          <div className="space-y-5">
            <SectionCard title="Search & Preview" description="How this post shows up on Google.">
              <Field label="SEO title" htmlFor="post-mt" hint="The blue link text in Google results. Required to publish.">
                <input id="post-mt" value={post.metaTitle} onChange={(e) => update("metaTitle", e.target.value)} className={fieldInput} />
                <CharCounter length={post.metaTitle.length} min={40} max={60} />
              </Field>
              <Field label="Meta description" htmlFor="post-md" hint="The grey snippet under the title in Google results. Required to publish.">
                <textarea id="post-md" rows={3} value={post.metaDescription} onChange={(e) => update("metaDescription", e.target.value)} className={fieldInput} />
                <CharCounter length={post.metaDescription.length} min={120} max={158} />
              </Field>
              <SeoPreview title={post.metaTitle || post.title} description={post.metaDescription || autoExcerpt} path={`/blog/${post.slug || "…"}`} />
            </SectionCard>
            <SectionCard title="Social Share Preview" description="What this looks like when the link is shared on Facebook, WhatsApp or X.">
              <SocialPreview title={post.ogTitle || post.metaTitle || post.title} description={post.ogDescription || post.metaDescription || autoExcerpt} image={post.ogImage || post.image} />
            </SectionCard>
            <SeoFieldsCard
              pathHint={`/blog/${post.slug || "…"}`}
              value={{ canonicalUrl: post.canonicalUrl, noIndex: post.noIndex, noFollow: post.noFollow, ogTitle: post.ogTitle, ogDescription: post.ogDescription, ogImage: post.ogImage }}
              onChange={(patch) => {
                setPost((p) => ({ ...p, ...patch }));
                setDirty(true);
                setResult(null);
              }}
            />
          </div>
        ) : null}

        {tab === "advanced" ? (
          <div className="space-y-5">
            <SectionCard title="Focus keyword" description="The main phrase you want this post to rank for. A writing aid only — nothing here is sent to Google.">
              <Field label="Focus keyword" htmlFor="post-kw">
                <input id="post-kw" value={post.focusKeyword} onChange={(e) => update("focusKeyword", e.target.value)} className={fieldInput} placeholder="e.g. best time to visit kerala" />
              </Field>
              {checklist ? (
                <ul className="space-y-1.5 rounded-xl border border-line bg-canvas p-4 text-sm">
                  {checklist.map((i) => (
                    <li key={i.label} className={`flex items-center gap-2 ${i.pass ? "text-emerald-800" : "text-amber-800"}`}>
                      <span aria-hidden>{i.pass ? "✓" : "!"}</span>
                      {i.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </SectionCard>
            <SectionCard title="Schema, sitemap & redirects" description="Technical SEO that is wired up automatically for every post.">
              <ul className="space-y-2 text-sm text-ink/80">
                <li>✓ Article structured data (headline, image, publish/update dates, author) is added automatically.</li>
                <li>✓ <code className="rounded bg-sand px-1 py-0.5 text-xs">/sitemap.xml</code> lists this post while it is published and indexable, with its last-modified date.</li>
                <li>✓ Changing the URL slug 301-redirects the old address here — no broken links.</li>
              </ul>
              {redirects.length ? (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Old addresses that redirect here</p>
                  <ul className="space-y-1 text-sm">
                    {redirects.map((r) => (
                      <li key={r.oldSlug} className="rounded-lg bg-canvas px-3 py-1.5 font-mono text-xs">/blog/{r.oldSlug} → /blog/{savedSlug}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="text-xs text-muted">Indexing (index/follow) is set on the “SEO &amp; Preview” tab.</p>
            </SectionCard>
            {canDelete && deleteButton ? (
              <SectionCard title="Danger zone" description="Deleting removes the post and its redirects for good. To take it off the site but keep it, save it as a draft instead.">
                {deleteButton}
              </SectionCard>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:pl-60">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            <span className={`mr-2 inline-flex rounded-full px-2 py-0.5 font-semibold ${live ? "bg-emerald-100 text-emerald-900" : "bg-sand text-ink"}`}>{live ? "Published" : "Draft"}</span>
            {result && !result.ok ? <span className="font-semibold text-red-800">{result.problems && result.problems.length > 1 ? `${result.problems.length} things to fix — see the top of the page` : result.message}</span> : dirty ? "Unsaved changes" : "All changes saved"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={cancel} className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-sand">Cancel</button>
            <button type="button" disabled={saving} onClick={() => save("draft")} className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:border-ink disabled:opacity-60">
              {live ? "Unpublish (save as draft)" : "Save draft"}
            </button>
            <button type="button" disabled={saving} onClick={() => save("published")} className="rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-hover disabled:opacity-60">
              {saving ? "Saving…" : live ? "Save Changes" : "Publish Post"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
