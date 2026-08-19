import { describe, expect, it } from "vitest";
import { buildScenesFromRows, SCENE_SHEET_HEADER } from "../src/logic/sceneCore";
import vocabJson from "../src/data/vocab.json";
import type { Vocab } from "../src/logic/csvCore.mjs";

const vocab = vocabJson as Vocab;

const HEADER_ROW = [...SCENE_SHEET_HEADER];

function rows(...dataRows: string[][]): string[][] {
  return [HEADER_ROW, ...dataRows];
}

/** 内蔵vocab.jsonの全31行相当(場面×困りごと)を機械転記した行を作る */
function vocabRows(): string[][] {
  return vocab.scenes.flatMap((s) => s.concerns.map((c) => [s.label, c]));
}

describe("buildScenesFromRows", () => {
  it("内蔵31行相当を読み込むと7場面・順序を保持して復元する", () => {
    const result = buildScenesFromRows(rows(...vocabRows()));
    expect(result.errors).toEqual([]);
    expect(result.scenes).toEqual(vocab.scenes);
  });

  it("場面の並び順=初出順、困りごとの並び順=行順", () => {
    const result = buildScenesFromRows(
      rows(
        ["場面B", "困りごとB1"],
        ["場面A", "困りごとA1"],
        ["場面B", "困りごとB2"],
        ["場面A", "困りごとA2"],
      ),
    );
    expect(result.errors).toEqual([]);
    expect(result.scenes).toEqual([
      { label: "場面B", concerns: ["困りごとB1", "困りごとB2"] },
      { label: "場面A", concerns: ["困りごとA1", "困りごとA2"] },
    ]);
  });

  it("新しい場面を追加すると反映される", () => {
    const result = buildScenesFromRows(
      rows(...vocabRows(), ["新しい場面", "新しい困りごと"]),
    );
    expect(result.errors).toEqual([]);
    expect(result.scenes).toHaveLength(8);
    expect(result.scenes[7]).toEqual({
      label: "新しい場面",
      concerns: ["新しい困りごと"],
    });
  });

  it("見出しが「場面」「困りごと」でない場合はエラー", () => {
    const result = buildScenesFromRows([["a", "b"], ["場面A", "困りごとA"]]);
    expect(result.scenes).toEqual([]);
    expect(result.errors).toEqual([
      "シーン設定シート 1行目: 見出しが「場面」「困りごと」ではありません。アプリから新しいひな形(Excel)をダウンロードしてお使いください",
    ]);
  });

  it("場面が空の行はエラー", () => {
    const result = buildScenesFromRows(rows(["", "困りごとA"]));
    expect(result.errors).toContain("シーン設定シート 2行目: 場面 が空です");
  });

  it("困りごとが空の行はエラー", () => {
    const result = buildScenesFromRows(rows(["場面A", ""]));
    expect(result.errors).toContain("シーン設定シート 2行目: 困りごと が空です");
  });

  it("困りごとが全場面を通じて重複している場合はエラー", () => {
    const result = buildScenesFromRows(
      rows(["場面A", "困りごとA"], ["場面B", "困りごとA"]),
    );
    expect(result.errors).toContain(
      'シーン設定シート 3行目: 困りごと "困りごとA" が重複しています(困りごとは全体で1つずつにしてください)',
    );
  });

  it("有効行0件はエラー", () => {
    const result = buildScenesFromRows(rows(["", ""], ["", ""]));
    expect(result.errors).toEqual([
      "シーン設定シートに場面と困りごとが1件もありません(2行目以降に記入してください)",
    ]);
  });

  it("場面が13種類になるとエラー", () => {
    const dataRows: string[][] = [];
    for (let i = 1; i <= 13; i++) {
      dataRows.push([`場面${i}`, `困りごと${i}`]);
    }
    const result = buildScenesFromRows(rows(...dataRows));
    expect(result.errors).toContain(
      "シーン設定シート: 場面は12種類までにしてください(現在13種類)",
    );
  });

  it("困りごとが121行になるとエラー", () => {
    const dataRows: string[][] = [];
    for (let i = 1; i <= 121; i++) {
      dataRows.push(["場面1", `困りごと${i}`]);
    }
    const result = buildScenesFromRows(rows(...dataRows));
    expect(result.errors).toContain(
      "シーン設定シート: 困りごとは120行までにしてください(現在121行)",
    );
  });

  it("全空行はスキップされ、行番号が詰まらない", () => {
    const result = buildScenesFromRows(
      rows(["", ""], ["", "困りごとのみ"]),
    );
    expect(result.errors).toContain("シーン設定シート 3行目: 場面 が空です");
  });

  it("エラーは1件目で打ち切らず全件収集する", () => {
    const result = buildScenesFromRows(
      rows(["", "困りごとA"], ["場面B", ""], ["場面C", "困りごとC"], ["場面D", "困りごとC"]),
    );
    expect(result.errors).toEqual([
      "シーン設定シート 2行目: 場面 が空です",
      "シーン設定シート 3行目: 困りごと が空です",
      'シーン設定シート 5行目: 困りごと "困りごとC" が重複しています(困りごとは全体で1つずつにしてください)',
    ]);
    expect(result.scenes).toEqual([]);
  });
});
