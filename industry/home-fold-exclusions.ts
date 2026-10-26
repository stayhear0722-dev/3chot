// Homepage prominence denylist from the 2026-10-26 overseas-ops review (不满意).
// Live homepage HTML lists these three in the 图拉斯 column even though
// publications.selected is already false, so a selected-only override does not
// take them off the fold. Detail pages stay public. Brand-keep
// pf8bubqx8pnyrg818wioeucs5 is intentionally absent.

export const HOME_FOLD_EXCLUDED_IDS = [
  "bkxsiqhtcbh9mqj1921kzvx42",
  "uxr1dhska5s0q262up8rrdbm5",
  "wy3928ccxqnhqtb97r9kwn0n6",
] as const;

const excluded = new Set<string>(HOME_FOLD_EXCLUDED_IDS);

export function isExcludedFromHomeFold(id: string): boolean {
  return excluded.has(id);
}
