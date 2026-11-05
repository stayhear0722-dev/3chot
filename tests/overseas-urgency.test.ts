// Urgency gate for feishu-overseas-official. No database and no Feishu calls.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  MANDATORY_HORIZON_DAYS,
  admitOverseasRoute,
  assessOverseasUrgency,
  type OverseasUrgencyDecision,
  type OverseasUrgencyInput,
} from "@aihot/backend/notify/overseas-urgency";

const NOW = new Date("2026-11-05T02:00:00.000Z"); // Beijing 2026-11-05 10:00
const emptyUsage = { routineSentToday: 0, incidentSentToday: 0, lastSentAt: null };

function assess(input: OverseasUrgencyInput, now = input.now ?? NOW) {
  return assessOverseasUrgency(input, now);
}

test("Shop Direct portal is an optional feature and does not push", () => {
  const decision = assess({
    title: "Amazon Shop Direct Merchant Workspace 现已开放",
    summary: "卖家可免费、自愿接入 Shop Direct 门户，查看品牌合作机会。没有必须完成的截止日期。",
    sourceName: "About Amazon",
    url: "https://sellercentral.amazon.com/shop-direct",
  });
  assert.equal(decision.pass, false);
  assert.equal(decision.reason, "optional_feature");
});

test("undated TikTok fair-pricing policy keeps a standing cure period from becoming a countdown", () => {
  const decision = assess({
    title: "TikTok Shop 公平定价政策",
    summary: "政策创建于2025年。页面更新日期为2026年11月1日。违规卖家需在7天内整改。本次未说明新的生效日。",
    sourceName: "TikTok Shop 美国政策",
    url: "https://seller-us.tiktok.com/university/fair-pricing",
  });
  assert.equal(decision.pass, false);
  assert.equal(decision.reason, "standing_cure_period");
});

test("undated TikTok restricted-products policy from 2023 is not a new requirement", () => {
  const decision = assess({
    title: "TikTok Shop 限售商品政策",
    summary: "原文创建于2023年，介绍平台限售类目。页面有更新时间，未见新的强制截止日期。",
    sourceName: "TikTok Shop 美国政策",
    url: "https://seller-us.tiktok.com/university/restricted",
  });
  assert.equal(decision.pass, false);
  assert.equal(decision.reason, "stale_or_undated_policy");
});

test("distant APEC stagger advisory is not a closure", () => {
  const decision = assess({
    title: "深圳口岸 APEC 期间错峰出行倡议",
    summary: "倡议企业在11月16日至20日错峰安排通关，并非已经封关，不强制停运。",
    sourceName: "深圳市口岸办",
    url: "http://ka.sz.gov.cn/xxgk/qt/tzgg/apec",
    now: new Date("2026-11-03T02:00:00.000Z"),
  });
  assert.equal(decision.pass, false);
  assert.equal(decision.reason, "advisory");
  assert.ok(MANDATORY_HORIZON_DAYS < 13);
});

test("an APEC advisory still fails inside the horizon", () => {
  const decision = assess({
    title: "深圳口岸 APEC 期间错峰出行倡议",
    summary: "倡议企业在11月8日至10日错峰安排通关，并非已经封关。",
    sourceName: "深圳市口岸办",
    url: "http://ka.sz.gov.cn/xxgk/qt/tzgg/apec",
  });
  assert.equal(decision.reason, "advisory");
});

test("unknown deadline fails closed", () => {
  const decision = assess({
    title: "亚马逊美国站即将调整佣金",
    summary: "具体生效时间另行通知，卖家请关注后续公告。适用于 Amazon.com。",
    sourceName: "Amazon 美国卖家公告",
    url: "https://sellercentral.amazon.com/seller-forums/discussions/fees",
  });
  assert.equal(decision.pass, false);
  assert.equal(decision.reason, "unknown_deadline");
});

test("page-only update fails closed", () => {
  const decision = assess({
    title: "亚马逊美国站卖家政策中心页面已更新",
    summary: "帮助页面于今日重新排版，条款没有新的强制要求和截止日期。",
    sourceName: "Amazon 美国卖家公告",
    url: "https://sellercentral.amazon.com/help/example",
  });
  assert.equal(decision.pass, false);
  assert.equal(decision.reason, "page_only_update");
});

