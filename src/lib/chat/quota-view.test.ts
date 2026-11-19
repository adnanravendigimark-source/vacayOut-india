import assert from "node:assert/strict";
import { test } from "node:test";
import { afterAnswer, quotaView, type QuotaInfo } from "./quota-view";

const CHAT = "c1";
const anon = (left: number, chatId: string | null = null): QuotaInfo => ({ signedIn: false, limit: 5, left, chatId });

test("shows 'X of 5 free questions left' to anonymous visitors only", () => {
  assert.equal(quotaView(anon(5), null).hint, "5 of 5 free questions left");
  assert.equal(quotaView({ signedIn: true, limit: 5, left: null, chatId: null }, CHAT).hint, null);
});

test("the sign-up popup opens after the 5th answer, and the input is closed", () => {
  let q: QuotaInfo | null = anon(5);
  const prompts: boolean[] = [];
  for (let left = 4; left >= 0; left--) {
    const r = afterAnswer(q, left, CHAT);
    q = r.next;
    prompts.push(r.promptSignUp);
  }
  assert.deepEqual(prompts, [false, false, false, false, true]);
  const v = quotaView(q, CHAT);
  assert.ok(v.locked);
  assert.match(v.reason ?? "", /5 free questions/);
});

test("a failed try (question given back) neither ties the chat nor prompts", () => {
  const r = afterAnswer(anon(5), 5, CHAT);
  assert.equal(r.promptSignUp, false);
  assert.equal(r.next?.chatId, null);
});

test("anonymous 'New trip' needs sign-up once a conversation is tied; another chat is closed", () => {
  assert.equal(quotaView(anon(5), null).newTripNeedsSignUp, false);
  const tied = afterAnswer(anon(5), 4, CHAT).next;
  assert.equal(quotaView(tied, CHAT).newTripNeedsSignUp, true);
  assert.equal(quotaView(tied, CHAT).locked, false);
  assert.equal(quotaView(tied, "other").locked, true);
  assert.equal(quotaView(tied, null).locked, true, "a blank new chat is closed too");
});
