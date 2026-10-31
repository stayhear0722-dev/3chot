// Overseas focus RSS. Same RSS 2.0 shape as feeds.ts. Article focuses follow
// /api/site/overseas-operations?focus=… with mode=all and marketScope=relevant (全部动态,
// 美国相关与可参考案例). Design follows /api/site/overseas-design-resources: those rows are not
// articles, so the item link is the original work.
import {
  OVERSEAS_CREATOR_PUBLISHED_DAYS, OVERSEAS_FEED_LABELS, OVERSEAS_FEED_LIMIT, overseasFeedPage, overseasFeedPath, overseasFeedTitle,
  type OverseasFeedFocus, type OverseasListingFocus,
} from "@aihot/contracts/overseas-feeds";
import { CATEGORY_LABELS, type PublicApiCategoryKey } from "@aihot/contracts/taxonomy";
import { SITE } from "@aihot/industry/site";
import { config } from "../config.ts";
import { sql } from "../db.ts";
import { escapeXml } from "../lib/text.ts";
import { listedCondition } from "./items.ts";
import { itemUrl, siteUrl } from "./links.ts";

const AUTHOR = `noreply@${new URL(config.siteUrl).hostname}`;

export interface OverseasFeedItem {
  id: string;
  title: string;
  summary: string | null;
  /** Absolute link. Article focuses use the site item page; design uses the original URL. */
  link: string;
  sourceName: string;
  publishedAt: Date | null;
  originalUrl: string | null;
  category: string | null;
}

/** Cards from GET /api/site/overseas-operations. */
export interface OverseasOperationsPayload {
  focus?: string;
  mode?: string;
  marketScope?: string;
  cards?: Array<{
    item?: {
      id?: string;
      title?: string;
      summary?: string | null;
      publishedAt?: string | null;
      timelineAt?: string | null;
      category?: string | null;
      source?: { name?: string };
      url?: string | null;
    };
  }>;
}

/** Body of GET /api/site/overseas-design-resources. */
export interface OverseasDesignPayload {
  items?: Array<{
    id?: string;
    title?: string;
    url?: string;
    excerpt?: string | null;
    author?: string | null;
    sourcePublishedAt?: string | null;
    discoveredAt?: string | null;
    source?: { name?: string };
  }>;
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")}]]>`;
}

function rfc822(d: Date): string {
  return d.toUTCString();
}

function parseTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
}

function channel(focus: OverseasFeedFocus, items: string[]): string {
  const description = focus === "design"
    ? `海外运营「${OVERSEAS_FEED_LABELS.design}」最新 ${OVERSEAS_FEED_LIMIT} 条参考，对应 ${overseasFeedPage("design")}。这些条目没有站内文章页，链接指向原作。`
    : focus === "creator"
      ? `海外运营「${OVERSEAS_FEED_LABELS.creator}」按原帖发布时间收录最近 ${OVERSEAS_CREATOR_PUBLISHED_DAYS} 天，与 ${overseasFeedPage("creator")} 的全部动态一致（美国相关与可参考案例）。`
      : `海外运营「${OVERSEAS_FEED_LABELS[focus]}」最新 ${OVERSEAS_FEED_LIMIT} 条，与 ${overseasFeedPage(focus)} 的全部动态一致（美国相关与可参考案例）。`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(overseasFeedTitle(focus))}</title>
    <link>${escapeXml(siteUrl(overseasFeedPage(focus)))}</link>
    <description>${escapeXml(description)}</description>
    <language>zh-CN</language>
    <atom:link href="${escapeXml(siteUrl(overseasFeedPath(focus)))}" rel="self" type="application/rss+xml" />
    <ttl>30</ttl>
    <generator>${escapeXml(`${SITE.name} (${siteUrl("/agent")})`)}</generator>
${items.join("\n")}
  </channel>
