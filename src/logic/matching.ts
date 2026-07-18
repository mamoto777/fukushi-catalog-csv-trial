import type { NaviAnswers, Product, ScoredProduct } from "../types";

/**
 * スコアリング(設計書§5-6):
 *   3 × concernTags一致数 + 2 × sceneTag一致(0/1) + 1 × userTag一致(0/1)
 */
export function scoreProduct(product: Product, answers: NaviAnswers): number {
  const concernHits = product.concernTags.filter((t) =>
    answers.concerns.includes(t),
  ).length;
  const sceneHit =
    answers.scene !== null && product.sceneTags.includes(answers.scene) ? 1 : 0;
  const userHit =
    answers.user !== null && product.userTags.includes(answers.user) ? 1 : 0;
  return 3 * concernHits + 2 * sceneHit + userHit;
}

/** 同点時: popularity降順 → id昇順 */
function compareScored(a: ScoredProduct, b: ScoredProduct): number {
  return (
    b.score - a.score ||
    b.product.popularity - a.product.popularity ||
    a.product.id.localeCompare(b.product.id)
  );
}

export interface MatchResult {
  items: ScoredProduct[];
  /** concernTag一致が3件未満でsceneTag一致まで範囲を広げたか */
  broadened: boolean;
}

/**
 * 絞り込みルール(設計書§5-6):
 * 1. concernTag一致が1つ以上ある商品をスコア降順表示
 * 2. 1が3件未満なら、sceneTag一致商品まで範囲を広げる(broadened=true)
 * 3. それでも0件なら items は空
 */
export function matchProducts(
  products: Product[],
  answers: NaviAnswers,
): MatchResult {
  const scored: ScoredProduct[] = products.map((product) => ({
    product,
    score: scoreProduct(product, answers),
  }));

  const primary = scored
    .filter((s) =>
      s.product.concernTags.some((t) => answers.concerns.includes(t)),
    )
    .sort(compareScored);

  if (primary.length >= 3) {
    return { items: primary, broadened: false };
  }

  const primaryIds = new Set(primary.map((s) => s.product.id));
  const extras = scored
    .filter(
      (s) =>
        !primaryIds.has(s.product.id) &&
        answers.scene !== null &&
        s.product.sceneTags.includes(answers.scene),
    )
    .sort(compareScored);

  return {
    items: [...primary, ...extras],
    broadened: extras.length > 0,
  };
}
