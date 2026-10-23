import assert from "node:assert/strict";
import { test } from "node:test";
import { costMicroUsd } from "./cost";
import { discoverPlaces, researchPlaceFacts, traceableEvidence, type EngineDeps } from "./engine";
import type { ResponsesResult } from "./openai";
import { decodeEntities, extractPageDate, fetchPage, htmlToText, isPublicAddress } from "./safe-fetch";
import { authorityOf, normalizeUrl, siteOf } from "./urls";
import { computeVerification, findQuote, needsDateCheck } from "./verify";

test("normalizeUrl strips tracking, fragments and refuses non-web URLs", () => {
  assert.equal(normalizeUrl("https://WWW.Example.com/a/?utm_source=x&b=2#top"), "https://www.example.com/a?b=2");
  assert.equal(normalizeUrl("https://example.com/a/"), "https://example.com/a");
  assert.equal(normalizeUrl("javascript:alert(1)"), null);
  assert.equal(normalizeUrl("file:///etc/passwd"), null);
  assert.equal(normalizeUrl("http://user:pw@example.com/"), null);
  assert.equal(normalizeUrl("http://example.com:8080/"), null);
  assert.equal(normalizeUrl("http://localhost/"), null);
});

test("site and authority: same site isn't independent; gov.in is government", () => {
  assert.equal(siteOf("https://himachaltourism.gov.in/x"), "himachaltourism.gov.in");
  assert.equal(siteOf("https://www.tripadvisor.in/a"), "tripadvisor.in");
  assert.equal(siteOf("https://blog.example.co.in/a"), "example.co.in");
  assert.equal(siteOf("https://en.wikipedia.org/wiki/X"), "wikipedia.org");
  assert.equal(authorityOf("https://himachaltourism.gov.in/x"), "government");
  assert.equal(authorityOf("https://en.wikipedia.org/wiki/X"), "reference");
  assert.equal(authorityOf("https://www.holidify.com/x"), "travel_platform");
  assert.equal(authorityOf("https://random-blog.net/x"), "other");
});

test("verification needs two independent supporting sites; any contradiction is a conflict", () => {
  assert.equal(computeVerification([], null), "unsupported");
  assert.equal(computeVerification([{ support: "quote_not_found", site: "a.com" }], null), "unsupported");
  assert.equal(computeVerification([{ support: "supports", site: "a.gov.in" }], null), "single_source");
  assert.equal(computeVerification([{ support: "supports", site: "a.com" }, { support: "supports", site: "a.com" }], null), "single_source");
  assert.equal(computeVerification([{ support: "supports", site: "a.com" }, { support: "supports", site: "b.com" }], null), "corroborated");
  assert.equal(computeVerification([{ support: "supports", site: "a.com" }, { support: "contradicts", site: "b.com" }], null), "conflicting");
  assert.equal(computeVerification([{ support: "supports", site: "a.com" }, { support: "supports", site: "b.com" }], "Fees differ"), "conflicting");
  assert.equal(computeVerification([{ support: "partial", site: "a.com" }, { support: "partial", site: "b.com" }], null), "unsupported");
});

test("findQuote tolerates whitespace/punctuation changes but not invented text", () => {
  const page = "Hidimba Temple\nOpening time - 08:00 AM\n\nClosing time - 06:00 PM\nThe temple is surrounded by cedar forest.";
  assert.ok(findQuote("Opening time - 08:00 AM Closing time - 06:00 PM", page));
  assert.ok(findQuote("“The temple is surrounded by cedar forest”", page));
  assert.equal(findQuote("The temple is open 24 hours on all days of the week", page), null);
  assert.equal(findQuote("short", page), null);
});

test("time-sensitive claims need a dated source within a year", () => {
  const now = new Date("2026-10-22");
  assert.equal(needsDateCheck("general", [null], now), false);
  assert.equal(needsDateCheck("price", [null], now), true);
  assert.equal(needsDateCheck("price", ["2024-01"], now), true);
  assert.equal(needsDateCheck("opening_hours", ["2026-03-10", null], now), false);
});

