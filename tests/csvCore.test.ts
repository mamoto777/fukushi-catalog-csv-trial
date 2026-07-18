import { describe, expect, it } from "vitest";
import { parseCsv, validateProducts } from "../src/logic/csvCore.mjs";

const HEADER = [
  "id",
  "name",
  "maker",
  "genre",
  "price",
  "insurance",
  "summary",
  "description",
  "specs",
  "recommendFor",
  "caution",
  "concernTags",
  "sceneTags",
  "userTags",
  "popularity",
];

const vocab = {
  users: ["本人が使う", "家族の介護に使う"],
  genres: [{ id: "walking", label: "歩行補助" }],
  scenes: [
    { label: "歩く・移動", concerns: ["ふらつく・転びやすい", "長い距離を歩けない"] },
  ],
};

/** 正常な1行データを作るヘルパー(id以外は固定値) */
function validRow(id: string): string[] {
  return [
    id,
    "杖A",
    "メーカーA",
    "walking",
    "3000",
    "rental",
    "要約",
    "説明",
    "重さ:490g",
    "外出時|屋内",
    "注意点",
    "ふらつく・転びやすい",
    "歩く・移動",
    "本人が使う",
    "3",
  ];
}

describe("parseCsv", () => {
  it("引用符で囲んだセル内のカンマ・改行を1セルとして扱う", () => {
    const text =
      'a,"b, with comma","line1\nline2"\n' + '1,"2, two",plain\n';
    const rows = parseCsv(text);
    expect(rows).toEqual([
      ["a", "b, with comma", "line1\nline2"],
      ["1", "2, two", "plain"],
    ]);
  });

  it("BOM付きテキストの先頭BOMを除去する", () => {
    const text = "﻿id,name\np001,テスト\n";
    const rows = parseCsv(text);
    expect(rows).toEqual([
      ["id", "name"],
      ["p001", "テスト"],
    ]);
  });
});

describe("validateProducts", () => {
  it("正常な3行を全件Productに変換しエラーなしで返す", () => {
    const rows = [HEADER, validRow("p001"), validRow("p002"), validRow("p003")];
    const result = validateProducts(rows, vocab);
    expect(result.errors).toEqual([]);
    expect(result.products).toHaveLength(3);
    expect(result.products[0].id).toBe("p001");
    expect(result.products[0].genreLabel).toBe("歩行補助");
  });

  it("ヘッダ行が想定と一致しない場合、products空+エラー1件を返す", () => {
    const badHeader = ["id", "name"]; // 列不足・不一致
    const rows = [badHeader, validRow("p001")];
    const result = validateProducts(rows, vocab);
    expect(result.products).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("ヘッダ行が想定と一致しません。");
    expect(result.errors[0]).toContain("想定: " + HEADER.join(","));
    expect(result.errors[0]).toContain("実際: " + badHeader.join(","));
  });

  it("列数が不足している行はエラーになりproductsは空になる", () => {
    const shortRow = validRow("p001").slice(0, -1); // 1列減らす
    const rows = [HEADER, shortRow];
    const result = validateProducts(rows, vocab);
    expect(result.products).toEqual([]);
    expect(result.errors).toEqual(["2行目: 列数が14です(15列必要)"]);
  });

  it("id形式が不正な場合エラーになる", () => {
    const rows = [HEADER, validRow("invalid-id")];
    const result = validateProducts(rows, vocab);
    expect(result.errors).toContain('2行目: id "invalid-id" は p001 形式ではありません');
  });

  it("idが重複している場合エラーになる", () => {
    const rows = [HEADER, validRow("p001"), validRow("p001")];
    const result = validateProducts(rows, vocab);
    expect(result.errors).toContain('3行目: id "p001" が重複しています');
  });

  it("語彙(vocab.json)にないタグはエラーになる", () => {
    const row = validRow("p001");
    row[11] = "語彙にない困りごと"; // concernTags
    const rows = [HEADER, row];
    const result = validateProducts(rows, vocab);
    expect(result.errors).toContain(
      '2行目: concernTag "語彙にない困りごと" は語彙(vocab.json)にありません',
    );
  });

  it("priceが正の整数でない場合エラーになる", () => {
    const row = validRow("p001");
    row[4] = "-100"; // price
    const rows = [HEADER, row];
    const result = validateProducts(rows, vocab);
    expect(result.errors).toContain('2行目: price "-100" は正の整数ではありません');
  });

  it("popularityが1〜5の範囲外の場合エラーになる", () => {
    const row = validRow("p001");
    row[14] = "6"; // popularity
    const rows = [HEADER, row];
    const result = validateProducts(rows, vocab);
    expect(result.errors).toContain('2行目: popularity "6" は1〜5の整数にしてください');
  });
});
