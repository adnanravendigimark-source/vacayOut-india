import assert from "node:assert/strict";
import { test } from "node:test";
import { StringFieldStream } from "./json-stream";

test("streams one field's decoded text, chunk by chunk, across split escapes", () => {
  const json = JSON.stringify({ scope: "india_travel", kind: "fact", reply: 'Go in "May" —\nit’s dry. \\ok', places: [] });
  const out: string[] = [];
  const s = new StringFieldStream("reply", (t) => out.push(t));
  for (let i = 0; i < json.length; i += 3) s.push(json.slice(i, i + 3));
  assert.equal(out.join(""), 'Go in "May" —\nit’s dry. \\ok');
  assert.equal(s.peek("scope"), "india_travel");
  assert.ok(s.finished);
});

test("a field that never arrives streams nothing", () => {
  const out: string[] = [];
  const s = new StringFieldStream("reply", (t) => out.push(t));
  s.push('{"scope":"off_topic","kind":"other"');
  assert.deepEqual(out, []);
  assert.equal(s.peek("scope"), "off_topic");
});
