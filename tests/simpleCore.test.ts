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
          "あおぞら福祉機器",
          "歩行補助",
          "1200",
          "01234-000001",
          "軽くてにぎりやすい定番の一本杖",
          "重さ:290g\n高さ調節:71〜94cm(10段階)",
          "ふらつく・転びやすい",
          "屋外の外出が不安",
          "本人が使う",
        ],
        [
          "ささえ四点杖ワイド",
          "",
          "歩行補助",
          "1800",
          "",
          "自立するから立ち上がり時も支えになる四点杖",
          "重さ:640g\n高さ調節:66〜89cm",
          "ふらつく・転びやすい",
          "支えがないと立てない",
          "本人が使う",
        ],
        [
          "みまもりセンサーライト",
          "みらいケア",
          "見守り・生活サポート",
          "2000",
          "",
          "夜中の動きをやさしく知らせる見守りセンサー",
          "",
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

    expect(p1.maker).toBe("あおぞら福祉機器");
    expect(p1.taisCode).toBe("01234-000001");
    expect(p1.specs).toEqual({
      "重さ": "290g",
      "高さ調節": "71〜94cm(10段階)",
    });
    expect(p1.insurance).toBe("rental");
    expect(p1.popularity).toBe(3);
    expect(p1.description).toBe(p1.summary);
    expect(p1.genre).toBe("walking");
    expect(p1.genreLabel).toBe("歩行補助");
    expect(p1.recommendFor).toEqual([
      "「ふらつく・転びやすい」でお困りの方",
      "「屋外の外出が不安」でお困りの方",
    ]);
    expect(p1.userTags).toEqual(["本人が使う"]);

    expect(p2.maker).toBe("―"); // メーカー空欄→"―"
    expect(p2.taisCode).toBe(""); // TAISコード空欄→空文字

    expect(p3.specs).toEqual({}); // 仕様空欄→{}
    expect(p3.userTags).toEqual(["本人が使う", "家族の介護に使う"]);
  });

  it("困りごとの場面を自動導出し、同一場面は重複除去する", () => {
    const result = validateSimpleRows(
      rows([
        "テスト杖",
        "テストメーカー",
        "歩行補助",
        "1000",
        "",
        "説明",
        "",
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
        "テストメーカー",
        "歩行補助",
        "1000",
        "",
        "説明",
        "",
        "ふらつく・転びやすい",
        "屋外の外出が不安",
        "本人が使う",
      ]),
      vocab,
    );
    expect(result.errors).toEqual([]);
    expect(result.products[0].sceneTags).toEqual(["歩く・移動"]);
  });

  it("シート由来の語彙(困りごと)が変わるとsceneTagsの導出も変わる", () => {
    const customVocab: Vocab = {
      users: vocab.users,
      genres: vocab.genres,
      scenes: [{ label: "新しい場面", concerns: ["新しい困りごと"] }],
    };
    const result = validateSimpleRows(
      rows([
        "テスト杖",
        "テストメーカー",
        "歩行補助",
        "1000",
        "",
        "説明",
        "",
        "新しい困りごと",
        "",
        "本人が使う",
      ]),
      customVocab,
    );
    expect(result.errors).toEqual([]);
    expect(result.products[0].sceneTags).toEqual(["新しい場面"]);
  });

  it("見出し不一致(旧7列ひな形含む)はエラーを返す", () => {
    const result = validateSimpleRows(
      [["商品名", "分類", "価格(円)", "ひとこと説明", "困りごと1", "困りごと2", "誰が使う"]],
      vocab,
    );
    expect(result.products).toEqual([]);
    expect(result.errors).toEqual([
      "1行目: ひな形が古い形式か、見出しが変更されています。アプリから新しいひな形(Excel)をダウンロードしてお使いください",
    ]);
  });

  it("商品名が空ならエラー", () => {
    const result = validateSimpleRows(
      rows([
        "",
        "テストメーカー",
        "歩行補助",
        "1000",
        "",
        "説明",
        "",
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
        "テストメーカー",
        "存在しない分類",
        "1000",
        "",
        "説明",
        "",
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
        "テストメーカー",
        "歩行補助",
        "1,200円",
        "",
        "説明",
        "",
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
      rows([
        "テスト",
        "テストメーカー",
        "歩行補助",
        "1000",
        "",
        "説明",
        "",
        "",
        "",
        "本人が使う",
      ]),
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
        "テストメーカー",
        "歩行補助",
        "1000",
        "",
        "説明",
        "",
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
        "テストメーカー",
        "歩行補助",
        "1000",
        "",
        "説明",
        "",
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
        ["", "", "", "", "", "", "", "", "", ""],
        [
          "テスト",
          "テストメーカー",
          "存在しない分類",
          "1000",
          "",
          "説明",
          "",
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
      rows(["", "", "", "", "", "", "", "", "", ""]),
      vocab,
    );
    expect(result.errors).toEqual([
      "商品データが1件もありません(2行目以降に記入してください)",
    ]);
  });

  describe("仕様(G列)のパース規則", () => {
    function specsFor(specsCell: string) {
      return validateSimpleRows(
        rows([
          "テスト",
          "テストメーカー",
          "歩行補助",
          "1000",
          "",
          "説明",
          specsCell,
          "ふらつく・転びやすい",
          "",
          "本人が使う",
        ]),
        vocab,
      );
    }

    it("半角コロンで区切る", () => {
      const result = specsFor("重さ:490g");
      expect(result.errors).toEqual([]);
      expect(result.products[0].specs).toEqual({ "重さ": "490g" });
    });

    it("全角コロンで区切る", () => {
      const result = specsFor("重さ：490g");
      expect(result.errors).toEqual([]);
      expect(result.products[0].specs).toEqual({ "重さ": "490g" });
    });

    it("セル内改行で複数行を解釈する", () => {
      const result = specsFor("重さ:490g\n高さ調節:71〜94cm");
      expect(result.errors).toEqual([]);
      expect(result.products[0].specs).toEqual({
        "重さ": "490g",
        "高さ調節": "71〜94cm",
      });
    });

    it("空行は無視する", () => {
      const result = specsFor("重さ:490g\n\n高さ調節:71〜94cm\n");
      expect(result.errors).toEqual([]);
      expect(result.products[0].specs).toEqual({
        "重さ": "490g",
        "高さ調節": "71〜94cm",
      });
    });

    it("コロンを含まない行は行番号つきエラーになり、全体が取り込まれない(全体エラー)", () => {
      const result = specsFor("重さ490g");
      expect(result.errors).toEqual([
        '2行目: 仕様 "重さ490g" は「項目名:値」形式ではありません',
      ]);
      expect(result.products).toEqual([]);
    });

    it("項目名が空(コロンが先頭)の行もエラーになる", () => {
      const result = specsFor(":値のみ");
      expect(result.errors).toEqual([
        '2行目: 仕様 ":値のみ" は「項目名:値」形式ではありません',
      ]);
      expect(result.products).toEqual([]);
    });
  });
});
