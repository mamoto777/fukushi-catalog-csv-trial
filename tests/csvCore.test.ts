import { describe, expect, it } from "vitest";
import { parseCsv, validateProducts } from "../src/logic/csvCore.mjs";
import { importCsvFile } from "../src/logic/csvImport";

const HEADER = [
  "id",
  "name",
  "maker",
  "taisCode",
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
    "01234-000099",
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
    expect(result.products[0].taisCode).toBe("01234-000099");
  });

  it("taisCodeが空文字の行もエラーにならず空文字のまま格納される", () => {
    const row = validRow("p001");
    row[3] = ""; // taisCode
    const rows = [HEADER, row];
    const result = validateProducts(rows, vocab);
    expect(result.errors).toEqual([]);
    expect(result.products[0].taisCode).toBe("");
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
    expect(result.errors).toEqual(["2行目: 列数が15です(16列必要)"]);
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
    row[12] = "語彙にない困りごと"; // concernTags
    const rows = [HEADER, row];
    const result = validateProducts(rows, vocab);
    expect(result.errors).toContain(
      '2行目: concernTag "語彙にない困りごと" は語彙(vocab.json)にありません',
    );
  });

  it("priceが正の整数でない場合エラーになる", () => {
    const row = validRow("p001");
    row[5] = "-100"; // price
    const rows = [HEADER, row];
    const result = validateProducts(rows, vocab);
    expect(result.errors).toContain('2行目: price "-100" は正の整数ではありません');
  });

  it("popularityが1〜5の範囲外の場合エラーになる", () => {
    const row = validRow("p001");
    row[15] = "6"; // popularity
    const rows = [HEADER, row];
    const result = validateProducts(rows, vocab);
    expect(result.errors).toContain('2行目: popularity "6" は1〜5の整数にしてください');
  });
});

/**
 * 実際の src/data/vocab.json の語彙に一致するShift_JISバイト列(Pythonの
 * `str.encode("shift_jis")` で機械的に算出。手打ちの誤りを避けるため)。
 */
const SJIS_CONCERN = new Uint8Array([
  130, 211, 130, 231, 130, 194, 130, 173, 129, 69, 147, 93, 130, 209, 130,
  226, 130, 183, 130, 162,
]); // "ふらつく・転びやすい"
const SJIS_SCENE = new Uint8Array([149, 224, 130, 173, 129, 69, 136, 218, 147, 174]); // "歩く・移動"
const SJIS_USER = new Uint8Array([150, 123, 144, 108, 130, 170, 142, 103, 130, 164]); // "本人が使う"

function concatBytes(parts: (string | Uint8Array<ArrayBuffer>)[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const chunks = parts.map((p) => (typeof p === "string" ? encoder.encode(p) : p));
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Shift_JISでのみ正しく読める(UTF-8としては文字化けする)CSVファイルを1件分作る */
function buildShiftJisCsvFile(): File {
  const asciiRowPrefix =
    HEADER.join(",") +
    "\n" +
    "p001,Item A,Maker A,,walking,3000,rental,Summary,Description,weight:490g,test,Caution,";
  const bytes = concatBytes([
    asciiRowPrefix,
    SJIS_CONCERN,
    ",",
    SJIS_SCENE,
    ",",
    SJIS_USER,
    ",3\n",
  ]);
  return new File([bytes], "products-sjis.csv", { type: "text/csv" });
}

describe("importCsvFile", () => {
  it("正常なUTF-8 CSVを読み込み、encoding:utf-8で商品を返す", async () => {
    const text =
      HEADER.join(",") + "\n" + validRow("p001").join(",") + "\n" +
      validRow("p002").join(",") + "\n";
    const file = new File([text], "products.csv", { type: "text/csv" });
    const result = await importCsvFile(file, vocab);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.encoding).toBe("utf-8");
      expect(result.count).toBe(2);
      expect(result.products).toHaveLength(2);
      expect(result.vocab).toBeNull();
    }
  });

  it("Shift_JISエンコードのCSVをencoding:shift_jisとして読み込む", async () => {
    const file = buildShiftJisCsvFile();
    const result = await importCsvFile(file, vocab);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.encoding).toBe("shift_jis");
      expect(result.count).toBe(1);
      expect(result.products[0].concernTags).toEqual(["ふらつく・転びやすい"]);
    }
  });

  it("ファイルサイズが10MBを超える場合はエラーになる", async () => {
    const bigBytes = new Uint8Array(10 * 1024 * 1024 + 1).fill(0x61); // 'a'
    const file = new File([bigBytes], "big.csv", { type: "text/csv" });
    const result = await importCsvFile(file, vocab);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(["ファイルが大きすぎます(上限10MB)"]);
    }
  });

  it("データ行が1,000行を超える場合はエラーになる(検証前に弾く)", async () => {
    const lines = ["a,b,c"];
    for (let i = 0; i < 1001; i++) lines.push("x,y,z");
    const text = lines.join("\n") + "\n";
    const file = new File([text], "toolong.csv", { type: "text/csv" });
    const result = await importCsvFile(file, vocab);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(["商品データは1,000行までにしてください"]);
    }
  });

  it("検証エラーがある場合はエラー一覧をそのまま返す", async () => {
    const row = validRow("invalid-id");
    const text = HEADER.join(",") + "\n" + row.join(",") + "\n";
    const file = new File([text], "invalid.csv", { type: "text/csv" });
    const result = await importCsvFile(file, vocab);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("は p001 形式ではありません");
    }
  });
});
