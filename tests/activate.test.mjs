import assert from "node:assert/strict";
import test from "node:test";

import { parseAuthResponse, passwordRules, validatePassword } from "../activate/activate.js";

test("parses an invite without exposing query data", () => {
  const result = parseAuthResponse("https://example.com/activate/#access_token=secret&type=invite");
  assert.deepEqual(result, { accessToken: "secret", type: "invite", error: "" });
});

test("accepts a strong matching password", () => {
  assert.equal(validatePassword("Brivon-QA-2026!", "Brivon-QA-2026!"), "");
  assert.deepEqual(passwordRules("Brivon-QA-2026!"), {
    length: true,
    upper: true,
    lower: true,
    number: true,
    symbol: true,
  });
});

test("rejects weak and mismatched passwords", () => {
  assert.match(validatePassword("weak", "weak"), /requisitos/);
  assert.match(validatePassword("Brivon-QA-2026!", "Outra-QA-2026!"), /não coincidem/);
});