test("SSRF guard refuses private, loopback, link-local and mapped addresses", async () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.34", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "224.0.0.1"])
    assert.equal(isPublicAddress(ip), false, ip);
  for (const ip of ["8.8.8.8", "142.250.183.14", "2606:4700:4700::1111"]) assert.equal(isPublicAddress(ip), true, ip);
  const r1 = await fetchPage("http://127.0.0.1/");
  assert.equal(r1.ok, false);
  const r2 = await fetchPage("http://169.254.169.254/latest/meta-data/");
  assert.equal(r2.ok, false);
  const r3 = await fetchPage("http://[::1]/");
  assert.equal(r3.ok, false);
});

test("htmlToText drops scripts and decodes entities; page dates are read from meta", () => {
  const html = `<html><head><title>T &amp; C</title><meta property="article:modified_time" content="2026-02-03T10:00:00Z"><script>evil()</script><style>.a{}</style></head><body><p>Entry fee: &#8377;50 &nbsp;per person</p><div>Open daily</div></body></html>`;
  const text = htmlToText(html);
  assert.ok(text.includes("Entry fee: ₹50 per person"));
  assert.ok(!text.includes("evil"));
  assert.equal(extractPageDate(html), "2026-02-03");
  assert.equal(decodeEntities("&lt;b&gt;"), "<b>");
});

test("cost is metered from usage and search calls", () => {
  // 1M uncached input at $5 + 100k output at $30 + 2 searches at $0.01
  assert.equal(costMicroUsd("gpt-5.5", { input_tokens: 1_000_000, output_tokens: 100_000 }, 2), 5_000_000 + 3_000_000 + 20_000);
  assert.equal(costMicroUsd("gpt-5.5-2026-04-23", { input_tokens: 1000, output_tokens: 0, input_tokens_details: { cached_tokens: 1000 } }), 500);
  assert.ok(costMicroUsd("unknown-model", { input_tokens: 1000, output_tokens: 0 }) >= 10_000);
});

test("traceableEvidence keeps only URLs the search tool consulted", () => {
  const consulted = new Set(["https://a.gov.in/x", "https://b.com/y"]);
  const out = traceableEvidence([{ url: "https://a.gov.in/x/" }, { url: "https://made-up.com/z" }, { url: "https://b.com/y#frag" }, { url: "https://b.com/y" }], consulted);
  assert.deepEqual(out.map((e) => e.url), ["https://a.gov.in/x", "https://b.com/y"]);
});

// ---------- engine with recorded-style model output ----------

function msg(json: unknown, sources: string[], usage = { input_tokens: 10_000, output_tokens: 500 }): ResponsesResult {
  return {
    id: "resp",
    status: "completed",
    usage,
    output: [
      { type: "web_search_call", action: { type: "search", query: "q", sources: sources.map((url) => ({ type: "url", url })) } },
      { type: "message", content: [{ type: "output_text", text: JSON.stringify(json), annotations: [] }] },
    ],
  };
}

