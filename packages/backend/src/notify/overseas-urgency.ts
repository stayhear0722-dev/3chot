// Deterministic urgency gate for the overseas official Feishu target.
// Official + selected + the live window is not enough: the group only hears about a US-Amazon
// (or directly related cross-border) item when there is a current loss/incident, or a mandatory
// change with a known deadline inside the horizon. Unknown deadlines, page-only updates, optional
// portals, standing cure periods, and advisories fail closed. No model call.
import { beijingDate, isValidDate } from "@aihot/contracts/time";

export const OVERSEAS_OFFICIAL_TARGET = "feishu-overseas-official";

/** Calendar days, Beijing. A mandatory change further out stays on the site. */
export const MANDATORY_HORIZON_DAYS = 7;
/** Routine cards per Asia/Shanghai day on this one route. */
export const ROUTINE_DAILY_CAP = 1;
/** Extra cards per day for a current loss or incident. Not a second routine slot. */
export const INCIDENT_EXTRA_DAILY_CAP = 1;
/**
 * Minimum gap after a routine card. A current loss/incident may use its extra slot inside this
 * gap; a second routine may not.
 */
export const MIN_INTERVAL_MS = 60 * 60 * 1000;

export type OverseasUrgencyKind = "loss_or_incident" | "dated_mandatory";

export interface OverseasUrgencyInput {
  title: string;
  summary?: string | null;
  /** Already-fetched excerpt. Used as evidence, never as instructions. */
  text?: string | null;
  sourceName?: string | null;
  url?: string | null;
  now?: Date;
}

export interface OverseasUrgencyDecision {
  pass: boolean;
  kind: OverseasUrgencyKind | null;
  /** Stable code. Tests and delivery notes use this, not the prose. */
  reason: string;
  /** Operator-facing explanation. */
  detail: string;
  /** Action deadline (Beijing calendar day) when one was trusted. */
  deadline: string | null;
}

export interface OverseasRouteUsage {
  routineSentToday: number;
  incidentSentToday: number;
  lastSentAt: Date | null;
}

export function assessOverseasUrgency(input: OverseasUrgencyInput, now = input.now ?? new Date()): OverseasUrgencyDecision {
  const evidence = [input.title, input.summary, input.text].filter(Boolean).join("\n");
  const market = [evidence, input.sourceName, input.url].filter(Boolean).join("\n");
  const today = beijingDate(now);

  if (isOtherMarket(market)) return deny("market_not_us", "其他站点的政策不能默认套用到美国站", null);
  if (isOptionalPortal(evidence)) return deny("optional_feature", "可选功能或免费接入门户，没有迫近的强制截止", null);
  if (isAdvisory(evidence)) return deny("advisory", "倡议或非强制安排，不能当成已经发生的限制", null);
  if (!isUsOrCrossBorder(market)) return deny("market_unknown", "看不出是否与美国站运营或直接相关的跨境业务有关", null);
  if (isCurrentLoss(evidence)) return allow("loss_or_incident", "正在发生的账户、资金或履约中断", null);

  const deadline = earliestActionDeadline(evidence, today);
  const standing = isStandingCure(evidence);
  const stale = isStalePolicy(evidence, today);
  if (!deadline && standing) return deny("standing_cure_period", "常设整改期限不是本次变化的新倒计时", null);
  if (!deadline && stale) return deny("stale_or_undated_policy", "未见本次新的强制生效日，旧的创建时间不能当成新要求", null);
  if (!deadline && isUnknownDeadline(evidence)) return deny("unknown_deadline", "没有可核验的生效或截止日期", null);
  if (!deadline && isPageOnly(evidence)) return deny("page_only_update", "只看到页面更新，没有新的强制要求", null);
  if (!deadline || !isMandatory(evidence)) return deny("not_enough_evidence", "没有正在发生的损失，也没有带日期的强制变化", null);

  const days = daysUntil(today, deadline);
  if (days < -1) return deny("stale_or_undated_policy", "强制日期已经过去，不能当成新的紧急要求", deadline);
  if (days > MANDATORY_HORIZON_DAYS) return deny("deadline_not_imminent", `强制变化在 ${days} 天后，超出 ${MANDATORY_HORIZON_DAYS} 天窗口`, deadline);
  return allow("dated_mandatory", `强制变化的行动截止是 ${deadline}（北京时间，${days} 天内）`, deadline);
}

