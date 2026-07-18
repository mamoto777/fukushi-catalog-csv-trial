import { describe, expect, it } from "vitest";
import { matchProducts, scoreProduct } from "../src/logic/matching";
import { copayment, formatYen, priceLabel } from "../src/logic/format";
import type { NaviAnswers, Product } from "../src/types";

/** テスト用商品を作るヘルパー */
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

const baseAnswers: NaviAnswers = {
  user: "本人が使う",
  scene: "歩く・移動",
  concerns: ["ふらつく・転びやすい", "長い距離を歩けない"],
};

describe("scoreProduct(設計書§5-6のスコア式)", () => {
  it("concern一致×3 + scene一致×2 + user一致×1 を合計する", () => {
    const p = makeProduct({
      id: "p001",
      concernTags: ["ふらつく・転びやすい", "長い距離を歩けない"],
      sceneTags: ["歩く・移動"],
      userTags: ["本人が使う"],
    });
    // 3*2 + 2*1 + 1*1 = 9
    expect(scoreProduct(p, baseAnswers)).toBe(9);
  });

  it("何も一致しなければ0", () => {
    const p = makeProduct({
      id: "p002",
      concernTags: ["床ずれが心配"],
      sceneTags: ["寝る・起きる"],
      userTags: ["家族の介護に使う"],
    });
    expect(scoreProduct(p, baseAnswers)).toBe(0);
  });

  it("回答がnull(未回答)の項目は加点しない", () => {
    const p = makeProduct({
      id: "p003",
      concernTags: ["ふらつく・転びやすい"],
      sceneTags: ["歩く・移動"],
      userTags: ["本人が使う"],
    });
    const answers: NaviAnswers = { user: null, scene: null, concerns: [] };
    expect(scoreProduct(p, answers)).toBe(0);
  });
});

describe("matchProducts(絞り込み・並び順)", () => {
  it("concernTag一致が1つ以上ある商品をスコア降順で返す", () => {
    const products = [
      makeProduct({
        id: "p001",
        concernTags: ["ふらつく・転びやすい"],
        sceneTags: ["歩く・移動"],
      }),
      makeProduct({
        id: "p002",
        concernTags: ["ふらつく・転びやすい", "長い距離を歩けない"],
        sceneTags: ["歩く・移動"],
      }),
      makeProduct({
        id: "p003",
        concernTags: ["床ずれが心配"],
        sceneTags: ["寝る・起きる"],
      }),
    ];
    const { items, broadened } = matchProducts(products, baseAnswers);
    expect(items.map((s) => s.product.id)).toEqual(["p002", "p001"]);
    // 2件(3件未満)だがscene一致の追加候補なし → broadenedはfalse
    expect(broadened).toBe(false);
  });

  it("同点はpopularity降順、それも同じならid昇順", () => {
    const products = [
      makeProduct({
        id: "p003",
        concernTags: ["ふらつく・転びやすい"],
        popularity: 3,
      }),
      makeProduct({
        id: "p001",
        concernTags: ["ふらつく・転びやすい"],
        popularity: 3,
      }),
      makeProduct({
        id: "p002",
        concernTags: ["ふらつく・転びやすい"],
        popularity: 5,
      }),
    ];
    const { items } = matchProducts(products, baseAnswers);
    expect(items.map((s) => s.product.id)).toEqual(["p002", "p001", "p003"]);
  });

  it("concern一致が3件未満ならsceneTag一致商品まで広げてbroadened=true", () => {
    const products = [
      makeProduct({
        id: "p001",
        concernTags: ["ふらつく・転びやすい"],
        sceneTags: ["歩く・移動"],
      }),
      makeProduct({
        id: "p002",
        concernTags: ["段差につまずく"],
        sceneTags: ["歩く・移動"],
      }),
      makeProduct({
        id: "p003",
        concernTags: ["床ずれが心配"],
        sceneTags: ["寝る・起きる"],
      }),
    ];
    const { items, broadened } = matchProducts(products, baseAnswers);
    // p001がconcern一致、p002はscene一致で追加。p003は対象外
    expect(items.map((s) => s.product.id)).toEqual(["p001", "p002"]);
    expect(broadened).toBe(true);
  });

  it("concern一致が3件以上なら範囲を広げない", () => {
    const products = [
      makeProduct({ id: "p001", concernTags: ["ふらつく・転びやすい"] }),
      makeProduct({ id: "p002", concernTags: ["ふらつく・転びやすい"] }),
      makeProduct({ id: "p003", concernTags: ["長い距離を歩けない"] }),
      makeProduct({
        id: "p004",
        concernTags: ["段差につまずく"],
        sceneTags: ["歩く・移動"],
      }),
    ];
    const { items, broadened } = matchProducts(products, baseAnswers);
    expect(items).toHaveLength(3);
    expect(broadened).toBe(false);
    expect(items.map((s) => s.product.id)).not.toContain("p004");
  });

  it("一致が何もなければ空(EmptyState行き)", () => {
    const products = [
      makeProduct({
        id: "p001",
        concernTags: ["床ずれが心配"],
        sceneTags: ["寝る・起きる"],
      }),
    ];
    const { items } = matchProducts(products, baseAnswers);
    expect(items).toHaveLength(0);
  });

  it("concerns空(条件をひろげて再検索)はscene一致のみで返す", () => {
    const products = [
      makeProduct({
        id: "p001",
        concernTags: ["ふらつく・転びやすい"],
        sceneTags: ["歩く・移動"],
      }),
      makeProduct({
        id: "p002",
        concernTags: ["床ずれが心配"],
        sceneTags: ["寝る・起きる"],
      }),
    ];
    const answers: NaviAnswers = {
      user: "本人が使う",
      scene: "歩く・移動",
      concerns: [],
    };
    const { items } = matchProducts(products, answers);
    expect(items.map((s) => s.product.id)).toEqual(["p001"]);
  });

  it("商品0件でも例外にならず空を返す", () => {
    const { items, broadened } = matchProducts([], baseAnswers);
    expect(items).toHaveLength(0);
    expect(broadened).toBe(false);
  });
});

describe("format(価格表示§5-7)", () => {
  it("1割負担額はMath.ceil(price/10)", () => {
    expect(copayment(5000)).toBe(500);
    expect(copayment(1234)).toBe(124); // 切り上げ
    expect(copayment(1)).toBe(1); // 境界値
  });

  it("3桁区切り表示", () => {
    expect(formatYen(12000)).toBe("12,000");
    expect(formatYen(300)).toBe("300");
  });

  it("rentalは月額+1割負担/月", () => {
    const p = makeProduct({ id: "p001", price: 5000, insurance: "rental" });
    expect(priceLabel(p)).toBe(
      "レンタル月額 5,000円(保険適用1割負担: 500円/月)",
    );
  });

  it("purchaseは販売価格+特定福祉用具販売の注記", () => {
    const p = makeProduct({ id: "p001", price: 12000, insurance: "purchase" });
    expect(priceLabel(p)).toBe(
      "販売価格 12,000円(特定福祉用具販売・保険適用1割負担: 1,200円)",
    );
  });

  it("noneは販売価格+保険適用外", () => {
    const p = makeProduct({ id: "p001", price: 3800, insurance: "none" });
    expect(priceLabel(p)).toBe("販売価格 3,800円(保険適用外)");
  });
});
