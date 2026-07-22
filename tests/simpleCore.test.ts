import { describe, expect, it } from "vitest";
import { validateSimpleRows, SIMPLE_HEADER } from "../src/logic/simpleCore";
import vocabJson from "../src/data/vocab.json";
import type { Vocab } from "../src/logic/csvCore.mjs";

const vocab = vocabJson as Vocab;

const HEADER_ROW = [...SIMPLE_HEADER];

function rows(...dataRows: string[][]): string[][] {
  return [HEADER_ROW, ...dataRows];
}

describe("validateSimpleRows", () => {
  it("サンプル3行を正しくProductへ変換する", () => {
    const result = validateSimpleRows(
      rows(
        [
          "らくあゆみステッキ軽量型",
          "歩行補助",
          "1200",
          "軽くてにぎりやすい定番の一本杖",
          "ふらつく・転びやすい",
          "屋外の外出が不安",
          "本人が使う",
        ],
        [
          "ささえ四点杖ワイド",
          "歩行補助",
          "1800",
          "自立するから立ち上がり時も支えになる四点杖",
          "ふらつく・転びやすい",
          "支えがないと立てない",
          "本人が使う",
        ],
        [
          "みまもりセンサーライト",
          "見守り・生活サポート",
          "2000",
          "夜中の動きをやさしく知らせる見守りセンサー",
          "夜中に動き回る",
          "一人にするのが心配",
          "どちらも",
        ],
      ),
      vocab,
    );

    expect(result.errors).toEqual([]);
    expect(result.products).toHaveLength(3);

    const [p1, p2, p3] = result.products;
    expect(p1.id).toBe("p001");
    expect(p2.id).toBe("p002");
    expect(p3.id).toBe("p003");

    expect(p1.maker).toBe("―");
    expect(p1.insurance).toBe("rental");
    expect(p1.popularity).toBe(3);
    expect(p1.specs).toEqual({});
    expect(p1.description).toBe(p1.summary);
    expect(p1.genre).toBe("walking");
    expect(p1.genreLabel).toBe("歩行補助");
    expect(p1.recommendFor).toEqual([
      "「ふらつく・転びやすい」でお困りの方",
      "「屋外の外出が不安」でお困りの方",
    ]);
    expect(p1.userTags).toEqual(["本人が使う"]);
    expect(p3.userTags).toEqual(["本人が使う", "家族の介護に使う"]);
  });

  it("困りごとの場面を自動導出し、同一場面は重複除去する", () => {
    const result = validateSimpleRows(
      rows([
        "テスト杖",
        "歩行補助",
        "1000",
        "説明",
        "ふらつく・転びやすい",
        "支えがないと立てない",
        "本人が使う",
      ]),
      vocab,
    );
    expect(result.errors).toEqual([]);
    // ふらつく・転びやすい=歩く・移動 / 支えがないと立てない=立つ・座る
    expect(result.products[0].sceneTags).toEqual(["歩く・移動", "立つ・座る"]);
  });

  it("同一場面の困りごと2つはsceneTagsが1つに重複除去される", () => {
    const result = validateSimpleRows(
      rows([
        "テスト杖",
        "歩行補助",
        "1000",
        "説明",
        "ふらつく・転びやすい",
        "屋外の外出が不安",
        "本人が使う",
      ]),
      vocab,
    );
    expect(result.errors).toEqual([]);
    expect(result.products[0].sceneTags).toEqual(["歩く・移動"]);
  });

  it("見出し不一致はエラーを返す", () => {
    const result = validateSimpleRows(
      [["a", "b", "c", "d", "e", "f", "g"]],
      vocab,
    );
    expect(result.products).toEqual([]);
    expect(result.errors).toEqual([
      "1行目の見出しが想定と一致しません。かんたん版ひな形(.xlsx)の1行目を変更せずお使いください",
    ]);
  });

  it("商品名が空ならエラー", () => {
    const result = validateSimpleRows(
      rows([
        "",
        "歩行補助",
        "1000",
        "説明",
        "ふらつく・転びやすい",
        "",
        "本人が使う",
      ]),
      vocab,
    );
    expect(result.errors).toContain("2行目: 商品名 が空です");
  });

  it("分類が語彙外ならエラー", () => {
    const result = validateSimpleRows(
      rows([
        "テスト",
        "存在しない分類",
        "1000",
        "説明",
        "ふらつく・転びやすい",
        "",
        "本人が使う",
      ]),
      vocab,
    );
    expect(result.errors).toContain(
      '2行目: 分類 "存在しない分類" は選択肢にありません(プルダウンから選んでください)',
    );
  });

  it("価格に文字が混じるとエラー", () => {
    const result = validateSimpleRows(
      rows([
        "テスト",
        "歩行補助",
        "1,200円",
        "説明",
        "ふらつく・転びやすい",
        "",
        "本人が使う",
      ]),
      vocab,
    );
    expect(result.errors).toContain(
      '2行目: 価格 "1,200円" は正の整数ではありません(数字だけを入力してください)',
    );
  });

  it("困りごと1が空ならエラー", () => {
    const result = validateSimpleRows(
      rows(["テスト", "歩行補助", "1000", "説明", "", "", "本人が使う"]),
      vocab,
    );
    expect(result.errors).toContain(
      "2行目: 困りごと1 が空です(プルダウンから選んでください)",
    );
  });

  it("困りごとが語彙外ならエラー", () => {
    const result = validateSimpleRows(
      rows([
        "テスト",
        "歩行補助",
        "1000",
        "説明",
        "存在しない困りごと",
        "",
        "本人が使う",
      ]),
      vocab,
    );
    expect(result.errors).toContain(
      '2行目: 困りごと "存在しない困りごと" は選択肢にありません(プルダウンから選んでください)',
    );
  });

  it("誰が使うが語彙外ならエラー", () => {
    const result = validateSimpleRows(
      rows([
        "テスト",
        "歩行補助",
        "1000",
        "説明",
        "ふらつく・転びやすい",
        "",
        "本人",
      ]),
      vocab,
    );
    expect(result.errors).toContain(
      '2行目: 誰が使う "本人" は選択肢にありません(プルダウンから選んでください)',
    );
  });

  it("全列空の行はスキップされ、行番号が詰まらない", () => {
    const result = validateSimpleRows(
      rows(
        ["", "", "", "", "", "", ""],
        [
          "テスト",
          "存在しない分類",
          "1000",
          "説明",
          "ふらつく・転びやすい",
          "",
          "本人が使う",
        ],
      ),
      vocab,
    );
    expect(result.errors).toContain(
      '3行目: 分類 "存在しない分類" は選択肢にありません(プルダウンから選んでください)',
    );
  });

  it("有効なデータ行が0件ならエラー", () => {
    const result = validateSimpleRows(
      rows(["", "", "", "", "", "", ""]),
      vocab,
    );
    expect(result.errors).toEqual([
      "商品データが1件もありません(2行目以降に記入してください)",
    ]);
  });
});
