// Overseas official Feishu push. Schedule notify.overseas calls this.
// Order is fixed: target enabled with a watermark, official+selected live window, urgency gate,
// route caps, then the app send. The target is inserted disabled. Turning it on is setTargetEnabled,
// which refreshes enabled_at so the pause window is not replayed.
import { credential } from "../config.ts";
import { sql, type Tx } from "../db.ts";
import { itemUrl } from "../publication/links.ts";
import { listOverseasOfficialPushCandidates, type OverseasOfficialCandidate } from "../publication/overseas-notifications.ts";
import { beijingDate, beijingMidnight } from "@aihot/contracts/time";
import { feishuOverseasPushEnabled, overseasOfficialCard, sendOverseasOfficialCard } from "./overseas-app.ts";
import {
  OVERSEAS_OFFICIAL_TARGET,
  admitOverseasRoute,
  assessOverseasUrgency,
  type OverseasRouteUsage,
  type OverseasUrgencyDecision,
} from "./overseas-urgency.ts";

const NOTE = "海外运营情报：美国站及直接相关跨境的紧急政策。默认暂停。启用时刷新 enabled_at，不补推暂停期间的内容。";

export interface OverseasPushReport {
  status: "skipped" | "ran";
  reason?: string;
  considered: number;
  admitted: number;
  sent: number;
}

interface TargetRow {
  enabled: boolean;
  enabled_at: Date | null;
  config_ref: string | null;
}

export async function ensureOverseasOfficialTarget(): Promise<void> {
  await sql`
    INSERT INTO notify_targets (key, purpose, kind, enabled, config_ref, note)
    VALUES (${OVERSEAS_OFFICIAL_TARGET}, 'overseas', 'feishu_chat', false, 'FEISHU_OVERSEAS_CHAT_ID', ${NOTE})
    ON CONFLICT (key) DO NOTHING`;
}

export async function pushOverseas(now = new Date()): Promise<OverseasPushReport> {
  await ensureOverseasOfficialTarget();
  const [target] = await sql<TargetRow[]>`
    SELECT enabled, enabled_at, config_ref FROM notify_targets WHERE key = ${OVERSEAS_OFFICIAL_TARGET}`;
  if (!target?.enabled) return { status: "skipped", reason: "target disabled", considered: 0, admitted: 0, sent: 0 };
  if (!target.enabled_at) return { status: "skipped", reason: "missing enabled_at", considered: 0, admitted: 0, sent: 0 };

  const candidates = await listOverseasOfficialPushCandidates(now, target.enabled_at);
  const ranked = candidates
    .map((candidate) => ({ candidate, decision: assessOverseasUrgency(candidateInput(candidate), now) }))
    .filter((row) => row.decision.pass)
    .sort((a, b) => rank(a.decision) - rank(b.decision) || (a.decision.deadline ?? "").localeCompare(b.decision.deadline ?? ""));

  let admitted = 0;
  let sent = 0;
  for (const row of ranked) {
    const outcome = await admitAndSend(row.candidate, row.decision, target, now);
    if (outcome === "sent") {
      admitted += 1;
      sent += 1;
    } else if (outcome === "admitted") {
      admitted += 1;
    }
  }
  return { status: "ran", considered: candidates.length, admitted, sent };
}

function candidateInput(candidate: OverseasOfficialCandidate) {
  return {
    title: candidate.title,
    summary: candidate.summary,
    text: candidate.evidence,
    sourceName: candidate.sourceName,
    url: candidate.url,
  };
}

function rank(decision: OverseasUrgencyDecision): number {
  return decision.kind === "loss_or_incident" ? 0 : 1;
}

function deliveryReady(chatId: string | null): boolean {
  return feishuOverseasPushEnabled()
    && !!chatId
    && !!credential("integrations", "FEISHU_OVERSEAS_APP_ID")
    && !!credential("integrations", "FEISHU_OVERSEAS_APP_SECRET");
}

