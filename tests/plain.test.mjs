// Small test of the plain-English layer (src/lib/plain.ts). Runs with `npm test`.
// Node runs the .ts file directly (type stripping). Fake codes only, no call data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { plainOr, prettify, stepLabel, DISCONNECT_PLAIN } from "../src/lib/plain.ts";

test("prettify turns a code into words", () => {
  assert.equal(prettify("user_hangup"), "User hangup");
  assert.equal(prettify("  dial--no_answer "), "Dial no answer");
});

test("plainOr never comes back empty", () => {
  assert.equal(plainOr(DISCONNECT_PLAIN, null).label, "Not recorded");
  assert.equal(plainOr(DISCONNECT_PLAIN, "").label, "Not recorded");
  assert.equal(plainOr(DISCONNECT_PLAIN, "some_new_code").label, "Some new code");
  assert.equal(plainOr(DISCONNECT_PLAIN, "user_hangup"), DISCONNECT_PLAIN.user_hangup);
});

test("stepLabel hides a raw snake_case code", () => {
  assert.equal(stepLabel("Send send_recap_email"), "Send send recap email");
});

test("every plain entry has a label and a meaning", () => {
  for (const [code, p] of Object.entries(DISCONNECT_PLAIN)) {
    assert.ok(p.label && p.means, `missing words for ${code}`);
  }
});
