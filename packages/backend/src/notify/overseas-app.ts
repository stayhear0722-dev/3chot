// Feishu app-bot delivery for the overseas official group. The urgency gate decides whether to
// call this. The valve and missing credentials both return before any network call.
import { credential } from "../config.ts";
import type { OverseasUrgencyDecision } from "./overseas-urgency.ts";

const API = "https://open.feishu.cn/open-apis";

/** Live read, same pattern as the internal-chat valve. Unset or anything but "true" stays off. */
export const feishuOverseasPushEnabled = () => process.env.FEISHU_OVERSEAS_PUSH_ENABLED === "true";

export interface OverseasCardInput {
  title: string;
  summary: string | null;
  sourceName: string;
  url: string;
  itemUrl: string;
  decision: OverseasUrgencyDecision;
}

export function overseasOfficialCard(input: OverseasCardInput): unknown {
  const lines = [
    input.summary,
    input.decision.detail,
    input.decision.deadline ? `行动截止：${input.decision.deadline}（北京时间）` : null,
    `来源：${input.sourceName}`,
  ].filter(Boolean);
  return {
    header: { title: { tag: "plain_text", content: input.title.slice(0, 80) }, template: "red" },
    elements: [
      { tag: "div", text: { tag: "plain_text", content: lines.join("\n\n").slice(0, 2000) } },
      {
        tag: "action",
        actions: [
          { tag: "button", text: { tag: "plain_text", content: "站内条目" }, url: input.itemUrl, type: "primary" },
          { tag: "button", text: { tag: "plain_text", content: "官方原文" }, url: input.url, type: "default" },
        ],
      },
    ],
  };
}

export interface OverseasSendResult {
  sent: boolean;
  ok: boolean;
  status: number;
  body: string;
}

/**
 * Posts one card. Returns without fetching when the valve is off or the overseas app is not configured.
 * Callers still have to pass a decision that already passed the urgency gate.
 */
export async function sendOverseasOfficialCard(chatId: string, card: unknown, decision: OverseasUrgencyDecision): Promise<OverseasSendResult> {
  if (!decision.pass) return { sent: false, ok: false, status: 0, body: "urgency gate closed" };
  if (!feishuOverseasPushEnabled()) return { sent: false, ok: false, status: 0, body: "push valve off" };
  const appId = credential("integrations", "FEISHU_OVERSEAS_APP_ID");
  const appSecret = credential("integrations", "FEISHU_OVERSEAS_APP_SECRET");
  if (!appId || !appSecret || !chatId) return { sent: false, ok: false, status: 0, body: "overseas app not configured" };
  const tokenRes = await fetch(`${API}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    signal: AbortSignal.timeout(15_000),
  });
  const tokenJson = (await tokenRes.json()) as { code?: number; tenant_access_token?: string; msg?: string };
  if (!tokenRes.ok || tokenJson.code !== 0 || !tokenJson.tenant_access_token) {
    return { sent: false, ok: false, status: tokenRes.status, body: `feishu token: ${tokenJson.msg ?? tokenRes.status}` };
  }
  const res = await fetch(`${API}/im/v1/messages?receive_id_type=chat_id`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tokenJson.tenant_access_token}` },
    body: JSON.stringify({ receive_id: chatId, msg_type: "interactive", content: JSON.stringify(card) }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.text();
  let code = -1;
  try {
    code = (JSON.parse(body) as { code?: number }).code ?? -1;
  } catch {
    code = -1;
  }
  const ok = res.ok && code === 0;
  return { sent: true, ok, status: res.status, body: body.slice(0, 500) };
}