async function admitAndSend(
  candidate: OverseasOfficialCandidate,
  decision: OverseasUrgencyDecision,
  target: TargetRow,
  now: Date,
): Promise<"sent" | "admitted" | "skipped"> {
  const chatId = target.config_ref ? credential("integrations", target.config_ref) : null;
  // Missing valve or credentials must not reserve a dedupe row, or a later enable could not send.
  if (!chatId || !deliveryReady(chatId)) return "skipped";
  const held = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${OVERSEAS_OFFICIAL_TARGET}))`;
    const usage = await routeUsage(tx, now);
    const admission = admitOverseasRoute({
      decision,
      usage,
      now,
      enabledAt: target.enabled_at,
      contentAt: candidate.discoveredAt,
    });
    if (!admission.admit) return null;
    const dedupeKey = candidate.factId ? `overseas-official:fact:${candidate.factId}` : `overseas-official:article:${candidate.articleId}`;
    const payload = {
      urgencyKind: decision.kind,
      reason: decision.reason,
      deadline: decision.deadline,
      card: overseasOfficialCard({
        title: candidate.title,
        summary: candidate.summary,
        sourceName: candidate.sourceName,
        url: candidate.url,
        itemUrl: itemUrl(candidate.articleId),
        decision,
      }),
    };
    const [row] = await tx<{ id: number }[]>`
      INSERT INTO deliveries (target_key, subject_kind, subject_id, dedupe_key, status, payload)
      VALUES (${OVERSEAS_OFFICIAL_TARGET}, 'overseas_official', ${candidate.articleId}, ${dedupeKey}, 'pending', ${tx.json(payload as never)})
      ON CONFLICT (target_key, dedupe_key) DO NOTHING
      RETURNING id`;
    return row?.id ?? null;
  });
  if (!held) return "skipped";
  await sql`UPDATE deliveries SET status = 'sending', attempts = attempts + 1, updated_at = now() WHERE id = ${held}`;
  try {
    const [stored] = await sql<{ payload: { card?: unknown } }[]>`SELECT payload FROM deliveries WHERE id = ${held}`;
    const result = await sendOverseasOfficialCard(chatId, stored?.payload?.card ?? {}, decision);
    if (!result.sent) {
      // The message was not posted. Drop the reservation so a later run can try again.
      await sql`DELETE FROM deliveries WHERE id = ${held} AND status = 'sending'`;
      return "skipped";
    }
    const status = result.ok ? "sent" : result.status >= 500 || result.status === 0 ? "unknown" : "failed";
    await sql`UPDATE deliveries SET status = ${status}, response = ${result.body}, sent_at = ${result.ok ? new Date() : null}, updated_at = now() WHERE id = ${held}`;
    return result.ok ? "sent" : "admitted";
  } catch (error) {
    await sql`UPDATE deliveries SET status = 'unknown', response = ${String(error).slice(0, 500)}, updated_at = now() WHERE id = ${held}`;
    return "admitted";
  }
}

async function routeUsage(tx: Tx, now: Date): Promise<OverseasRouteUsage> {
  const [row] = await tx<{ routine: number; incident: number; last_sent_at: Date | null }[]>`
    SELECT
      (count(*) FILTER (WHERE payload->>'urgencyKind' IS DISTINCT FROM 'loss_or_incident'))::int AS routine,
      (count(*) FILTER (WHERE payload->>'urgencyKind' = 'loss_or_incident'))::int AS incident,
      max(created_at) AS last_sent_at
    FROM deliveries
    WHERE target_key = ${OVERSEAS_OFFICIAL_TARGET}
      AND status IN ('pending', 'sending', 'sent', 'unknown')
      AND created_at >= ${beijingMidnight(beijingDate(now))}`;
  return {
    routineSentToday: row?.routine ?? 0,
    incidentSentToday: row?.incident ?? 0,
    lastSentAt: row?.last_sent_at ?? null,
  };
}

