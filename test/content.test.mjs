// Guards against the legal copy drifting apart again. The guides, the
// Renters' Rights Act page and the assistant's knowledge must tell one story.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { knowledge } from "../src/chat/knowledge.mjs";

const guides = Object.fromEntries(readdirSync("src/guides").map((f) => [f, readFileSync(`src/guides/${f}`, "utf8")]));
const rra = readFileSync("src/pages/renters-rights-act.html", "utf8");
const all = [...Object.values(guides), rra, knowledge, readFileSync("src/pages/tenants.html", "utf8"), readFileSync("src/pages/index.html", "utf8")].join("\n");

test("private landlords are pointed at Form 3A and Form 4A, never the social housing forms", () => {
  assert.match(guides["possession-after-section-21.md"], /Form 3A/);
  assert.match(guides["increase-rent-section-13.md"], /Form 4A/);
  assert.match(knowledge, /Form 3A/);
  assert.match(knowledge, /Form 4A/);
  // "Form 3" or "Form 4" on its own may only appear where the text says it is the social housing form.
  for (const m of all.matchAll(/[^.\n]*\bForm [34]\b(?!A)[^.\n]*/g)) assert.match(m[0], /social housing/, `bare form number in: ${m[0].trim()}`);
});

test("rent repayment orders are two years everywhere", () => {
  assert.doesNotMatch(all, /twelve months' rent/);
  assert.match(all, /two years' rent/);
});

test("withdrawn or superseded requirements are not presented as current", () => {
  assert.doesNotMatch(all, /current How to Rent|current version of the government's guide/);
  assert.doesNotMatch(all, /from late 2026/);
  assert.doesNotMatch(all, /There was no transition period/);
  assert.match(all, /15 December 2026/);
  assert.match(all, /14 November 2027/);
});

test("the published fees are the same wherever they appear", () => {
  assert.match(knowledge, /Fully managed: 15% of rent collected/);
  assert.match(knowledge, /Rent collection: 10\.8% of rent collected/);
  assert.match(knowledge, /Let only: 9\.6% of the first year's rent/);
  const fees = readFileSync("src/pages/fees.html", "utf8");
  for (const f of ["15%", "10.8%", "9.6%", "£120", "£96", "£90", "£180", "£84", "£240", "£48"]) assert.ok(fees.includes(f), `fees page lost ${f}`);
});

test("no real tenant reference or solicitor claim reaches the public copy", () => {
  const everything = all + readdirSync("src/pages").map((f) => readFileSync(`src/pages/${f}`, "utf8")).join("\n") + readFileSync("test/zoho.test.mjs", "utf8");
  assert.doesNotMatch(everything, /NE23\s?6UN\s?FLAT/i);
  assert.doesNotMatch(everything, /Client Money Protection/i);
  for (const m of everything.matchAll(/[^.\n]*Marchbank[^.\n]*\.[^.\n]*/g)) assert.doesNotMatch(m[0], /\b(our|a) (solicitors?|lawyers?)\b|legal advice from/i);
  assert.match(knowledge, /not a firm of solicitors/);
});

test("no em or en dashes in anything the assistant or the guides say", () => {
  assert.doesNotMatch(all, /[–—]/);
});
