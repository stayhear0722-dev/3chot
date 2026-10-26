// Homepage fold denylist: three ops-rejected ids stay out of prominence queries.
// Brand-keep and charging-keep ids must not be on the list. No database.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { HOME_FOLD_EXCLUDED_IDS, isExcludedFromHomeFold } from "@aihot/industry/home-fold-exclusions";

const REJECTED = [
  "bkxsiqhtcbh9mqj1921kzvx42",
  "uxr1dhska5s0q262up8rrdbm5",
  "wy3928ccxqnhqtb97r9kwn0n6",
] as const;

// Satisfied brand / charging samples from the same review. They stay eligible for the fold.
const KEEP = [
  "pf8bubqx8pnyrg818wioeucs5",
  "aki9ipve9xqaadpuar4anqs9b",
  "ku9fd88xum2neylpg0amdoft4",
] as const;

test("homepage fold denylist is only the three rejected items", () => {
  assert.deepEqual([...HOME_FOLD_EXCLUDED_IDS], [...REJECTED]);
  for (const id of REJECTED) assert.equal(isExcludedFromHomeFold(id), true);
  for (const id of KEEP) assert.equal(isExcludedFromHomeFold(id), false);
});

test("selected home timeline and topic column queries apply the denylist", () => {
  const items = readFileSync(new URL("../packages/backend/src/publication/items.ts", import.meta.url), "utf8");
  const topics = readFileSync(new URL("../packages/backend/src/publication/topics.ts", import.meta.url), "utf8");
  assert.match(items, /export function selectedCondition\(now: Date\) \{\s*return sql`p\.visibility = 'public' AND p\.selected AND p\.visible_after <= \$\{now\} AND \$\{homeFoldExclusion\(\)\}`;/);
  assert.match(topics, /WHERE \$\{selectedCondition\(now\)\} AND \$\{homeFoldExclusion\(\)\} AND p\.tags &&/);
  assert.match(topics, /p\.visibility = 'public' AND p\.selected AND \$\{homeFoldExclusion\(\)\}/);
  assert.equal(items.includes("pf8bubqx8pnyrg818wioeucs5"), false);
  assert.equal(topics.includes("pf8bubqx8pnyrg818wioeucs5"), false);
});
