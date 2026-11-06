// Selected Feishu cards: a YouTube URL keeps the original link and is labeled as the video.
// Non-YouTube cards stay on 原文. No database query and no Feishu send.
import assert from "node:assert/strict";
import test from "node:test";
import { youtubeVideoId } from "@aihot/contracts/youtube";
import { SITE } from "@aihot/industry/site";
import { closeDb } from "@aihot/backend/db";
import { card } from "@aihot/backend/notify/selected";
import { itemUrl } from "@aihot/backend/publication/links";

// Fixture ids. This checkout has no stored YouTube article rows; the watch URL is the known video.
const YOUTUBE_ARTICLE_ID = "ytvideodqw4w9wgxcq00001";
const YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const NEWS_ARTICLE_ID = "newsarticleexample0000001";
const NEWS_URL = "https://www.theverge.com/2026/11/5/example-story";

test.after(async () => {
  await closeDb();
});

function row(articleId: string, url: string) {
  const now = new Date("2026-11-06T03:00:00.000Z");
  return {
    article_id: articleId,
    selected: true,
    visibility: "public",
    title: "示例标题",
    summary: "示例摘要",
    reason: "示例理由",
    category: "ai-products" as const,
    source_name: "示例来源",
    url,
    timeline_at: now,
    discovered_at: now,
    visible_after: null,
    backfill: false,
    fact_id: null,
    silent: false,
  };
}

type Card = ReturnType<typeof card>;

function buttons(built: Card) {
  const action = built.elements.find((element) => element.tag === "action");
  if (!action || !("actions" in action) || !action.actions) throw new Error("card has no actions");
  return action.actions;
}

function noteTexts(built: Card): string[] {
  return built.elements.flatMap((element) => {
    if (element.tag !== "note" || !("elements" in element) || !element.elements) return [];
    return element.elements.map((part) => part.content);
  });
}

test("youtubeVideoId reads watch, share, shorts and live URLs only", () => {
  assert.equal(youtubeVideoId(YOUTUBE_URL), "dQw4w9WgXcQ");
  assert.equal(youtubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=43"), "dQw4w9WgXcQ");
  assert.equal(youtubeVideoId("https://m.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeVideoId("https://www.youtube.com/live/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeVideoId("https://www.youtube.com/@SomeChannel"), null);
  assert.equal(youtubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(youtubeVideoId(NEWS_URL), null);
  assert.equal(youtubeVideoId(""), null);
});

test("a YouTube article card jumps to the original video and the site detail", () => {
  const built = card(row(YOUTUBE_ARTICLE_ID, YOUTUBE_URL));
  const [detail, original] = buttons(built);
  assert.equal(detail?.text.content, `${SITE.name} 查看`);
  assert.equal(detail?.url, itemUrl(YOUTUBE_ARTICLE_ID));
  assert.equal(detail?.type, "primary");
  assert.equal(original?.text.content, "看原视频");
  assert.equal(original?.url, YOUTUBE_URL);
  assert.equal(original?.type, "default");
  assert.deepEqual(noteTexts(built), ["产品", "视频"]);
});

test("a shared YouTube link is labeled as video but the button keeps that exact URL", () => {
  const shared = "https://youtu.be/dQw4w9WgXcQ?t=43";
  const [detail, original] = buttons(card(row(YOUTUBE_ARTICLE_ID, shared)));
  assert.equal(detail?.url, itemUrl(YOUTUBE_ARTICLE_ID));
  assert.equal(original?.text.content, "看原视频");
  assert.equal(original?.url, shared);
});

test("a non-video card keeps the 原文 button and has no 视频 tag", () => {
  const built = card(row(NEWS_ARTICLE_ID, NEWS_URL));
  assert.deepEqual(built, {
    header: { title: { tag: "plain_text", content: "示例标题" }, template: "turquoise" },
    elements: [
      { tag: "note", elements: [{ tag: "plain_text", content: "产品" }] },
      { tag: "div", text: { tag: "lark_md", content: "示例摘要\n\n**推荐理由**：示例理由\n\n来源：示例来源" } },
      {
        tag: "action",
        actions: [
          { tag: "button", text: { tag: "plain_text", content: `${SITE.name} 查看` }, url: itemUrl(NEWS_ARTICLE_ID), type: "primary" },
          { tag: "button", text: { tag: "plain_text", content: "原文" }, url: NEWS_URL, type: "default" },
        ],
      },
    ],
  });
});
