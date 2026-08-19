/*
 * 商品名キーワード検索。設計書 docs/design.md §5-8
 */
import type { Product } from "../types";

export function searchProducts(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [];
  return products.filter((p) =>
    [p.name, p.maker, p.taisCode ?? ""].some((f) => f.toLowerCase().includes(q)),
  );
}
