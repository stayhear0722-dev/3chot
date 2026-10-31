// Focus RSS is a thin adapter over the live overseas listing payloads. No database: the
// operations and design reads are covered by the SQL in overseas-feeds.ts, and these cases
// lock the public XML contract (titles, item links, feeds that do not share items).
import assert from "node:assert/strict";
import test from "node:test";
import { overseasFeedPath, overseasFeedTitle } from "@aihot/contracts/overseas-feeds";
import { itemsFromDesignResources, itemsFromOverseasOperations, renderOverseasFeed } from "@aihot/backend/publication/overseas-feeds";

const official = renderOverseasFeed("official", itemsFromOverseasOperations({
  focus: "official",
  mode: "all",
  cards: [{
    item: {
      id: "j3w67aclrq44k6v2npdp8bw69",
      title: "美国CBP发布关税调整申报指引",
      summary: "海关公告摘要",
      publishedAt: "2026-10-29T14:03:25.000Z",
      source: { name: "美国海关 CBP · CSMS 贸易公告" },
      url: "https://example.com/cbp",
      category: "industry",
    },
  }],
}));

const competitor = renderOverseasFeed("competitor", itemsFromOverseasOperations({
  focus: "competitor",
  mode: "all",
  cards: [{
    item: {
      id: "g84hrk0rrr56eor5k2ex56hp8",
      title: "安克解析无线充电变慢的原因",
      summary: "竞品摘要",
      publishedAt: "2026-10-31T02:00:03.000Z",
      source: { name: "X · Anker 安克充电官方" },
      url: "https://example.com/anker",
    },
  }],
}));

test("operations feeds are RSS 2.0 and differ by focus", () => {
  for (const xml of [official, competitor]) {
    assert.match(xml, /<rss version="2.0"/);
    assert.match(xml, /application\/rss\+xml/);
    assert.match(xml, /<language>zh-CN<\/language>/);
  }
  assert.match(official, /官方活动与政策/);
  assert.match(official, /\/items\/j3w67aclrq44k6v2npdp8bw69/);
  assert.match(official, /美国CBP发布关税调整申报指引/);
  assert.match(official, /https:\/\/example.com\/cbp/);
  assert.doesNotMatch(official, /安克解析无线充电变慢的原因/);
  assert.match(competitor, /产品与品牌/);
  assert.match(competitor, /\/items\/g84hrk0rrr56eor5k2ex56hp8/);
  assert.match(competitor, /安克解析无线充电变慢的原因/);
  assert.doesNotMatch(competitor, /美国CBP发布关税调整申报指引/);
  assert.equal(overseasFeedPath("all"), "/feed/overseas.xml");
  assert.equal(overseasFeedPath("official"), "/feed/overseas/official.xml");
  assert.match(overseasFeedTitle("creator"), /红人与新作品/);
});

test("全部情报 feed is not the design feed", () => {
  const all = renderOverseasFeed("all", itemsFromOverseasOperations({
    cards: [{ item: { id: "all1", title: "全部里的官方条目", summary: "s", publishedAt: "2026-10-30T00:00:00.000Z", source: { name: "Amazon 官方" } } }],
  }));
  const design = renderOverseasFeed("design", itemsFromDesignResources({
    items: [{
      id: "overseas-design-yanko:https://www.yankodesign.com/neos",
      title: "AULA Neos 75",
      url: "https://www.yankodesign.com/neos",
      excerpt: "键盘",
      author: "Sarang Sheth",
      sourcePublishedAt: "2026-10-31T00:30:32.000Z",
      source: { name: "Yanko Design · 产品与科技设计" },
    }],
  }));
  assert.match(all, /全部情报/);
  assert.match(all, /\/items\/all1/);
  assert.doesNotMatch(all, /AULA Neos 75/);
  assert.match(design, /设计素材/);
  assert.match(design, /<link>https:\/\/www.yankodesign.com\/neos<\/link>/);
  assert.doesNotMatch(design, /\/items\//);
  assert.match(renderOverseasFeed("creator", []), /最近 7 天/);
});
