import { describe, expect, it } from "vitest";
import { similarProducts } from "../src/logic/similar";
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

describe("similarProducts", () => {
  it("同ジャンル+共通困りごと1以上のみ抽出する", () => {
    const target = makeProduct({
      id: "p001",
      genre: "walking",
      concernTags: ["ふらつく・転びやすい", "長い距離を歩けない"],
    });
    const products = [
      target,
      makeProduct({
        id: "p002",
        genre: "walking",
        concernTags: ["ふらつく・転びやすい"],
      }),
      makeProduct({ id: "p003", genre: "wheelchair", concernTags: ["ふらつく・転びやすい"] }), // ジャンル違い
      makeProduct({ id: "p004", genre: "walking", concernTags: ["段差につまずく"] }), // 困りごと不一致
    ];
    const result = similarProducts(target, products);
    expect(result.map((p) => p.id)).toEqual(["p002"]);
  });

  it("スコア=共通するconcernTags数", () => {
    const target = makeProduct({
      id: "p001",
      concernTags: ["a", "b", "c"],
    });
    const products = [
      target,
      makeProduct({ id: "p002", concernTags: ["a"] }), // score 1
      makeProduct({ id: "p003", concernTags: ["a", "b"] }), // score 2
      makeProduct({ id: "p004", concernTags: ["a", "b", "c"] }), // score 3
    ];
    const result = similarProducts(target, products);
    expect(result.map((p) => p.id)).toEqual(["p004", "p003", "p002"]);
  });

  it("スコア降順→popularity降順→id昇順で並ぶ", () => {
    const target = makeProduct({ id: "p001", concernTags: ["a"] });
    const products = [
      target,
      makeProduct({ id: "p003", concernTags: ["a"], popularity: 3 }),
      makeProduct({ id: "p002", concernTags: ["a"], popularity: 3 }),
      makeProduct({ id: "p004", concernTags: ["a"], popularity: 5 }),
    ];
    const result = similarProducts(target, products);
    expect(result.map((p) => p.id)).toEqual(["p004", "p002", "p003"]);
  });

  it("上位3件で打ち切る", () => {
    const target = makeProduct({ id: "p001", concernTags: ["a"] });
    const products = [
      target,
      makeProduct({ id: "p002", concernTags: ["a"] }),
      makeProduct({ id: "p003", concernTags: ["a"] }),
      makeProduct({ id: "p004", concernTags: ["a"] }),
      makeProduct({ id: "p005", concernTags: ["a"] }),
    ];
    const result = similarProducts(target, products);
    expect(result).toHaveLength(3);
  });

  it("自分自身は除外する", () => {
    const target = makeProduct({ id: "p001", concernTags: ["a"] });
    const result = similarProducts(target, [target]);
    expect(result).toEqual([]);
  });

  it("該当なしなら0件", () => {
    const target = makeProduct({ id: "p001", concernTags: ["a"] });
    const products = [
      target,
      makeProduct({ id: "p002", genre: "wheelchair", concernTags: ["a"] }),
    ];
    expect(similarProducts(target, products)).toEqual([]);
  });
});
