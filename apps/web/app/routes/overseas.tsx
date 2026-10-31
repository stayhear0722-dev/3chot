// Overseas operations column. Reads /api/site/overseas-* only; the web process never
// touches the database. focus=design and the creator profile view are separate payloads.
import { useEffect, type ReactNode } from "react";
import { data, Form, Link, useLoaderData, useRevalidator } from "react-router";
import { FEATURES } from "@aihot/industry/features";
import { OVERSEAS_BRANDS, overseasBrand } from "@aihot/industry/overseas-brands";
import type {
  OverseasCreatorProfile,
  OverseasCreatorsPage,
  OverseasDesignItem,
  OverseasDesignResources,
  OverseasFocus,
  OverseasMarketScope,
  OverseasMode,
  OverseasOperationsResponse,
} from "@aihot/contracts/overseas";
import { loadOr404 } from "../lib/api.server";
import { pageMeta } from "../lib/seo";
import { beijingDate } from "../lib/format";
import { PillTabs } from "../components/ui/Tabs";
import { SearchField } from "../features/feed/Filters";
import { Timeline } from "../features/feed/Timeline";
import { IconChevronDown, IconInfo } from "../components/icons";

type PageFocus = OverseasFocus | "design";

const FOCUS_TABS: Array<{ key: PageFocus; label: string }> = [
  { key: "all", label: "全部情报" },
  { key: "official", label: "官方活动与政策" },
  { key: "competitor", label: "产品与品牌" },
  { key: "creator", label: "红人与新作品" },
  { key: "design", label: "设计素材" },
];

const MARKET_OPTIONS: Array<[OverseasMarketScope, string]> = [
  ["relevant", "美国相关与可参考案例"],
  ["us", "仅美国直接信号"],
  ["unverified", "适用性待核验"],
  ["all", "包含其他市场"],
];

const CREATOR_GROUPS: Array<{ key: OverseasCreatorProfile["group"]; title: string; note: string }> = [
  { key: "potential", title: "潜在合作线索", note: "优先审查是否值得进一步接洽，合作关系与美国受众仍需核实。" },
  { key: "reference", title: "指定参考账号", note: "参考选品与呈现方式；按平台分别观察，不推定账号属于同一主体。" },
  { key: "cooperation_reference", title: "公开合作与推广参考", note: "已有图拉斯合作或推广线索，单列参考，不计为新的合作发现。" },
];

const PLATFORM_LABEL = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" };
const METRIC_LABEL = { views: "播放", likes: "点赞", comments: "评论", shares: "分享" } as const;
const RELATIONSHIP_LABEL = { unknown: "合作待核实", promotion_clue: "已有推广线索", public_cooperation: "有公开合作依据" };
const DESIGN_STATE = { baseline: "存量参考", new: "新发现", updated: "内容更新" };

function queryString(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== null && value !== undefined && value !== "") sp.set(key, String(value));
  const text = sp.toString();
  return text ? `?${text}` : "";
}

export async function loader({ request }: { request: Request }) {
  if (!FEATURES.overseas) throw data({ message: "not_found" }, { status: 404 });
  const url = new URL(request.url);
  const focus = url.searchParams.get("focus");
  const view = url.searchParams.get("view");
  if (focus === "design") {
    const design = await loadOr404<OverseasDesignResources>("/api/site/overseas-design-resources", { signal: request.signal });
    return { kind: "design" as const, design };
  }
  if (focus === "creator" && view === "profiles") {
    const creators = await loadOr404<OverseasCreatorsPage>("/api/site/overseas-operations/creators", { signal: request.signal });
    return { kind: "creators" as const, creators };
  }
  const mode = url.searchParams.get("mode");
  const marketScope = url.searchParams.get("marketScope");
  const brand = url.searchParams.get("brand")?.trim() || null;
  const q = url.searchParams.get("q")?.trim() || null;
  const page = await loadOr404<OverseasOperationsResponse>(
    `/api/site/overseas-operations${queryString({
      focus: focus && focus !== "all" ? focus : null,
      mode: mode && mode !== "all" ? mode : null,
      marketScope: marketScope && marketScope !== "relevant" ? marketScope : null,
      brand,
      q,
    })}`,
    { signal: request.signal },
  );
  return { kind: "feed" as const, page };
}

