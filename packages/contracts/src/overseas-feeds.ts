// Public overseas-operations RSS contract. Paths stay stable: readers subscribe to them.
// Labels match the focus tabs on /overseas. Design is its own feed; the operations API rejects focus=design.
import { SITE } from "@aihot/industry/site";

export const OVERSEAS_FEED_FOCUSES = ["all", "official", "competitor", "creator", "design"] as const;
export type OverseasFeedFocus = (typeof OVERSEAS_FEED_FOCUSES)[number];

/** Tab keys the operations listing accepts. Design is a separate read. */
export const OVERSEAS_LISTING_FOCUSES = ["official", "competitor", "creator"] as const;
export type OverseasListingFocus = (typeof OVERSEAS_LISTING_FOCUSES)[number];

export const OVERSEAS_FEED_LABELS: Record<OverseasFeedFocus, string> = {
  all: "全部情报",
  official: "官方活动与政策",
  competitor: "产品与品牌",
  creator: "红人与新作品",
  design: "设计素材",
};

/** /overseas?focus=creator keeps posts whose original publish time falls in this window (全部动态). */
export const OVERSEAS_CREATOR_PUBLISHED_DAYS = 7;

export const OVERSEAS_FEED_LIMIT = 50;

export function isOverseasListingFocus(v: string): v is OverseasListingFocus {
  return (OVERSEAS_LISTING_FOCUSES as readonly string[]).includes(v);
}

export function overseasFeedPath(focus: OverseasFeedFocus): string {
  return focus === "all" ? "/feed/overseas.xml" : `/feed/overseas/${focus}.xml`;
}

export function overseasFeedPage(focus: OverseasFeedFocus): string {
  return focus === "all" ? "/overseas" : `/overseas?focus=${focus}`;
}

export function overseasFeedTitle(focus: OverseasFeedFocus): string {
  return `${SITE.name} — 海外运营 · ${OVERSEAS_FEED_LABELS[focus]}`;
}

/** Unknown or missing focus is 全部情报, the same default as /overseas. */
export function overseasFeedFocusFromSearch(search: string): OverseasFeedFocus {
  const focus = new URLSearchParams(search).get("focus");
  if (focus === "official" || focus === "competitor" || focus === "creator" || focus === "design") return focus;
  return "all";
}
