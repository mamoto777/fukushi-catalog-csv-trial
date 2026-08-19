import { describe, expect, it } from "vitest";
import { searchProducts } from "../src/logic/search";
import type { Product } from "../src/types";

function makeProduct(overrides: Partial<Product> & { id: string }): Product {
  return {
    name: "テスト商品",
    maker: "テストメーカー",
    genre: "walking",
    genreLabel: "歩行補助",
    price: 1000,
    insurance: "rental",
    image: "./images/genre-walking.svg",
    summary: "テスト用",
    description: "テスト用の商品です",
    specs: {},
    recommendFor: ["テスト"],
    caution: "テスト",
    concernTags: [],
    sceneTags: [],
    userTags: ["本人が使う"],
    popularity: 3,
    ...overrides,
  };
}

describe("searchProducts", () => {
  const products: Product[] = [
    makeProduct({
      id: "p001",
      name: "らくあゆみステッキ軽量型",
      maker: "あおぞら福祉機器",
      taisCode: "01234-000001",
    }),
    makeProduct({
      id: "p002",
      name: "ささえ四点杖ワイド",
      maker: "ケアサポート工業",
      taisCode: undefined,
    }),
    makeProduct({
      id: "p003",
      name: "みまもりセンサーライト",
      maker: "みらいケア",
      taisCode: "",
    }),
  ];

  it("商品名の部分一致で見つかる", () => {
    expect(searchProducts(products, "ステッキ").map((p) => p.id)).toEqual(["p001"]);
  });

  it("メーカーの部分一致で見つかる", () => {
    expect(searchProducts(products, "ケア").map((p) => p.id)).toEqual([
      "p002",
      "p003",
    ]);
  });

  it("TAISコードの部分一致で見つかる", () => {
    expect(searchProducts(products, "000001").map((p) => p.id)).toEqual(["p001"]);
  });

  it("英字の大文字小文字を無視する", () => {
    const withAlpha = [
      makeProduct({ id: "p010", name: "ABC Walker", maker: "" }),
    ];
    expect(searchProducts(withAlpha, "abc").map((p) => p.id)).toEqual(["p010"]);
    expect(searchProducts(withAlpha, "ABC").map((p) => p.id)).toEqual(["p010"]);
  });

  it("クエリの前後空白をtrimする", () => {
    expect(searchProducts(products, "  ステッキ  ").map((p) => p.id)).toEqual([
      "p001",
    ]);
  });

  it("空クエリは空配列を返す", () => {
    expect(searchProducts(products, "")).toEqual([]);
    expect(searchProducts(products, "   ")).toEqual([]);
  });

  it("taisCodeが未定義の商品でも例外にならない", () => {
    expect(() => searchProducts(products, "杖")).not.toThrow();
    expect(searchProducts(products, "杖").map((p) => p.id)).toEqual(["p002"]);
  });

  it("入力配列の順序を維持する(並べ替えしない)", () => {
    const reordered = [products[2], products[0], products[1]];
    expect(searchProducts(reordered, "").length).toBe(0);
    // p003(みらいケア)・p002(ケアサポート工業)が「ケア」に一致。reordered内の並び順のまま返る
    expect(searchProducts(reordered, "ケア").map((p) => p.id)).toEqual([
      "p003",
      "p002",
    ]);
  });
});