test("a US rule that also mentions the UK site still passes", () => {
  const decision = assess({
    title: "亚马逊美国站11月8日起调整配送费",
    summary: "美国站卖家必须在2026-11-08前更新。英国站规则不同，本条不改变英国站。适用于 Amazon.com。",
    url: "https://sellercentral.amazon.com/seller-forums/discussions/us-fee",
  });
  assert.equal(decision.pass, true);
  assert.equal(decision.kind, "dated_mandatory");
  assert.equal(decision.deadline, "2026-11-08");
});

test("a sellercentral-europe host is not treated as the US site", () => {
  const decision = assess({
    title: "VAT invoice change effective November 7, 2026",
    summary: "UK sellers must submit the new invoice before November 7, 2026.",
    url: "https://sellercentral-europe.amazon.com/seller-forums/discussions/vat",
  });
  assert.equal(decision.pass, false);
  assert.equal(decision.reason, "market_not_us");
});

test("a UK rule is not applied to the US by default", () => {
  const decision = assess({
    title: "英国站增值税发票新规11月7日生效",
    summary: "Seller Central 英国站卖家必须在2026-11-07前提交。不适用于美国站。",
    sourceName: "Amazon 英国卖家公告",
    url: "https://sellercentral-europe.amazon.com/seller-forums/discussions/vat",
  });
  assert.equal(decision.pass, false);
  assert.equal(decision.reason, "market_not_us");
});

test("bare takedown wording is not a current incident", () => {
  const decision = assess({
    title: "亚马逊美国站违规下架说明",
    summary: "介绍哪些情况可能导致商品下架。没有新的截止日期。适用于 Amazon.com。",
    sourceName: "Amazon 美国卖家公告",
    url: "https://sellercentral.amazon.com/help/takedown",
  });
  assert.equal(decision.pass, false);
});

test("dated US Amazon fee change inside the horizon passes", () => {
  const decision = assess({
    title: "亚马逊美国站将于11月8日调整配送费",
    summary: "美国站卖家必须在2026-11-08前更新配送模板，逾期未改的商品将暂停销售。适用于 Amazon.com。",
    sourceName: "Amazon 美国卖家公告",
    url: "https://sellercentral.amazon.com/seller-forums/discussions/fulfillment-fee",
  });
  assert.equal(decision.pass, true);
  assert.equal(decision.kind, "dated_mandatory");
  assert.equal(decision.deadline, "2026-11-08");
});

test("horizon boundaries are 7 days inclusive", () => {
  const onHorizon = assess({
    title: "亚马逊美国站佣金调整",
    summary: "美国站卖家必须在2026-11-12前确认新费率，逾期将无法完成结算。适用于 Amazon.com。",
    url: "https://sellercentral.amazon.com/seller-forums/discussions/referral",
  });
  const pastHorizon = assess({
    title: "亚马逊美国站12月1日起必须使用新标签",
    summary: "美国站卖家须于2026-12-01前完成切换，否则无法发货。适用于 Amazon.com。",
    url: "https://sellercentral.amazon.com/seller-forums/discussions/labels",
  });
  assert.equal(onHorizon.pass, true);
  assert.equal(onHorizon.deadline, "2026-11-12");
  assert.equal(pastHorizon.pass, false);
  assert.equal(pastHorizon.reason, "deadline_not_imminent");
});

test("current US disbursement hold passes as a loss", () => {
  const decision = assess({
    title: "部分美国站卖家账户今日被暂停提现",
    summary: "即日起一批 Amazon.com 卖家资金冻结，后台已无法打款，需立即核对账户健康。",
    sourceName: "Amazon 美国卖家公告",
    url: "https://sellercentral.amazon.com/seller-forums/discussions/hold",
  });
  assert.equal(decision.pass, true);
  assert.equal(decision.kind, "loss_or_incident");
});

