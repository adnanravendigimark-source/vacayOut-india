import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { attributionFor, fetchCommonsImage, licenceVerdict, parseFiles, plainText } from "./commons";

// Recorded from the real Commons API (search "Hadimba Temple"), trimmed to 3 files.
const fixture = JSON.parse(readFileSync(new URL("./__fixtures__/commons-search.json", import.meta.url), "utf8"));

test("licence allow-list: free licences only", () => {
  const ok = (License: string, LicenseShortName = "") => licenceVerdict({ License, LicenseShortName }).allowed;
  assert.equal(ok("cc-by-sa-4.0", "CC BY-SA 4.0"), true);
  assert.equal(ok("cc-by-2.0", "CC BY 2.0"), true);
  assert.equal(ok("cc0", "CC0"), true);
  assert.equal(ok("pd", "Public domain"), true);
  assert.equal(ok("cc-by-nc-sa-4.0", "CC BY-NC-SA 4.0"), false);
  assert.equal(ok("cc-by-nd-3.0", "CC BY-ND 3.0"), false);
  assert.equal(ok("", "Fair use"), false);
  assert.equal(ok("gfdl", "GFDL"), false);
  assert.equal(licenceVerdict({ License: "cc-by-sa-4.0", NonFree: "true" }).allowed, false);
});

test("parses real Commons metadata into plain-text credits", () => {
  const files = parseFiles(fixture);
  assert.equal(files.length, 3);
  for (const f of files) {
    assert.equal(f.allowed, true, f.title);
    assert.equal(f.license, "CC BY-SA 4.0");
    assert.ok(!/[<>]/.test(f.artist), "HTML stripped from artist");
    assert.match(f.descriptionUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  }
  assert.match(attributionFor(files[0]), / via Wikimedia Commons$/);
  assert.equal(plainText('<a href="x">Jane &amp; Co</a>'), "Jane & Co");
});

function fakeFetch(routes: Record<string, () => Response>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    for (const [prefix, make] of Object.entries(routes)) if (url.startsWith(prefix)) return make();
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
}

const one = (thumburl: string, license = "cc-by-sa-4.0") => ({
  query: { pages: [{ pageid: 7, title: "File:X.jpg", imageinfo: [{ url: thumburl, descriptionurl: "https://commons.wikimedia.org/wiki/File:X.jpg", thumburl, width: 1920, height: 1280, mime: "image/jpeg", extmetadata: { License: { value: license }, LicenseShortName: { value: "CC BY-SA 4.0" }, Artist: { value: "<b>Ann</b>" } } }] }] },
});
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

test("import downloads only from Wikimedia hosts and re-checks the licence", async () => {
  const good = await fetchCommonsImage(7, fakeFetch({
    "https://commons.wikimedia.org/": () => Response.json(one("https://upload.wikimedia.org/a/x.jpg")),
    "https://upload.wikimedia.org/": () => new Response(jpeg, { headers: { "content-type": "image/jpeg" } }),
  }));
  assert.deepEqual([...good.bytes], [...jpeg]);

  await assert.rejects(
    fetchCommonsImage(7, fakeFetch({ "https://commons.wikimedia.org/": () => Response.json(one("https://evil.example/x.jpg")) })),
    /Unexpected image host/,
  );
  await assert.rejects(
    fetchCommonsImage(7, fakeFetch({
      "https://commons.wikimedia.org/": () => Response.json(one("https://upload.wikimedia.org/a/x.jpg")),
      "https://upload.wikimedia.org/": () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }),
    })),
    /Unexpected image/,
  );
  await assert.rejects(
    fetchCommonsImage(7, fakeFetch({ "https://commons.wikimedia.org/": () => Response.json(one("https://upload.wikimedia.org/a/x.jpg", "cc-by-nc-4.0")) })),
    /commercial/,
  );
  await assert.rejects(
    fetchCommonsImage(7, fakeFetch({
      "https://commons.wikimedia.org/": () => Response.json(one("https://upload.wikimedia.org/a/x.jpg")),
      "https://upload.wikimedia.org/": () => new Response(new Uint8Array(6 * 1024 * 1024)),
    })),
    /larger than 5 MB/,
  );
});