export function meta({ loaderData }: { loaderData?: Awaited<ReturnType<typeof loader>> }) {
  return pageMeta({
    title: "海外运营情报 · 美国站线充",
    description: "看线充竞品动向、达人合作与内容打法。美国直接信号优先，全球案例标明参考依据。",
    path: "/overseas",
    noindex: loaderData?.kind === "feed" && !!loaderData.page.q,
  });
}

export function headers() {
  return { "Cache-Control": "public, max-age=0, s-maxage=60" };
}

function shanghai(iso: string | null, opts: { year?: boolean } = {}): string {
  if (!iso) return "待核验";
  return new Date(iso).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: opts.year === false ? undefined : "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatCount(value: number | null): string {
  return value === null ? "未提供" : value.toLocaleString("zh-CN");
}

function focusHref(key: PageFocus): string {
  return key === "all" ? "/overseas" : `/overseas?focus=${key}`;
}

function feedHref(page: OverseasOperationsResponse, patch: Partial<{ mode: OverseasMode | null; focus: OverseasFocus | null; marketScope: OverseasMarketScope | null; brand: string | null; q: string | null }>): string {
  const next = {
    mode: page.mode === "selected" ? "selected" : null,
    focus: page.focus === "all" ? null : page.focus,
    marketScope: page.marketScope === "relevant" ? null : page.marketScope,
    brand: page.brand,
    q: page.q,
    ...patch,
  };
  return `/overseas${queryString(next)}`;
}

function Note({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="relative shrink-0 text-[12px] text-ink-4">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 hover:text-accent [&::-webkit-details-marker]:hidden">
        <IconInfo size={15} />
        {label}
      </summary>
      <div className="card absolute right-0 top-full z-30 mt-3 w-[min(24rem,calc(100vw-2rem))] space-y-2 p-4 text-[12px] leading-relaxed shadow-[var(--shadow-card)]">
        {children}
      </div>
    </details>
  );
}

function CountBar({ children, refreshing, onRefresh }: { children: ReactNode; refreshing: boolean; onRefresh: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-control bg-bg-sunk px-3 py-2 text-[12.5px] text-ink-3 dark:bg-bg-muted/40">
      <span>{children}</span>
      <button type="button" disabled={refreshing} onClick={onRefresh} className="shrink-0 text-accent disabled:opacity-50">
        {refreshing ? "更新中…" : "刷新"}
      </button>
    </div>
  );
}

function FocusTabs({ active }: { active: PageFocus }) {
  return (
    <PillTabs
      items={FOCUS_TABS.map((tab) => ({ key: tab.key, label: tab.label, to: focusHref(tab.key) }))}
      active={active}
      layoutId="overseas-focus"
      label="情报用途"
      size="sm"
      className="mb-3 min-w-0"
    />
  );
}

function CreatorViewTabs({ active }: { active: "posts" | "profiles" }) {
  return (
    <PillTabs
      items={[
        { key: "posts", label: "新作品 · 近7天", to: "/overseas?focus=creator" },
        { key: "profiles", label: "红人观察", to: "/overseas?focus=creator&view=profiles" },
      ]}
      active={active}
      layoutId="overseas-creator-view"
      label="红人观察与新作品"
      size="sm"
      className="mb-4"
    />
  );
}

function weekCount(dayCounts: Record<string, number>, generatedAt: string): number {
  const start = beijingDate(Date.parse(generatedAt) - 6 * 24 * 60 * 60 * 1000);
  return Object.entries(dayCounts).filter(([day]) => day >= start).reduce((sum, [, count]) => sum + count, 0);
}