/**
 * Route cap and the pause watermark. `enabledAt` is stamped by setTargetEnabled when the target
 * flips on, so items from the pause window (contentAt <= enabledAt) are not backfilled.
 * Equal timestamps fail closed: a database microsecond can collapse to the same millisecond.
 */
export function admitOverseasRoute(input: {
  decision: OverseasUrgencyDecision;
  usage: OverseasRouteUsage;
  now: Date;
  enabledAt: Date | null;
  contentAt: Date;
}): { admit: boolean; reason: string } {
  if (!input.decision.pass || !input.decision.kind) return { admit: false, reason: input.decision.reason };
  if (!input.enabledAt) return { admit: false, reason: "missing_enabled_at" };
  if (input.contentAt.getTime() <= input.enabledAt.getTime()) return { admit: false, reason: "before_enabled_at" };
  if (input.decision.kind === "dated_mandatory") {
    if (input.usage.routineSentToday >= ROUTINE_DAILY_CAP) return { admit: false, reason: "daily_cap" };
    if (input.usage.lastSentAt && input.now.getTime() - input.usage.lastSentAt.getTime() < MIN_INTERVAL_MS) {
      return { admit: false, reason: "interval_cap" };
    }
  } else if (input.usage.incidentSentToday >= INCIDENT_EXTRA_DAILY_CAP) {
    return { admit: false, reason: "daily_cap" };
  }
  return { admit: true, reason: input.decision.reason };
}

function allow(kind: OverseasUrgencyKind, detail: string, deadline: string | null): OverseasUrgencyDecision {
  return { pass: true, kind, reason: kind, detail, deadline };
}

function deny(reason: string, detail: string, deadline: string | null): OverseasUrgencyDecision {
  return { pass: false, kind: null, reason, detail, deadline };
}

function withoutOtherAmazonHosts(text: string): string {
  return text.replace(/sellercentral-europe\.amazon\.com|amazon\.co\.uk/gi, "");
}

function mentionsUs(text: string): boolean {
  return /美国站|亚马逊美国|amazon\.com|sellercentral\.amazon\.com|ATVPDKIKX0DER|北美站/i.test(withoutOtherAmazonHosts(text));
}

function isOtherMarket(text: string): boolean {
  const uk = /英国站|sellercentral-europe|amazon\.co\.uk|A1F83G8C2ARO7P|UK seller/i.test(text);
  if (!uk) return false;
  // A US notice that also mentions the UK site stays in scope. An explicit non-US line does not.
  if (mentionsUs(text) && !/不适用于美国/.test(text)) return false;
  return !/同样适用于美国|也适用于美国站|美国站同步|also applies to (?:the )?U\.?S/i.test(text);
}

function isOptionalPortal(text: string): boolean {
  return /shop direct|merchant workspace|免费接入|可选(?:的)?(?:免费)?接入|opt-?in portal|自愿接入/i.test(text);
}

function isAdvisory(text: string): boolean {
  return /倡议|错峰|advisory|并非(?:已经)?封关|不是封关|不强制/i.test(text);
}

function isUsOrCrossBorder(text: string): boolean {
  const body = withoutOtherAmazonHosts(text);
  return /美国站|亚马逊美国|amazon\.com|sellercentral\.amazon\.com|ATVPDKIKX0DER|北美站|美国海关|\bCBP\b|cbp\.gov|customs and border|口岸办|口岸通关|ka\.sz\.gov\.cn|tiktok shop|seller-us\.tiktok\.com/i.test(body);
}

function isCurrentLoss(text: string): boolean {
  const now = /即日起|今日起|今日被|effective immediately|currently unable/i.test(text);
  const harm = /资金冻结|暂停提现|无法打款|配送中断|账户[^。\n]{0,16}暂停|已被(?:暂停|冻结)|已经(?:暂停|冻结|中断)|disbursements? (?:are |is )?(?:paused|held|frozen)|accounts? (?:have been |are )?suspended/i.test(text);
  return now && harm;
}

