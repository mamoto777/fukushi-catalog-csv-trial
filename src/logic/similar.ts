/*
 * 類似商品抽出(決定論)。設計書 docs/design.md §5-10
 */
import type { Product } from "../types";

const MAX_RESULTS = 3;

/**
 * 抽出規則:
 * 1. 候補 = products のうち p.id !== target.id かつ p.genre === target.genre
 *    かつ共通するconcernTagsが1つ以上ある商品
 * 2. スコア = target.concernTags との積集合サイズ
 * 3. 並び: スコア降順 → popularity降順 → id昇順
 * 4. 上位3件を返す(0〜3件)
 */
export function similarProducts(target: Product, products: Product[]): Product[] {
  const targetConcerns = new Set(target.concernTags);

  const scored = products
    .filter((p) => p.id !== target.id && p.genre === target.genre)
    .map((p) => ({
      product: p,
      score: p.concernTags.filter((t) => targetConcerns.has(t)).length,
    }))
    .filter((s) => s.score > 0);

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.product.popularity - a.product.popularity ||
      a.product.id.localeCompare(b.product.id),
  );

  return scored.slice(0, MAX_RESULTS).map((s) => s.product);
}