</rss>
`;
}

function itemXml(item: OverseasFeedItem, design: boolean): string {
  const summary = item.summary ?? "";
  const original = item.originalUrl
    ? `\n<p>🔗 <a href="${escapeXml(item.originalUrl)}">${design ? "查看原作" : "阅读原文"}</a></p>`
    : "";
  const via = design
    ? `<p>via ${escapeXml(SITE.name)} · <a href="${escapeXml(siteUrl(overseasFeedPage("design")))}">${escapeXml(OVERSEAS_FEED_LABELS.design)}</a></p>`
    : `<p>via ${escapeXml(SITE.name)} · <a href="${escapeXml(item.link)}">${escapeXml(item.link)}</a></p>`;
  const description = `<p>${escapeXml(summary)}</p>${original}\n${via}`;
  const label = item.category ? CATEGORY_LABELS[item.category as PublicApiCategoryKey] : undefined;
  const category = label ? `\n      <category>${escapeXml(label)}</category>` : "";
  const pub = item.publishedAt ? `\n      <pubDate>${rfc822(item.publishedAt)}</pubDate>` : "";
  return `    <item>
      <title>${cdata(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${cdata(description)}</description>${category}${pub}
      <guid isPermaLink="false">${escapeXml(item.id)}</guid>
      <author>${AUTHOR} (${escapeXml(item.sourceName)})</author>
    </item>`;
}

/** Map an operations listing payload onto feed items. The listing has already applied focus. */
export function itemsFromOverseasOperations(payload: OverseasOperationsPayload): OverseasFeedItem[] {
  const items: OverseasFeedItem[] = [];
  for (const card of payload.cards ?? []) {
    const item = card.item;
    if (!item?.id || !item.title) continue;
    const original = item.url?.trim() ? item.url.trim() : null;
    items.push({
      id: item.id,
      title: item.title,
      summary: item.summary ?? null,
      link: itemUrl(item.id),
      sourceName: item.source?.name?.trim() || SITE.name,
      publishedAt: parseTime(item.publishedAt) ?? parseTime(item.timelineAt),
      originalUrl: original,
      category: item.category ?? null,
    });
    if (items.length >= OVERSEAS_FEED_LIMIT) break;
  }
  return items;
}

/** Map design resources onto feed items. Link is the original work, matching the page. */
export function itemsFromDesignResources(payload: OverseasDesignPayload): OverseasFeedItem[] {
  const items: OverseasFeedItem[] = [];
  for (const item of payload.items ?? []) {
    if (!item?.id || !item.title || !item.url) continue;
    const source = item.source?.name?.trim() || SITE.name;
    items.push({
      id: item.id,
      title: item.title,
      summary: item.excerpt ?? null,
      link: item.url,
      sourceName: item.author ? `${source} · ${item.author}` : source,
      publishedAt: parseTime(item.sourcePublishedAt) ?? parseTime(item.discoveredAt),
      originalUrl: item.url,
      category: null,
    });
    if (items.length >= OVERSEAS_FEED_LIMIT) break;
  }
  return items;
}

export function renderOverseasFeed(focus: OverseasFeedFocus, items: OverseasFeedItem[]): string {
  const design = focus === "design";
  return channel(focus, items.slice(0, OVERSEAS_FEED_LIMIT).map((item) => itemXml(item, design)));
}

async function loadOperations(focus: "all" | OverseasListingFocus, now: Date): Promise<OverseasFeedItem[]> {
  const cutoff = new Date(now.getTime() - OVERSEAS_CREATOR_PUBLISHED_DAYS * 86_400_000);
  const rows = await sql<{
    id: string; title: string; summary: string | null; url: string; category: string | null;
    published_at: Date | null; discovered_at: Date; source_name: string;
  }[]>`
    SELECT p.article_id AS id, p.title, p.summary, p.url, p.category, p.published_at, p.discovered_at, s.name AS source_name
    FROM publications p
    JOIN sources s ON s.id = p.source_id
    WHERE ${listedCondition(now)}
      AND p.overseas_focus IS NOT NULL
      AND NOT p.overseas_market_excluded
      ${focus === "all" ? sql`` : sql`AND p.overseas_focus = ${focus}`}
      ${focus === "creator" ? sql`AND p.published_at >= ${cutoff} AND p.published_at <= ${now}` : sql``}
    ORDER BY p.timeline_at DESC, p.article_id DESC
    LIMIT ${OVERSEAS_FEED_LIMIT}`;
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    link: itemUrl(row.id),
    sourceName: row.source_name,
    publishedAt: row.published_at ?? row.discovered_at,
    originalUrl: row.url,
    category: row.category,
  }));
}

async function loadDesign(): Promise<OverseasFeedItem[]> {
  const rows = await sql<{
    id: string; title: string; url: string; excerpt: string | null; author: string | null;
    source_name: string; source_published_at: Date | null; discovered_at: Date;
  }[]>`
    SELECT id, title, url, excerpt, author, source_name, source_published_at, discovered_at
    FROM overseas_design_resources
    ORDER BY coalesce(source_published_at, discovered_at) DESC, id DESC
    LIMIT ${OVERSEAS_FEED_LIMIT}`;
  return itemsFromDesignResources({
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      excerpt: row.excerpt,
      author: row.author,
      sourcePublishedAt: row.source_published_at?.toISOString() ?? null,
      discoveredAt: row.discovered_at.toISOString(),
      source: { name: row.source_name },
    })),
  });
}

/** mode=all, marketScope=relevant. Design does not go through the operations focus filter. */
export async function overseasFeed(focus: OverseasFeedFocus, now = new Date()): Promise<string> {
  const items = focus === "design" ? await loadDesign() : await loadOperations(focus, now);
  return renderOverseasFeed(focus, items);
}