function isStandingCure(text: string): boolean {
  return /\d+\s*(?:天|days?)\s*(?:内)?(?:完成)?(?:整改|remediat|申诉|cure)/i.test(text);
}

function isStalePolicy(text: string, today: string): boolean {
  const year = Number(today.slice(0, 4));
  const created = [...text.matchAll(/创建于\s*(\d{4})|(\d{4})\s*年创建|created\s+in\s+(\d{4})|原文\s*(\d{4})\s*年/gi)];
  return created.some((match) => {
    const value = Number(match.slice(1).find(Boolean));
    return Number.isFinite(value) && value < year;
  });
}

function isUnknownDeadline(text: string): boolean {
  return /另行通知|另行公布|日期待定|时间待定|具体(?:生效)?时间|coming soon|\bTBA\b|\bTBD\b/i.test(text);
}

function isPageOnly(text: string): boolean {
  return /页面已更新|重新排版|帮助页面|last updated|仅更新页面|无实质|没有新的强制|page (?:was )?updated/i.test(text);
}

function isMandatory(text: string): boolean {
  const cleaned = text.replace(/没有必须|不必须|无须|不强制|没有新的强制|未说明/g, "");
  return /必须|须于|须在|逾期|强制|将被拒|will be (?:suspended|rejected)|\bmust\b|required to/i.test(cleaned);
}

function earliestActionDeadline(text: string, today: string): string | null {
  const consumed: Array<[number, number]> = [];
  const found: string[] = [];
  const consider = (index: number, length: number, date: string | null) => {
    if (!date || !isValidDate(date)) return;
    // Keep the cue next to the date. A later sentence ("未说明新的生效日") must not
    // turn a page-update stamp into a deadline.
    const window = text.slice(Math.max(0, index - 16), Math.min(text.length, index + length + 6));
    const stamp = /创建|created in|更新日期|last updated|页面更新|更新时间|发布于/i.test(window);
    const action = /生效|截止|之前|须于|须在|必须|逾期|强制|effective|deadline|before/i.test(window);
    if (stamp && !action) return;
    if (!action) return;
    found.push(date);
  };

  for (const match of text.matchAll(/(\d{1,2})月(\d{1,2})日?(?:至|到|-)(\d{1,2})日/g)) {
    consumed.push([match.index, match.index + match[0].length]);
    consider(match.index, match[0].length, resolveMonthDay(Number(match[1]), Number(match[2]), today));
  }
  const covered = (index: number) => consumed.some(([start, end]) => index >= start && index < end);

  for (const match of text.matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)) {
    if (covered(match.index)) continue;
    consider(match.index, match[0].length, isoDate(Number(match[1]), Number(match[2]), Number(match[3])));
  }
  for (const match of text.matchAll(/(?<![0-9])(\d{1,2})月(\d{1,2})日/g)) {
    if (covered(match.index)) continue;
    consider(match.index, match[0].length, resolveMonthDay(Number(match[1]), Number(match[2]), today));
  }
  for (const match of text.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)) {
    if (covered(match.index)) continue;
    consider(match.index, match[0].length, isoDate(Number(match[1]), Number(match[2]), Number(match[3])));
  }
  for (const match of text.matchAll(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})/gi)) {
    if (covered(match.index)) continue;
    const month = ENGLISH_MONTHS[match[1]!.toLowerCase()];
    if (!month) continue;
    consider(match.index, match[0].length, isoDate(Number(match[3]), month, Number(match[2])));
  }

  const upcoming = found.filter((date) => daysUntil(today, date) >= -1).sort();
  return upcoming[0] ?? found.sort()[0] ?? null;
}

const ENGLISH_MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function resolveMonthDay(month: number, day: number, today: string): string | null {
  const year = Number(today.slice(0, 4));
  const thisYear = isoDate(year, month, day);
  if (!thisYear) return null;
  if (daysUntil(today, thisYear) < -1) return isoDate(year + 1, month, day);
  return thisYear;
}

function isoDate(year: number, month: number, day: number): string | null {
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidDate(date) ? date : null;
}

function daysUntil(today: string, deadline: string): number {
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${deadline}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}
