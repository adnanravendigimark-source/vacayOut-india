import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingLinksFor, bookingsBlock } from "./links";
import { isAllowedBookingUrl } from "@/lib/chat/constants";
import { blockSchema } from "@/lib/chat/schema";
import { mapPoints, validPoint } from "@/lib/map";

test("booking links are provider searches on allow-listed hosts", () => {
  delete process.env.BOOKING_AFFILIATE_ID;
  delete process.env.GETYOURGUIDE_PARTNER_ID;
  const links = bookingLinksFor({ name: "Manali", kind: "city", stateName: "Himachal Pradesh" });
  assert.deepEqual(links.map((l) => l.provider), ["Booking.com", "GetYourGuide", "IRCTC", "redBus"]);
  assert.ok(links.every((l) => isAllowedBookingUrl(l.href)));
  assert.equal(new URL(links[0].href).searchParams.get("ss"), "Manali, Himachal Pradesh, India");
  const attraction = bookingLinksFor({ name: "Hadimba Temple", kind: "temple", stateName: "Himachal Pradesh" });
  assert.deepEqual(attraction.map((l) => l.provider), ["GetYourGuide"], "no hotels/trains for a single attraction");
  const block = bookingsBlock({ name: "Manali", kind: "city", stateName: "Himachal Pradesh" });
  assert.ok(blockSchema.safeParse(block).success);
  assert.equal(block?.disclosure, undefined, "no disclosure without affiliate IDs");
});

test("affiliate IDs are added and disclosed; links can be switched off", () => {
  process.env.BOOKING_AFFILIATE_ID = "123";
  process.env.GETYOURGUIDE_PARTNER_ID = "ABC";
  const block = bookingsBlock({ name: "Manali", kind: "city", stateName: null })!;
  assert.equal(new URL(block.items[0].href).searchParams.get("aid"), "123");
  assert.equal(new URL(block.items[1].href).searchParams.get("partner_id"), "ABC");
  assert.match(block.disclosure ?? "", /commission/);
  process.env.BOOKING_LINKS = "off";
  assert.equal(bookingsBlock({ name: "Manali", kind: "city", stateName: null }), null);
  delete process.env.BOOKING_LINKS;
  delete process.env.BOOKING_AFFILIATE_ID;
  delete process.env.GETYOURGUIDE_PARTNER_ID;
});

test("map points stay inside India and skip places without coordinates", () => {
  assert.equal(validPoint(32.24, 77.18), true);
  assert.equal(validPoint(51.5, -0.1), false);
  const pts = mapPoints([
    { name: "Manali", lat: 32.24, lng: 77.19, primary: true },
    { name: "No coords", lat: null, lng: null },
    { name: "London", lat: 51.5, lng: -0.12 },
    { name: "Manali", lat: 32.24, lng: 77.19 },
  ]);
  assert.deepEqual(pts.map((p) => p.name), ["Manali"]);
  assert.ok(blockSchema.safeParse({ type: "map", title: "Manali", points: pts }).success);
  assert.equal(blockSchema.safeParse({ type: "map", title: "x", points: [{ name: "x", lat: 1, lng: 1 }] }).success, false);
  assert.equal(blockSchema.safeParse({ type: "map", title: "x", points: [{ name: "x", lat: 30, lng: 77, href: "https://evil.example" }] }).success, false);
});
