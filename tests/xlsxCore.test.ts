// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
import { parseXlsxToRows } from "../src/logic/xlsxCore";

const FIXTURE_PATH = path.resolve(__dirname, "fixtures/simple-ok.xlsx");

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;
}

/** テスト用の最小xlsx(zip)を合成する */
function makeXlsx(sheetXml: string): ArrayBuffer {
  const workbookXml = `<?xml version="1.0"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="商品リスト" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const relsXml = `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  const zipped = zipSync({
    "xl/workbook.xml": strToU8(workbookXml),
    "xl/_rels/workbook.xml.rels": strToU8(relsXml),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml),
  });
  return zipped.buffer.slice(
    zipped.byteOffset,
    zipped.byteOffset + zipped.byteLength,
  ) as ArrayBuffer;
}

describe("parseXlsxToRows", () => {
  it("正常なひな形xlsxを見出し+3行に変換する", () => {
    const buf = readFileSync(FIXTURE_PATH);
    const result = parseXlsxToRows(toArrayBuffer(buf));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(4);
    expect(result.rows[0]).toEqual([
      "商品名",
      "分類",
      "価格(円)",
      "ひとこと説明",
      "困りごと1",
      "困りごと2",
      "誰が使う",
    ]);
    expect(result.rows[1]).toEqual([
      "らくあゆみステッキ軽量型",
      "歩行補助",
      "1200",
      "軽くてにぎりやすい定番の一本杖",
      "ふらつく・転びやすい",
      "屋外の外出が不安",
      "本人が使う",
    ]);
    expect(result.rows[2][0]).toBe("ささえ四点杖ワイド");
    expect(result.rows[3][0]).toBe("みまもりセンサーライト");
    expect(result.rows[3][6]).toBe("どちらも");
  });

  it("書式だけの空行が遠くにあっても行数超過にならない", () => {
    const sheetXml = `<?xml version="1.0"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="A1" t="inlineStr"><is><t>商品名</t></is></c></row>
<row r="2"><c r="A2" t="inlineStr"><is><t>テスト商品</t></is></c></row>
<row r="5000"><c r="A5000" s="1"/></row>
</sheetData></worksheet>`;
    const result = parseXlsxToRows(makeXlsx(sheetXml));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1][0]).toBe("テスト商品");
  });

  it("値の入った行が1001行目を超えると行数超過エラー", () => {
    const sheetXml = `<?xml version="1.0"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="A1" t="inlineStr"><is><t>商品名</t></is></c></row>
<row r="1002"><c r="A1002" t="inlineStr"><is><t>はみ出し商品</t></is></c></row>
</sheetData></worksheet>`;
    const result = parseXlsxToRows(makeXlsx(sheetXml));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("商品データは1,000行までにしてください");
  });

  it("zipとして壊れたバイト列はエラーを返す", () => {
    const bad = new TextEncoder().encode("not a zip");
    const result = parseXlsxToRows(bad.buffer as ArrayBuffer);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(
      "Excelファイルを読み取れませんでした。かんたん版ひな形(.xlsx)をそのまま使って保存してください",
    );
  });
});