test("dated CBP filing change inside the horizon passes", () => {
  const decision = assess({
    title: "CBP：11月9日起进口申报必须填写新字段",
    summary: "美国海关要求进口商必须在2026-11-09前完成系统更新，否则舱单将被拒。",
    sourceName: "美国海关 CBP",
    url: "https://trade.cbp.dhs.gov/ace/dashboard/example",
  });
  assert.equal(decision.pass, true);
  assert.equal(decision.kind, "dated_mandatory");
  assert.equal(decision.deadline, "2026-11-09");
});

test("route caps and the pause watermark", () => {
  const routine: OverseasUrgencyDecision = { pass: true, kind: "dated_mandatory", reason: "dated_mandatory", detail: "", deadline: "2026-11-08" };
  const incident: OverseasUrgencyDecision = { pass: true, kind: "loss_or_incident", reason: "loss_or_incident", detail: "", deadline: null };
  const enabledAt = new Date("2026-11-05T01:00:00.000Z");
  const contentAt = new Date("2026-11-05T01:30:00.000Z");
  const base = { now: NOW, enabledAt, contentAt };

  assert.equal(admitOverseasRoute({ ...base, decision: routine, usage: emptyUsage }).admit, true);
  assert.equal(
    admitOverseasRoute({ ...base, decision: routine, usage: { ...emptyUsage, routineSentToday: 1 } }).reason,
    "daily_cap",
  );
  assert.equal(
    admitOverseasRoute({
      ...base,
      decision: incident,
      usage: { routineSentToday: 1, incidentSentToday: 0, lastSentAt: new Date(NOW.getTime() - 5 * 60_000) },
    }).admit,
    true,
  );
  assert.equal(
    admitOverseasRoute({ ...base, decision: incident, usage: { ...emptyUsage, incidentSentToday: 1 } }).reason,
    "daily_cap",
  );
  assert.equal(
    admitOverseasRoute({
      ...base,
      decision: routine,
      usage: { ...emptyUsage, lastSentAt: new Date(NOW.getTime() - 5 * 60_000) },
    }).reason,
    "interval_cap",
  );
  assert.equal(admitOverseasRoute({ ...base, decision: routine, usage: emptyUsage, enabledAt: null }).reason, "missing_enabled_at");
  assert.equal(
    admitOverseasRoute({ ...base, decision: routine, usage: emptyUsage, contentAt: enabledAt }).reason,
    "before_enabled_at",
  );
  assert.equal(
    admitOverseasRoute({ ...base, decision: { ...routine, pass: false, kind: null, reason: "advisory" }, usage: emptyUsage }).reason,
    "advisory",
  );
});

test("target seed stays disabled and the send path calls the gate", async () => {
  const migration = await readFile(new URL("../database/migrations/0040_overseas_official_notify.sql", import.meta.url), "utf8");
  const push = await readFile(new URL("../packages/backend/src/notify/overseas.ts", import.meta.url), "utf8");
  const schedules = await readFile(new URL("../apps/worker/src/schedules.ts", import.meta.url), "utf8");
  assert.match(migration, /'feishu-overseas-official'/);
  assert.match(migration, /false/);
  assert.doesNotMatch(migration, /SET\s+enabled\s*=\s*true/i);
  assert.match(push, /assessOverseasUrgency/);
  assert.match(push, /ON CONFLICT \(key\) DO NOTHING/);
  assert.match(schedules, /notify\.overseas/);
  assert.match(schedules, /pushOverseas/);
});

test("valve off never calls Feishu", async () => {
  const previous = process.env.FEISHU_OVERSEAS_PUSH_ENABLED;
  process.env.FEISHU_OVERSEAS_PUSH_ENABLED = "false";
  const original = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("{}", { status: 200 });
  };
  try {
    const { sendOverseasOfficialCard } = await import("@aihot/backend/notify/overseas-app");
    const decision: OverseasUrgencyDecision = { pass: true, kind: "dated_mandatory", reason: "dated_mandatory", detail: "截止", deadline: "2026-11-08" };
    const result = await sendOverseasOfficialCard("oc_test", { header: {} }, decision);
    assert.equal(called, false);
    assert.equal(result.sent, false);
    assert.match(result.body, /valve off/);
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) delete process.env.FEISHU_OVERSEAS_PUSH_ENABLED;
    else process.env.FEISHU_OVERSEAS_PUSH_ENABLED = previous;
  }
});
