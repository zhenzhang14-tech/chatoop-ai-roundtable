import test from "node:test";
import assert from "node:assert/strict";
import { pollResult, pollSummary } from "../src/lib/poll.js";
import { TRANSLATIONS } from "../src/i18n/translations.js";

test("poll percentages exclude invalid votes without hiding failed participants", () => {
  const card = {
    models: ["a", "b", "c", "d", "e", "f"],
    options: ["Coffee", "Croissant"],
    votes: [
      { modelId: "a", vote: "Coffee" },
      { modelId: "b", vote: "Croissant" },
      { modelId: "c", vote: "Croissant" },
      { modelId: "d", vote: "Croissant" },
      { modelId: "e", vote: "INVALID" },
      { modelId: "f", vote: "Croissant" },
    ],
  };
  const result = pollResult(card);
  assert.equal(result.valid, 5);
  assert.equal(result.total, 6);
  assert.equal(result.invalid.length, 1);
  assert.equal(result.groups[1].votes.length / result.valid, 0.8);
});
test("a tied poll does not claim a majority", () => {
  assert.match(
    pollSummary(
      { options: ["A", "B"], votes: [{ vote: "A" }, { vote: "B" }] },
      "en",
    ),
    /tie/,
  );
});
test("all failed votes do not imply consensus", () => {
  assert.match(
    pollSummary({ votes: [{ vote: "INVALID" }] }, "en"),
    /no valid votes/,
  );
});
test("English and Chinese dictionaries expose the same feature keys", () => {
  assert.deepEqual(
    Object.keys(TRANSLATIONS.en).sort(),
    Object.keys(TRANSLATIONS.zh).sort(),
  );
});
