-- Read model for the overseas focus RSS feeds. The page loader that classifies rows is not in this
-- tree; feeds read only rows it has marked. overseas_market_excluded drops "其他市场" from the default
-- 美国相关与可参考案例 listing (marketScope=relevant). Design references are not articles.

ALTER TABLE publications
  ADD COLUMN overseas_focus text,
  ADD COLUMN overseas_market_excluded boolean NOT NULL DEFAULT false;

ALTER TABLE publications
  ADD CONSTRAINT publications_overseas_focus_chk
  CHECK (overseas_focus IS NULL OR overseas_focus IN ('official', 'competitor', 'creator'));

CREATE INDEX publications_overseas_feed_idx
  ON publications (timeline_at DESC, article_id DESC)
  WHERE visibility = 'public' AND overseas_focus IS NOT NULL AND NOT overseas_market_excluded;

CREATE TABLE overseas_design_resources (
  id text PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL,
  excerpt text,
  author text,
  source_name text NOT NULL,
  source_published_at timestamptz,
  discovered_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX overseas_design_resources_published_idx
  ON overseas_design_resources ((coalesce(source_published_at, discovered_at)) DESC, id DESC);
