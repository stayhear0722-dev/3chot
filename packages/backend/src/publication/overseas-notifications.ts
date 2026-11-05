// Candidates for the overseas official Feishu route, before the urgency gate.
// Official + selected + the same live window as content pushes. The urgency rules and the send
// live in notify/; this file only reads.
import { sql, type Db } from "../db.ts";

/** Same live window as selected-item cards: older or backfilled rows are not pushed. */
export const OVERSEAS_PUSH_MAX_AGE_MS = 12 * 3600_000;

export interface OverseasOfficialCandidate {
  articleId: string;
  title: string;
  summary: string | null;
  sourceName: string;
  url: string;
  discoveredAt: Date;
  publishedAt: Date | null;
  factId: number | null;
  /** Excerpt for the deterministic gate. Not copied into the group card. */
  evidence: string | null;
}

export async function listOverseasOfficialPushCandidates(now: Date, enabledAt: Date, db: Db = sql): Promise<OverseasOfficialCandidate[]> {
  const oldest = new Date(now.getTime() - OVERSEAS_PUSH_MAX_AGE_MS);
  return db<OverseasOfficialCandidate[]>`
    SELECT p.article_id AS "articleId", p.title, p.summary, s.name AS "sourceName", p.url,
           p.discovered_at AS "discoveredAt", p.published_at AS "publishedAt", p.fact_id AS "factId",
           left(a.body_text, 4000) AS evidence
    FROM publications p
    JOIN sources s ON s.id = p.source_id
    JOIN articles a ON a.id = p.article_id
    LEFT JOIN editorial_overrides o ON o.article_id = p.article_id
    WHERE p.overseas_focus = 'official'
      AND p.selected
      AND p.visibility = 'public'
      AND NOT p.backfill
      AND NOT p.overseas_market_excluded
      AND NOT coalesce((o.fields->>'silent')::boolean, false)
      AND p.timeline_at > ${oldest}
      AND p.discovered_at > ${enabledAt}
      AND (p.visible_after IS NULL OR p.visible_after <= ${now})
    ORDER BY p.discovered_at DESC
    LIMIT 20`;
}
