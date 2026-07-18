import type { Product } from "../types";

/** 3桁区切りの円表示 */
export function formatYen(n: number): string {
  return n.toLocaleString("ja-JP");
}

/** 保険適用1割負担額(設計書§5-7: Math.ceil(price / 10)) */
export function copayment(price: number): number {
  return Math.ceil(price / 10);
}

/** 価格表示文字列(設計書§5-7の表) */
export function priceLabel(product: Product): string {
  const yen = formatYen(product.price);
  switch (product.insurance) {
    case "rental":
      return `レンタル月額 ${yen}円(保険適用1割負担: ${formatYen(copayment(product.price))}円/月)`;
    case "purchase":
      return `販売価格 ${yen}円(特定福祉用具販売・保険適用1割負担: ${formatYen(copayment(product.price))}円)`;
    case "none":
      return `販売価格 ${yen}円(保険適用外)`;
  }
}

/** 保険区分の短い表示名 */
export function insuranceLabel(product: Product): string {
  switch (product.insurance) {
    case "rental":
      return "レンタル対象";
    case "purchase":
      return "販売対象(特定福祉用具)";
    case "none":
      return "販売(保険適用外)";
  }
}