function FeedView({ page, refreshing, onRefresh }: { page: OverseasOperationsResponse; refreshing: boolean; onRefresh: () => void }) {
  const today = beijingDate(page.generatedAt);
  const keep = {
    mode: page.mode === "selected" ? "selected" : null,
    focus: page.focus === "all" ? null : page.focus,
    marketScope: page.marketScope === "relevant" ? null : page.marketScope,
    brand: page.brand,
  };
  const activeFilters = [
    page.marketScope === "relevant" ? null : MARKET_OPTIONS.find(([key]) => key === page.marketScope)?.[1],
    page.brand ? overseasBrand(page.brand)?.name ?? page.brand : null,
  ].filter(Boolean);
  return (
    <div className="pb-10">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold leading-[1.3] text-ink">海外运营情报</h1>
          <p className="mt-1 text-[13px] text-ink-3">关注美国站官方资讯、线充竞品与达人动态。</p>
        </div>
        <Note label="栏目说明">
          <p>当前覆盖官网、X 与 YouTube，并试点接入 Instagram、TikTok 创作者素材。亚马逊经营数据暂未接入。</p>
          <p>美国相关内容与跨市场参考案例分开标记；合作关系以原文披露为准。历史内容保留原文日期。</p>
          <p>官方资讯提供摘要与原文链接。卖家论坛目前为英国站，可切换“包含其他市场”查看；CBP 仅覆盖近期公告。深圳市口岸办是补充来源，尚未直连深圳海关官网。</p>
          <div className="mt-3 space-y-2 border-t border-line-soft pt-2">
            {page.officialSources.map((source) => (
              <p key={source.id}>
                {source.name}
                <br />
                <span className="text-ink-4">
                  每 {source.intervalMinutes} 分钟检查 · {source.lastOkAt ? shanghai(source.lastOkAt, { year: false }) : "等待首次采集"}
                  {source.health === "ok" ? " 更新" : " · 状态需检查"}
                </span>
              </p>
            ))}
          </div>
        </Note>
      </header>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PillTabs
          items={[
            { key: "all", label: "全部动态", to: feedHref(page, { mode: null }) },
            { key: "selected", label: "动态精选", to: feedHref(page, { mode: "selected" }) },
          ]}
          active={page.mode}
          layoutId="overseas-mode"
          label="海外运营栏目"
        />
        <SearchField action="/overseas" variant="track" defaultValue={page.q ?? ""} keep={keep} />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <PillTabs
          items={FOCUS_TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            to: tab.key === "design" ? "/overseas?focus=design" : feedHref(page, { focus: tab.key === "all" ? null : tab.key }),
          }))}
          active={page.focus}
          layoutId="overseas-focus"
          label="情报用途"
          size="sm"
          className="min-w-0"
        />
        <details className="relative ml-auto shrink-0 text-[12px] text-ink-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 hover:text-accent [&::-webkit-details-marker]:hidden">
            <span>{activeFilters.length ? activeFilters.join(" · ") : "更多筛选"}</span>
            <IconChevronDown size={14} />
          </summary>
          <Form method="get" action="/overseas" className="card absolute right-0 top-full z-30 mt-2 flex w-[min(27rem,calc(100vw-2rem))] flex-col gap-4 p-4">
            {Object.entries({ ...keep, q: page.q }).filter(([key, value]) => value && key !== "marketScope" && key !== "brand").map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value ?? ""} />
            ))}
            <label className="flex items-center justify-between gap-3">
              市场范围
              <select name="marketScope" defaultValue={page.marketScope} className="w-60 max-w-[70%] rounded-control border border-line-soft bg-bg px-2 py-2">
                {MARKET_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="flex items-center justify-between gap-3">
              品牌
              <select name="brand" defaultValue={page.brand ?? ""} className="w-60 max-w-[70%] rounded-control border border-line-soft bg-bg px-2 py-2">
                <option value="">全部品牌</option>
                {OVERSEAS_BRANDS.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </label>
            <div className="flex items-center justify-end gap-4">
              {activeFilters.length > 0 && <Link to={feedHref(page, { marketScope: null, brand: null })} className="text-ink-4 hover:text-accent">清除筛选</Link>}
              <button type="submit" className="rounded-full bg-accent px-4 py-2 font-medium text-accent-contrast">应用筛选</button>
            </div>
          </Form>
        </details>
      </div>

      {page.focus === "creator" && (
        <>
          <CreatorViewTabs active="posts" />
          <p className="mb-3 text-[12px] leading-relaxed text-ink-4">按原帖发布时间显示最近7天的新作品，优先更近的；历史作品和红人产品履历请查看“红人观察”。</p>
        </>
      )}

      <CountBar refreshing={refreshing} onRefresh={onRefresh}>
        共 <b className="num">{page.total}</b> 条 · 今日 <span className="num">{page.dayCounts[today] ?? 0}</span> 条 · 近 7 天 <span className="num">{weekCount(page.dayCounts, page.generatedAt)}</span> 条
      </CountBar>
      <Timeline
        refreshOnChange
        initial={page}
        filters={page.filters}
        apiPath="/api/site/overseas-operations"
        extraQuery={{ q: page.q, mode: page.mode, focus: page.focus, marketScope: page.marketScope, brand: page.brand, limit: 20 }}
        autoBatches={Number.POSITIVE_INFINITY}
        emptyState={{ title: page.q ? "没有找到相关内容" : "当前筛选下暂无内容", description: "换个关键词，或调整筛选条件试试。" }}
      />
    </div>
  );
}

