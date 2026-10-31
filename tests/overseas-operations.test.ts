// Contract of the overseas column without a database. The live reader is not in git;
// these checks lock the query rules and the empty envelope a later RSS fill-in must keep.
import assert from "node:assert/strict";
import { test } from "node:test";
import { OVERSEAS_BRANDS } from "@aihot/industry/overseas-brands";
import { encodeCursor, InvalidCursorError } from "@aihot/backend/lib/cursor";
import { OVERSEAS_DESIGN_CATALOG, loadOverseasDesignResources } from "@aihot/backend/publication/overseas-design";
import {
  knownOverseasBrand,
  loadOverseasCreators,
  loadOverseasOperations,
  OverseasQueryError,
  parseOverseasOperationsQuery,
} from "@aihot/backend/publication/overseas";

test("overseas query defaults and rejections match the live API", () => {
  const parsed = parseOverseasOperationsQuery({});
  assert.deepEqual(
    { focus: parsed.focus, mode: parsed.mode, marketScope: parsed.marketScope, brand: parsed.brand, q: parsed.q, limit: parsed.limit, cursor: parsed.cursor },
    { focus: "all", mode: "all", marketScope: "relevant", brand: null, q: null, limit: 20, cursor: null },
  );
  assert.equal(parseOverseasOperationsQuery({ brand: "nope" }).brand, "nope");
  assert.equal(parseOverseasOperationsQuery({ limit: "0" }).limit, 20);
  assert.equal(parseOverseasOperationsQuery({ limit: "99" }).limit, 40);
  assert.equal(parseOverseasOperationsQuery({ focus: "official", mode: "selected", marketScope: "us" }).focus, "official");

  assert.throws(() => parseOverseasOperationsQuery({ focus: "design" }), (error: unknown) => error instanceof OverseasQueryError && error.message === "unknown overseas focus");
  assert.throws(() => parseOverseasOperationsQuery({ mode: "nope" }), (error: unknown) => error instanceof OverseasQueryError && error.message === "unknown overseas mode");
  assert.throws(() => parseOverseasOperationsQuery({ marketScope: "nope" }), (error: unknown) => error instanceof OverseasQueryError && error.message === "unknown overseas market scope");
  assert.throws(() => parseOverseasOperationsQuery({ cursor: "bad" }), (error: unknown) => error instanceof InvalidCursorError && error.message === "unknown cursor format");
  const cursor = encodeCursor("ops1", { a: 1, i: "item", b: "bind" });
  assert.equal(parseOverseasOperationsQuery({ cursor }).cursor?.i, "item");
});

test("overseas operations envelope is empty until the server reader is copied", async () => {
  const body = await loadOverseasOperations(parseOverseasOperationsQuery({ focus: "creator", q: "prime" }), new Date("2026-10-31T00:00:00.000Z"));
  assert.deepEqual(Object.keys(body).sort(), [
    "brand", "capabilities", "cards", "dayCounts", "filters", "focus", "generatedAt", "hot", "marketScope", "mode", "nextCursor", "officialSources", "q", "refreshAt", "total",
  ]);
  assert.equal(body.focus, "creator");
  assert.equal(body.q, "prime");
  assert.equal(body.total, 0);
  assert.deepEqual(body.cards, []);
  assert.equal(body.nextCursor, null);
  assert.equal(body.capabilities.version, "overseas-ops-v1");
  assert.deepEqual(body.capabilities.amazon, { status: "not_connected", metrics: [], watchlistEnabled: false });
  assert.deepEqual(body.officialSources.map((source) => source.id), [
    "overseas-shenzhen-port-notices",
    "overseas-aboutamazon-shopping",
    "overseas-cbp-csms",
    "overseas-amazon-seller-forum",
  ]);
  assert.equal(body.officialSources.every((source) => source.lastOkAt === null), true);
  assert.equal(knownOverseasBrand("anker"), true);
  assert.equal(OVERSEAS_BRANDS.some((brand) => brand.id === "torras"), true);
});

test("design resources keep the live catalog and no stored items", async () => {
  const body = await loadOverseasDesignResources();
  assert.deepEqual(body.sources.map((source) => [source.id, source.status]), [
    ["overseas-design-bpando", "active"],
    ["overseas-design-yanko", "active"],
    ["overseas-design-pinterest", "not_connected"],
    ["overseas-design-shutterstock", "not_connected"],
    ["overseas-design-zcool", "not_connected"],
  ]);
  assert.equal("feedUrl" in body.sources[0]!, false);
  assert.equal(OVERSEAS_DESIGN_CATALOG[0]?.feedUrl, "https://bpando.org/feed/");
  assert.equal(OVERSEAS_DESIGN_CATALOG[1]?.feedUrl, "https://www.yankodesign.com/feed/");
  assert.equal(body.total, 0);
  assert.deepEqual(body.items, []);
  assert.equal(body.checkedAt, null);
});

test("creator observation page is an empty contract", async () => {
  const body = await loadOverseasCreators(new Date("2026-10-31T00:00:00.000Z"));
  assert.equal(body.windowDays, 30);
  assert.equal(body.recommendationDays, 7);
  assert.equal(body.methodology.length, 6);
  assert.deepEqual(body.creators, []);
  assert.equal(body.generatedAt, "2026-10-31T00:00:00.000Z");
});
