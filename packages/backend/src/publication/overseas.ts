// Overseas operations column (/api/site/overseas-operations and .../creators).
//
// The live site selects, labels and pages these cards on the Tencent host. That reader
// is not in git. This module owns the public contract: query rules match production
// (unknown focus/mode/scope and cursors fail; unknown brands are echoed, not rejected)
// and the body is the same envelope with an empty card list until that reader is copied
// from /opt/3chot. Do not invent cards here.
import { OVERSEAS_BRANDS } from "@aihot/industry/overseas-brands";
import type {
  OverseasCapabilities,
  OverseasCreatorsPage,
  OverseasFocus,
  OverseasMarketScope,
  OverseasMode,
  OverseasOfficialSource,
  OverseasOperationsResponse,
} from "@aihot/contracts/overseas";
import { OVERSEAS_FOCUSES, OVERSEAS_MARKET_SCOPES, OVERSEAS_MODES } from "@aihot/contracts/overseas";
import { decodeCursor } from "../lib/cursor.ts";

export class OverseasQueryError extends Error {}

export interface OverseasOperationsQuery {
  focus: OverseasFocus;
  mode: OverseasMode;
  marketScope: OverseasMarketScope;
  brand: string | null;
  q: string | null;
  limit: number;
  cursor: Record<string, unknown> | null;
}

const FOCUS = new Set<string>(OVERSEAS_FOCUSES);
const MODE = new Set<string>(OVERSEAS_MODES);
const SCOPE = new Set<string>(OVERSEAS_MARKET_SCOPES);

/** Known ids are not required. Production accepts an unknown brand and returns no rows. */
export function knownOverseasBrand(id: string): boolean {
  return OVERSEAS_BRANDS.some((brand) => brand.id === id);
}

export function parseOverseasOperationsQuery(q: Record<string, string | undefined>): OverseasOperationsQuery {
  const focus = q.focus?.trim() || "all";
  if (!FOCUS.has(focus)) throw new OverseasQueryError("unknown overseas focus");
  const mode = q.mode?.trim() || "all";
  if (!MODE.has(mode)) throw new OverseasQueryError("unknown overseas mode");
  const marketScope = q.marketScope?.trim() || "relevant";
  if (!SCOPE.has(marketScope)) throw new OverseasQueryError("unknown overseas market scope");
  const brand = q.brand?.trim() ? q.brand.trim().slice(0, 80) : null;
  const search = q.q?.trim() ? q.q.trim().slice(0, 200) : null;
  const limit = Math.min(Math.max(Number(q.limit) || 20, 1), 40);
  const cursor = q.cursor ? decodeCursor<Record<string, unknown>>("ops1", q.cursor) : null;
  return {
    focus: focus as OverseasFocus,
    mode: mode as OverseasMode,
    marketScope: marketScope as OverseasMarketScope,
    brand,
    q: search,
    limit,
    cursor,
  };
}

export const OVERSEAS_CAPABILITIES: OverseasCapabilities = {
  version: "overseas-ops-v1",
  contentPlatforms: ["brand_sites", "x", "youtube", "instagram", "tiktok"],
  amazon: { status: "not_connected", metrics: [], watchlistEnabled: false },
  tiktok: { status: "pilot", automaticCollection: true },
  instagram: { status: "pilot", automaticCollection: true },
};

/** Source rows the column explains. Health stays unset until a real check is recorded. */
export const OVERSEAS_OFFICIAL_SOURCES: Array<Pick<OverseasOfficialSource, "id" | "name" | "intervalMinutes">> = [
  { id: "overseas-shenzhen-port-notices", name: "深圳市口岸办 · 海关与通关公告补充", intervalMinutes: 60 },
  { id: "overseas-aboutamazon-shopping", name: "Amazon 官方 · 购物与卖家资讯", intervalMinutes: 15 },
  { id: "overseas-cbp-csms", name: "美国海关 CBP · CSMS 贸易公告", intervalMinutes: 60 },
  { id: "overseas-amazon-seller-forum", name: "Amazon 卖家论坛 · 英国站官方公告", intervalMinutes: 60 },
];

function officialSources(): OverseasOfficialSource[] {
  return OVERSEAS_OFFICIAL_SOURCES.map((source) => ({ ...source, lastOkAt: null, health: null }));
}

export async function loadOverseasOperations(query: OverseasOperationsQuery, now = new Date()): Promise<OverseasOperationsResponse> {
  return {
    filters: { channel: "all", category: null, tag: null, topic: null },
    q: query.q,
    mode: query.mode,
    focus: query.focus,
    marketScope: query.marketScope,
    brand: query.brand,
    capabilities: OVERSEAS_CAPABILITIES,
    total: 0,
    officialSources: officialSources(),
    cards: [],
    nextCursor: null,
    refreshAt: null,
    hot: null,
    dayCounts: {},
    generatedAt: now.toISOString(),
  };
}

const CREATOR_METHODOLOGY = [
  "潜在线索均待核验；用户参考、导购线索与已核实合作分别记录，不宣称已签约、从未合作或美国受众匹配。",
  "Instagram和TikTok只汇总已获取首屏中近30天原帖；产品作品按公开文案产品词识别，是可识别样本下界，不代表调性已通过或账号全量。",
  "各平台分别展示已知指标的中位数与最小—最大范围，缺失不补零；按本地最后记录时的发帖年龄分桶，不能直接比较不同年龄作品。",
  "记录更新时间不保证供应商指标是新采样，复用回执不构成增长；少量样本、单条爆款和来源健康均不能证明持续表现。",
  "YouTube维持独立Google API/RSS，本轮未合并其多条产品指标，未知计数保留为空。完整视频与美国受众仍需运营核验。",
  "近7天公开作品数是已经公开且有原帖时间的作品数，不保证每条都命中当前页面的市场或品牌筛选。",
];

export async function loadOverseasCreators(now = new Date()): Promise<OverseasCreatorsPage> {
  return {
    generatedAt: now.toISOString(),
    windowDays: 30,
    recommendationDays: 7,
    methodology: CREATOR_METHODOLOGY,
    creators: [],
  };
}