function MetricTable({ metrics }: { metrics: OverseasCreatorProfile["performance"]["metrics"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[270px] text-left text-[12px]">
        <thead className="text-ink-4">
          <tr>
            <th className="py-1 font-normal">指标</th>
            <th className="py-1 font-normal">中位数</th>
            <th className="py-1 font-normal">最小–最大</th>
            <th className="py-1 text-right font-normal">样本</th>
          </tr>
        </thead>
        <tbody className="text-ink-3">
          {(Object.keys(METRIC_LABEL) as Array<keyof typeof METRIC_LABEL>).map((key) => {
            const sample = metrics[key];
            return (
              <tr key={key}>
                <th scope="row" className="py-1.5 font-normal">{METRIC_LABEL[key]}</th>
                <td>{formatCount(sample.median)}</td>
                <td>{sample.min === null || sample.max === null ? "未提供" : `${formatCount(sample.min)}–${formatCount(sample.max)}`}</td>
                <td className="num text-right">{sample.sampleCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CreatorCard({ creator }: { creator: OverseasCreatorProfile }) {
  const collection = creator.source.id ? (creator.source.enabled ? "已纳入采集" : "采集已暂停") : "待接入";
  return (
    <article>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-ink-4">{PLATFORM_LABEL[creator.platform]} · {collection}</p>
          <h3 className="mt-1 text-[16px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
            <a href={creator.profileUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{creator.name} ↗</a>
          </h3>
          <p className="mt-1 text-[12px] text-ink-4 [overflow-wrap:anywhere]">@{creator.handle}</p>
        </div>
        <span className="shrink-0 rounded-control bg-bg-sunk px-2 py-1 text-[11px] text-ink-3">{RELATIONSHIP_LABEL[creator.relationship.status]}</span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-3">{creator.reason}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-4">
        <span>近7天观察作品 {formatCount(creator.activity.recent7DayPosts)}</span>
        <span>近7天推荐 {formatCount(creator.activity.publishedRecent7DayPosts)}</span>
      </div>
      <p className="mt-1 text-[12px] text-ink-4">最新已观察原帖：{shanghai(creator.activity.latestPostAt)}</p>
      <details className="mt-3 border-t border-line-soft pt-3 text-[12px] leading-relaxed text-ink-3">
        <summary className="w-fit cursor-pointer text-accent">查看产品履历、美国适配与作品表现</summary>
        <h4 className="mt-3 font-medium text-ink">产品履历与依据</h4>
        {creator.productEvidence.length ? (
          <ul className="mt-1 space-y-2">
            {creator.productEvidence.map((item) => (
              <li key={item.url}><a href={item.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline [overflow-wrap:anywhere]">{item.text} ↗</a></li>
            ))}
          </ul>
        ) : <p className="mt-1 text-ink-4">具体产品与品质、创新依据待补证。</p>}
        <h4 className="mt-4 font-medium text-ink">美国市场适配</h4>
        <p className="mt-1">所在地：{creator.market.location ?? "待核验"} · 内容语言：{creator.market.contentLanguage ?? "待核验"}</p>
        <p className="mt-1">{creator.market.note}</p>
        <p className="mt-1 text-ink-4">美国受众比例：未知；所在地和内容语言不代表受众所在地。</p>
        <h4 className="mt-4 font-medium text-ink">图拉斯合作关系</h4>
        <p className="mt-1">{creator.relationship.note}</p>
        <h4 className="mt-4 font-medium text-ink">近30天产品作品表现</h4>
        {creator.performance.available ? (
          <>
            <p className="mb-2 mt-1 text-ink-4">已识别产品作品 {formatCount(creator.performance.productPostCount)} 条；各指标按实际可用样本统计，尚待运营判断持续表现。</p>
            <MetricTable metrics={creator.performance.metrics} />
            {creator.performance.ageBuckets.filter((bucket) => bucket.postCount > 0).map((bucket) => (
              <details key={bucket.key} className="mt-2">
                <summary className="w-fit cursor-pointer text-ink-4">{bucket.label} · {bucket.postCount} 条</summary>
                <MetricTable metrics={bucket.metrics} />
              </details>
            ))}
            <p className="mt-2 text-ink-4">指标最近采样：{shanghai(creator.performance.sampledAt ?? null)}。仅为当前已覆盖的产品作品，不能视为账号全量或销量。</p>
          </>
        ) : <p className="mt-1 text-ink-4">当前暂无可聚合的产品作品样本，表现待补证；缺失指标不记为零。</p>}
        {creator.pending.length > 0 && (
          <>
            <h4 className="mt-4 font-medium text-ink">待核验</h4>
            <ul className="mt-1 space-y-1 text-ink-4">{creator.pending.map((item) => <li key={item}>· {item}</li>)}</ul>
          </>
        )}
        <h4 className="mt-4 font-medium text-ink">采集覆盖</h4>
        <p className="mt-1 text-ink-4">最近检查：{shanghai(creator.source.lastCheckedAt)} · 最近成功：{shanghai(creator.source.lastOkAt)}</p>
        <p className="mt-1 text-ink-4">接口最新可解析原帖：{shanghai(creator.source.latestParsedPostAt)} · 状态：{creator.source.health === "ok" ? "正常" : creator.source.id ? "待检查" : "未接入"}</p>
        <p className="mt-1 text-ink-4">近30天已观察 {formatCount(creator.activity.observedPosts)} 条；近7天可识别产品作品 {formatCount(creator.activity.recent7DayProductPosts)} 条。采集状态与内容价值分别判断，首屏可能未覆盖全部作品。</p>
      </details>
    </article>
  );
}

function ProfilesView({ page, refreshing, onRefresh }: { page: OverseasCreatorsPage; refreshing: boolean; onRefresh: () => void }) {
  return (
    <div className="pb-10">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold leading-[1.3] text-ink">海外运营情报</h1>
          <p className="mt-1 text-[13px] text-ink-3">发现值得进一步接洽的红人，参考过往选品与近期作品。</p>
        </div>
        <Note label="观察说明">
          {page.methodology.map((line) => <p key={line}>{line}</p>)}
        </Note>
      </header>
      <FocusTabs active="creator" />
      <CreatorViewTabs active="profiles" />
      <CountBar refreshing={refreshing} onRefresh={onRefresh}>
        共 <b className="num">{page.creators.length}</b> 个平台账号 · 作品表现观察近 {page.windowDays} 天
      </CountBar>
      <p className="mb-5 text-[12px] leading-relaxed text-ink-4">以高品质、创新产品履历为选人线索；美国受众和现有合作关系分别核实。日常新作品只保留原帖发布后 {page.recommendationDays} 天内的内容。</p>
      {CREATOR_GROUPS.map((group) => {
        const rows = page.creators.filter((creator) => creator.group === group.key);
        if (!rows.length) return null;
        return (
          <section key={group.key} className="mb-7" aria-label={group.title}>
            <div className="mb-3">
              <h2 className="text-[16px] font-semibold text-ink">{group.title}<span className="ml-2 text-[12px] font-normal text-ink-4">{rows.length} 个平台账号</span></h2>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-4">{group.note}</p>
            </div>
            <ul className="grid gap-3 xl:grid-cols-2">
              {rows.map((creator) => <li key={creator.id} className="card min-w-0 p-4"><CreatorCard creator={creator} /></li>)}
            </ul>
          </section>
        );
      })}
      {!page.creators.length && <div className="card px-5 py-10 text-center text-[13px] text-ink-3">暂未有可展示的红人观察账号。</div>}
    </div>
  );
}

function DesignCard({ item }: { item: OverseasDesignItem }) {
  return (
    <article>
      <div className="flex items-start gap-3">
        {item.cover && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true" className="shrink-0">
            <img src={item.cover} alt="" width={112} height={84} loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true; }} className="h-[72px] w-[88px] rounded-control bg-bg-sunk object-cover sm:h-[84px] sm:w-28" />
          </a>
        )}
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[11px] text-ink-4">{item.category} · {DESIGN_STATE[item.state]}</p>
          <h2 className="text-[15px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{item.title}</a>
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-4">{item.source.name}{item.author && ` · ${item.author}`}</p>
        </div>
      </div>
      {item.excerpt && <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-ink-3 [overflow-wrap:anywhere]">{item.excerpt}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] text-ink-4">
        <span>{item.sourcePublishedAt ? `原作发布 ${shanghai(item.sourcePublishedAt)}` : "原作发布时间未知"}</span>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-accent hover:underline">查看原作 ↗</a>
      </div>
    </article>
  );
}

function DesignView({ page, refreshing, onRefresh }: { page: OverseasDesignResources; refreshing: boolean; onRefresh: () => void }) {
  const active = page.sources.filter((source) => source.status === "active");
  const pending = page.sources.filter((source) => source.status === "not_connected");
  return (
    <div className="pb-10">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold leading-[1.3] text-ink">海外运营情报</h1>
          <p className="mt-1 text-[13px] text-ink-3">品牌视觉、包装与产品设计参考。</p>
        </div>
        <Note label="来源与更新">
          <p>保留来源标题与简介，点击“查看原作”访问完整案例。素材使用请以原站授权为准。</p>
          {active.map((source) => (
            <p key={source.id}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink hover:text-accent">{source.name}</a>
              <br />
              <span>{source.lastOkAt ? `最近成功检查 ${shanghai(source.lastOkAt)}` : "等待首次检查"}{source.health === "ok" ? "" : " · 更新状态需检查"}</span>
            </p>
          ))}
        </Note>
      </header>
      <FocusTabs active="design" />
      <CountBar refreshing={refreshing} onRefresh={onRefresh}>
        共 <b className="num">{page.total}</b> 条参考
        {page.checkedAt && <span> · 最近检查 {shanghai(page.checkedAt)}</span>}
      </CountBar>
      <p className="mb-4 text-[12px] leading-relaxed text-ink-4">首次收录为存量参考，保留原作日期；发现时间不代表作品首次发布。</p>
      {page.items.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {page.items.map((item) => <li key={item.id} className="card min-w-0 p-4"><DesignCard item={item} /></li>)}
        </ul>
      ) : <div className="card px-5 py-10 text-center text-[13px] text-ink-3">设计素材正在准备中，先从下方网站浏览参考。</div>}
      {pending.length > 0 && (
        <section className="mt-7 border-t border-line-soft pt-5" aria-label="设计素材网站入口">
          <h2 className="text-[15px] font-semibold text-ink">素材网站入口</h2>
          <p className="mt-1 text-[12px] text-ink-4">以下网站尚未自动采集，可直接访问原站浏览。</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {pending.map((source) => (
              <li key={source.id} className="card p-4">
                <h3 className="text-[14px] font-medium text-ink">{source.name}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{source.note}</p>
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[12px] text-accent hover:underline">访问原站 ↗</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function OverseasPage() {
  const payload = useLoaderData<typeof loader>();
  const { revalidate, state } = useRevalidator();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && window.scrollY < 160 && state === "idle") revalidate();
    };
    const timer = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [revalidate, state]);
  const refreshing = state !== "idle";
  const refresh = () => { void revalidate(); };
  if (payload.kind === "design") return <DesignView page={payload.design} refreshing={refreshing} onRefresh={refresh} />;
  if (payload.kind === "creators") return <ProfilesView page={payload.creators} refreshing={refreshing} onRefresh={refresh} />;
  return <FeedView page={payload.page} refreshing={refreshing} onRefresh={refresh} />;
}
