// Public shape of the overseas column (/overseas and /api/site/overseas-*).
// The live site returns this contract; this repository's reader currently fills the
// envelope and leaves the card lists empty until the server-side readers are copied in.
import type { TimelineCard, TimelineFilters, TimelineResponse } from "./site.ts";

export const OVERSEAS_FOCUSES = ["all", "official", "competitor", "creator"] as const;
export type OverseasFocus = (typeof OVERSEAS_FOCUSES)[number];

export const OVERSEAS_MODES = ["all", "selected"] as const;
export type OverseasMode = (typeof OVERSEAS_MODES)[number];

export const OVERSEAS_MARKET_SCOPES = ["relevant", "us", "unverified", "all"] as const;
export type OverseasMarketScope = (typeof OVERSEAS_MARKET_SCOPES)[number];

export interface OverseasCapabilities {
  version: "overseas-ops-v1";
  contentPlatforms: Array<"brand_sites" | "x" | "youtube" | "instagram" | "tiktok">;
  amazon: { status: "not_connected"; metrics: string[]; watchlistEnabled: false };
  tiktok: { status: "pilot"; automaticCollection: boolean };
  instagram: { status: "pilot"; automaticCollection: boolean };
}

export interface OverseasOfficialSource {
  id: string;
  name: string;
  intervalMinutes: number;
  lastOkAt: string | null;
  health: "ok" | "pending" | null;
}

export interface OverseasOperationsResponse extends TimelineResponse {
  filters: TimelineFilters;
  q: string | null;
  mode: OverseasMode;
  focus: OverseasFocus;
  marketScope: OverseasMarketScope;
  brand: string | null;
  capabilities: OverseasCapabilities;
  total: number;
  officialSources: OverseasOfficialSource[];
  cards: TimelineCard[];
}

export interface OverseasDesignSource {
  id: string;
  name: string;
  url: string;
  status: "active" | "not_connected";
  lastOkAt: string | null;
  health: "ok" | "pending" | null;
  note: string;
}

export interface OverseasDesignItem {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  cover: string | null;
  author: string | null;
  sourcePublishedAt: string | null;
  discoveredAt: string;
  state: "baseline" | "new" | "updated";
  source: { id: string; name: string; url: string };
  category: string;
}

export interface OverseasDesignResources {
  sources: OverseasDesignSource[];
  items: OverseasDesignItem[];
  total: number;
  checkedAt: string | null;
}

export interface OverseasMetricSample {
  sampleCount: number;
  median: number | null;
  min: number | null;
  max: number | null;
}

export interface OverseasCreatorProfile {
  id: string;
  platform: "instagram" | "tiktok" | "youtube";
  handle: string;
  name: string;
  profileUrl: string;
  category: string;
  group: "potential" | "reference" | "cooperation_reference";
  reviewStatus: string;
  reviewedAt: string | null;
  reason: string;
  productEvidence: Array<{ text: string; url: string }>;
  market: { location: string | null; contentLanguage: string | null; usAudience: "unknown" | string; note: string };
  relationship: { status: "unknown" | "promotion_clue" | "public_cooperation"; note: string };
  pending: string[];
  activity: {
    available: boolean;
    observedPosts: number;
    recent7DayPosts: number;
    recent7DayProductPosts: number;
    latestObservedAt: string | null;
    latestPostAt: string | null;
    publishedRecent7DayPosts: number;
  };
  performance: {
    available: boolean;
    productPostCount: number;
    metrics: Record<"views" | "likes" | "comments" | "shares", OverseasMetricSample>;
    ageBuckets: Array<{ key: string; label: string; postCount: number; metrics: OverseasCreatorProfile["performance"]["metrics"] }>;
    sampledAt?: string | null;
  };
  source: { id: string | null; enabled: boolean; lastCheckedAt: string | null; lastOkAt: string | null; health: "ok" | "pending" | null; latestParsedPostAt: string | null };
}

export interface OverseasCreatorsPage {
  generatedAt: string;
  windowDays: number;
  recommendationDays: number;
  methodology: string[];
  creators: OverseasCreatorProfile[];
}
