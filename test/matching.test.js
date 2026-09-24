import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalise,
  matchOptions,
  mergeRanges,
  highlightParts,
  collectOptions,
  canonical,
  listItems,
} from "../autocomplete-text-row.js";

const TEAS = [
  "Assam",
  "Crème Brûlée Rooibos",
  "Darjeeling First Flush",
  "Earl Grey",
  "Earl Grey Cream",
  "Lady Grey",
  "Sencha",
];

const names = (matches) => matches.map((m) => m.option);

test("normalise lower-cases and strips diacritics", () => {
  assert.equal(normalise("Crème Brûlée"), "creme brulee");
  assert.equal(normalise(42), "42");
});

test("empty query lists every option in order", () => {
  assert.deepEqual(names(matchOptions(TEAS, "")), TEAS);
  assert.deepEqual(names(matchOptions(TEAS, "   ")), TEAS);
});

test("words match anywhere, in any order", () => {
  assert.deepEqual(names(matchOptions(TEAS, "grey earl")), ["Earl Grey", "Earl Grey Cream"]);
  assert.deepEqual(names(matchOptions(TEAS, "cream grey")), ["Earl Grey Cream"]);
});

test("matching ignores case and accents in both directions", () => {
  assert.deepEqual(names(matchOptions(TEAS, "CREME")), ["Crème Brûlée Rooibos"]);
  assert.deepEqual(names(matchOptions(["Creme"], "crème")), ["Creme"]);
});

test("no match returns an empty list", () => {
  assert.deepEqual(matchOptions(TEAS, "matcha"), []);
});

test("prefix matches rank first, then word starts, then anything", () => {
  // One prefix match, three word-start matches, one mid-word match.
  const opts = ["Oolong greyish", "Earl Grey", "Lady Grey", "Grey Lady", "Ungrey"];
  assert.deepEqual(names(matchOptions(opts, "grey")), [
    "Grey Lady",
    "Oolong greyish",
    "Earl Grey",
    "Lady Grey",
    "Ungrey",
  ]);
});

test("regex characters in the query are matched literally", () => {
  const opts = ["C++ blend", "Cx blend", "(special)"];
  assert.deepEqual(names(matchOptions(opts, "c++")), ["C++ blend"]);
  assert.deepEqual(names(matchOptions(opts, "(spec")), ["(special)"]);
});

test("ranges point at each word's first match", () => {
  const [m] = matchOptions(["Earl Grey Cream"], "cream earl");
  assert.deepEqual(m.ranges, [[10, 15], [0, 4]]);
});

test("mergeRanges sorts and joins overlapping or touching ranges", () => {
  assert.deepEqual(mergeRanges([[5, 8], [0, 2], [1, 3], [8, 9]]), [[0, 3], [5, 9]]);
  assert.deepEqual(mergeRanges([]), []);
});

test("mergeRanges does not mutate its input", () => {
  const input = [[3, 5], [0, 4]];
  mergeRanges(input);
  assert.deepEqual(input, [[3, 5], [0, 4]]);
});

test("highlightParts splits an option into matched and unmatched runs", () => {
  const [m] = matchOptions(["Earl Grey Cream"], "grey");
  assert.deepEqual(highlightParts(m.option, m.ranges), [
    { text: "Earl ", match: false },
    { text: "Grey", match: true },
    { text: " Cream", match: false },
  ]);
});

test("highlightParts keeps the original accented characters", () => {
  const [m] = matchOptions(["Crème Brûlée"], "brulee");
  assert.deepEqual(highlightParts(m.option, m.ranges), [
    { text: "Crème ", match: false },
    { text: "Brûlée", match: true },
  ]);
});

test("highlightParts gives up rather than mis-highlighting when lengths shift", () => {
  // Decomposed input: normalising drops the combining mark, so indices drift.
  const decomposed = "Cre\u0300me";
  const [m] = matchOptions([decomposed], "me");
  assert.deepEqual(highlightParts(m.option, m.ranges), [{ text: decomposed, match: false }]);
});

test("highlightParts with no ranges returns the whole option", () => {
  assert.deepEqual(highlightParts("Assam", []), [{ text: "Assam", match: false }]);
});

const BRANDS = ["Al Fakher", "Adalya", "Darkside", "Crème Co"];

test("collectOptions puts fixed options first and drops blanks and duplicates", () => {
  assert.deepEqual(
    collectOptions(["Darkside", "Tangiers"], ["Adalya", "", null, " Darkside ", 7]),
    ["Darkside", "Tangiers", "Adalya", "7"],
  );
});

test("collectOptions ignores anything that is not a list", () => {
  assert.deepEqual(collectOptions(undefined, "Adalya, Darkside"), []);
  assert.deepEqual(collectOptions(null, { a: 1 }), []);
});

test("canonical snaps case and accent variants to the suggestion's spelling", () => {
  assert.equal(canonical(BRANDS, "al fakher"), "Al Fakher");
  assert.equal(canonical(BRANDS, "  creme co "), "Crème Co");
});

test("canonical keeps new text as typed, trimmed", () => {
  assert.equal(canonical(BRANDS, "  Tangiers "), "Tangiers");
  assert.equal(canonical(BRANDS, ""), "");
  assert.equal(canonical([], null), "");
});

const shown = (items) => items.map((it) => it.custom != null ? `+${it.custom}` : it.option);

test("listItems offers the typed text after the matches when it is new", () => {
  assert.deepEqual(shown(listItems(BRANDS, "a")), ["Al Fakher", "Adalya", "Darkside", "+a"]);
  assert.deepEqual(shown(listItems(BRANDS, "Tangiers")), ["+Tangiers"]);
});

test("listItems offers nothing extra when the text already is a suggestion", () => {
  assert.deepEqual(shown(listItems(BRANDS, "adalya")), ["Adalya"]);
  assert.deepEqual(shown(listItems(BRANDS, "CREME CO")), ["Crème Co"]);
});

test("listItems moves an exact match above longer ones", () => {
  const opts = ["Grape Mint", "Grape"];
  assert.deepEqual(shown(listItems(opts, "grape")), ["Grape", "Grape Mint"]);
});

test("listItems with nothing typed lists every suggestion and no extra item", () => {
  assert.deepEqual(shown(listItems(BRANDS, "  ")), BRANDS);
  assert.deepEqual(listItems([], ""), []);
});