test("researchPlaceFacts: drops untraceable sources, checks quotes on the page, judges support", async () => {
  const calls: Record<string, unknown>[] = [];
  const pages: Record<string, string> = {
    "https://himachaltourism.gov.in/hadimba": "Hadimba Devi Temple. Opening time - 08:00 AM. Closing time - 06:00 PM. Built in 1553.",
    "https://www.holidify.com/hadimba": "The temple opens at 8 AM and closes at 6 PM. Entry is free.",
  };
  const deps: EngineDeps = {
    researchModel: "gpt-5.5",
    checkModel: "gpt-5.4-mini",
    fetchPage: async (u) => (pages[u] ? { ok: true, url: u, status: 200, title: "Page", text: pages[u], pageDate: "2026-01-05" } : { ok: false, reason: "HTTP 403" }),
    call: async (body) => {
      calls.push(body);
      if (calls.length === 1) {
        return msg(
          {
            notes: "No reliable source for parking.",
            findings: [
              {
                section: "travel_tips",
                topic: "Opening hours",
                claim: "Hadimba Temple is open 8 AM to 6 PM.",
                claim_type: "opening_hours",
                conflict: null,
                evidence: [
                  { url: "https://himachaltourism.gov.in/hadimba", title: null, quote: "Opening time - 08:00 AM. Closing time - 06:00 PM.", source_date: null },
                  { url: "https://www.holidify.com/hadimba", title: null, quote: "The temple opens at 8 AM and closes at 6 PM.", source_date: "2025-06" },
                ],
              },
              {
                section: "overview",
                topic: "Built",
                claim: "The temple was built in 1553.",
                claim_type: "general",
                conflict: null,
                evidence: [{ url: "https://invented.example.com/page", title: null, quote: "It was built in the year 1553 by Raja Bahadur Singh.", source_date: null }],
              },
              {
                section: "overview",
                topic: "Entry fee",
                claim: "Entry is free.",
                claim_type: "price",
                conflict: null,
                evidence: [{ url: "https://blocked.example.org/fee", title: null, quote: "There is no entry fee for the temple.", source_date: null }],
              },
            ],
          },
          ["https://himachaltourism.gov.in/hadimba", "https://www.holidify.com/hadimba", "https://blocked.example.org/fee"],
        );
      }
      // support check: both quoted passages were found, so both are judged
      const input = String(body.input);
      assert.ok(input.includes("id 0") && input.includes("id 1"));
      return msg({ results: [{ id: 0, verdict: "supports", note: "States the hours." }, { id: 1, verdict: "supports", note: "Same hours." }] }, [], { input_tokens: 1000, output_tokens: 100 });
    },
  };
  const out = await researchPlaceFacts({ name: "Hadimba Temple", kind: "temple", location: "Manali, Himachal Pradesh, India", known: [] }, ["travel_tips"], deps);

  assert.equal(calls.length, 2);
  assert.equal(calls[0].tool_choice, "required");
  assert.match(String(calls[0].input), /untrusted data/);
  assert.equal(out.findings.length, 2, "untraceable claim dropped");
  assert.match(out.notes, /1 claim\(s\) were discarded/);
  const [hours, fee] = out.findings;
  assert.equal(hours.verification, "corroborated");
  assert.equal(hours.evidence[0].authority, "government");
  assert.equal(hours.evidence[0].sourceDate, "2026-01-05", "page-declared date preferred");
  assert.equal(fee.evidence[0].support, "unreachable");
  assert.equal(fee.verification, "unsupported");
  assert.ok(out.usage.costMicroUsd > 0);
  assert.equal(out.usage.searchCalls, 2);
});

test("researchPlaceFacts: quote not on page is never judged as support", async () => {
  let judged = false;
  const deps: EngineDeps = {
    researchModel: "gpt-5.5",
    checkModel: "gpt-5.4-mini",
    fetchPage: async (u) => ({ ok: true, url: u, status: 200, title: null, text: "Completely different content about something else entirely.", pageDate: null }),
    call: async () => {
      if (judged) throw new Error("should not judge");
      judged = true;
      return msg(
        { notes: "", findings: [{ section: "best_time", topic: "Best time", claim: "Best in May.", claim_type: "general", conflict: null, evidence: [{ url: "https://a.com/p", title: null, quote: "May to June is the best time to visit.", source_date: null }] }] },
        ["https://a.com/p"],
      );
    },
  };
  const out = await researchPlaceFacts({ name: "X", kind: "town", location: "India", known: [] }, [], deps);
  assert.equal(out.findings[0].evidence[0].support, "quote_not_found");
  assert.equal(out.findings[0].verification, "unsupported");
});

test("discoverPlaces keeps only candidates with traceable sources", async () => {
  const deps: EngineDeps = {
    researchModel: "gpt-5.5",
    checkModel: "gpt-5.4-mini",
    fetchPage: async () => ({ ok: false, reason: "unused" }),
    call: async () =>
      msg(
        {
          notes: "",
          places: [
            { name: "Solang Valley", kind: "nature", reason: "Snow and adventure sports near Manali.", evidence: [{ url: "https://himachaltourism.gov.in/solang", title: null, quote: "Solang Valley" }] },
            { name: "Fake Falls", kind: "nature", reason: "Made up.", evidence: [{ url: "https://nowhere.example/x", title: null, quote: "Fake Falls" }] },
          ],
        },
        ["https://himachaltourism.gov.in/solang"],
      ),
  };
  const out = await discoverPlaces({ name: "Manali", kind: "city", location: "Himachal Pradesh, India", known: [], existing: [] }, deps);
  assert.deepEqual(out.candidates.map((c) => c.name), ["Solang Valley"]);
  assert.equal(out.candidates[0].evidence[0].site, "himachaltourism.gov.in");
});
