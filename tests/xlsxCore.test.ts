// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
import { parseXlsxToRows } from "../src/logic/xlsxCore";
import vocabJson from "../src/data/vocab.json";

const OK_FIXTURE_PATH = path.resolve(__dirname, "fixtures/simple-ok.xlsx");
const NOSCENE_FIXTURE_PATH = path.resolve(
  __dirname,
  "fixtures/simple-noscene.xlsx",
);

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;
}

/** テスト用の最小xlsx(zip)を合成する(商品リストシートのみ、シーン設定シートなし) */
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
  it("simple-ok.xlsx: productRows(10列見出し+3行)とsceneRows(2列見出し+31行)を返す", () => {
    const buf = readFileSync(OK_FIXTURE_PATH);
    const result = parseXlsxToRows(toArrayBuffer(buf));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.productRows).toHaveLength(4);
    expect(result.productRows[0]).toEqual([
      "商品名",
      "メーカー",
      "分類",
      "価格(円)",
      "TAISコード",
      "ひとこと説明",
      "仕様",
      "困りごと1",
      "困りごと2",
      "誰が使う",
    ]);
    expect(result.productRows[1][0]).toBe("らくあゆみステッキ軽量型");
    expect(result.productRows[2][0]).toBe("ささえ四点杖ワイド");
    expect(result.productRows[3][0]).toBe("みまもりセンサーライト");

    expect(result.sceneRows).not.toBeNull();
    const sceneRows = result.sceneRows!;
    const totalConcerns = vocabJson.scenes.reduce(
      (sum, s) => sum + s.concerns.length,
      0,
    );
    expect(sceneRows).toHaveLength(totalConcerns + 1); // 見出し+31行
    expect(sceneRows[0]).toEqual(["場面", "困りごと"]);
    expect(sceneRows[1]).toEqual([
      vocabJson.scenes[0].label,
      vocabJson.scenes[0].concerns[0],
    ]);
  });

  it("simple-noscene.xlsx: sceneRowsはnull", () => {
    const buf = readFileSync(NOSCENE_FIXTURE_PATH);
    const result = parseXlsxToRows(toArrayBuffer(buf));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.productRows).toHaveLength(4);
    expect(result.sceneRows).toBeNull();
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
    expect(result.productRows).toHaveLength(2);
    expect(result.productRows[1][0]).toBe("テスト商品");
    expect(result.sceneRows).toBeNull();
  });

  it("値の入った行が1001行目を超えると行数超過エラー(商品リスト)", () => {
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

  it("値の入った行が1001行目を超えると行数超過エラー(シーン設定)", () => {
    const workbookXml = `<?xml version="1.0"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="商品リスト" sheetId="1" r:id="rId1"/><sheet name="シーン設定" sheetId="2" r:id="rId2"/></sheets></workbook>`;
    const relsXml = `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`;
    const productSheetXml = `<?xml version="1.0"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="A1" t="inlineStr"><is><t>商品名</t></is></c></row>
</sheetData></worksheet>`;
    const sceneSheetXml = `<?xml version="1.0"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="A1" t="inlineStr"><is><t>場面</t></is></c><c r="B1" t="inlineStr"><is><t>困りごと</t></is></c></row>
<row r="1002"><c r="A1002" t="inlineStr"><is><t>はみ出し場面</t></is></c></row>
</sheetData></worksheet>`;
    const zipped = zipSync({
      "xl/workbook.xml": strToU8(workbookXml),
      "xl/_rels/workbook.xml.rels": strToU8(relsXml),
      "xl/worksheets/sheet1.xml": strToU8(productSheetXml),
      "xl/worksheets/sheet2.xml": strToU8(sceneSheetXml),
    });
    const buf = zipped.buffer.slice(
      zipped.byteOffset,
      zipped.byteOffset + zipped.byteLength,
    ) as ArrayBuffer;
    const result = parseXlsxToRows(buf);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("シーン設定シートは1,000行までにしてください");
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
