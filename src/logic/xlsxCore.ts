/*
 * .xlsx(zip+XML)を string[][] に変換する共通コア。設計書 docs/design-かんたん版.md §6-1
 * fflateでzip展開し、XML解釈はブラウザ標準の DOMParser で行う(追加依存最小化)。
 */
import { unzipSync } from "fflate";

const NS_RELS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const MAX_ENTRY_SIZE = 30 * 1024 * 1024; // 30MB(zip爆弾対策)
const MAX_DATA_ROWS = 1000;

export type XlsxParseResult =
  | { ok: true; rows: string[][] }
  | { ok: false; error: string };

const FORMAT_ERROR =
  "Excelファイルを読み取れませんでした。かんたん版ひな形(.xlsx)をそのまま使って保存してください";
const ROW_LIMIT_ERROR = "商品データは1,000行までにしてください";

function colLettersToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1; // 0始まり
}

function parseCellRef(ref: string): { col: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return { col: 0 };
  return { col: colLettersToIndex(m[1]) };
}

function textFromElement(el: Element): string {
  // rPh(ふりがな)配下のtは除外する
  let text = "";
  const walk = (node: Node) => {
    if (node.nodeType === 1) {
      const elNode = node as Element;
      if (elNode.localName === "rPh") return;
      if (elNode.localName === "t") {
        text += elNode.textContent ?? "";
        return;
      }
    }
    node.childNodes.forEach((child) => walk(child));
  };
  walk(el);
  return text;
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return [];
  const siList = Array.from(doc.getElementsByTagNameNS("*", "si"));
  return siList.map((si) => textFromElement(si));
}

function findVisibleSheetTarget(
  workbookXml: string,
  relsXml: string | undefined,
): string | null {
  const wbDoc = new DOMParser().parseFromString(workbookXml, "text/xml");
  if (wbDoc.getElementsByTagName("parsererror").length > 0) return null;

  const sheets = Array.from(wbDoc.getElementsByTagNameNS("*", "sheet"));
  const visible = sheets.find((s) => {
    const state = s.getAttribute("state");
    return !state || state === "visible";
  });
  if (!visible) return null;

  let rId = visible.getAttribute("r:id");
  if (!rId) rId = visible.getAttributeNS(NS_RELS, "id");
  if (!rId) return null;

  if (!relsXml) return null;
  const relsDoc = new DOMParser().parseFromString(relsXml, "text/xml");
  if (relsDoc.getElementsByTagName("parsererror").length > 0) return null;
  const rels = Array.from(relsDoc.getElementsByTagNameNS("*", "Relationship"));
  const rel = rels.find((r) => r.getAttribute("Id") === rId);
  if (!rel) return null;
  const target = rel.getAttribute("Target");
  if (!target) return null;

  if (target.startsWith("/xl/")) return target.slice(1);
  if (target.startsWith("xl/")) return target;
  return `xl/${target}`;
}

type SheetParseResult =
  | { ok: true; rows: string[][] }
  | { ok: false; reason: "parse" | "rowLimit" };

function parseSheetToRows(
  sheetXml: string,
  sharedStrings: string[],
): SheetParseResult {
  const doc = new DOMParser().parseFromString(sheetXml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    return { ok: false, reason: "parse" };
  }

  const rowElements = Array.from(doc.getElementsByTagNameNS("*", "row"));
  const rowsByNumber = new Map<number, string[]>();
  // 値の入った行のみ数える(書式だけ触った空行を行数上限の対象にしない)
  let maxDataRowNumber = 0;

  for (const rowEl of rowElements) {
    const rAttr = rowEl.getAttribute("r");
    const rowNumber = rAttr ? parseInt(rAttr, 10) : rowsByNumber.size + 1;
    if (!Number.isFinite(rowNumber) || rowNumber <= 0) continue;

    const cells = Array.from(rowEl.getElementsByTagNameNS("*", "c"));
    const rowValues: string[] = [];
    let cursor = 0;

    for (const cellEl of cells) {
      const ref = cellEl.getAttribute("r");
      const colIndex = ref ? parseCellRef(ref).col : cursor;
      while (rowValues.length < colIndex) rowValues.push("");

      const type = cellEl.getAttribute("t");
      let value = "";
      if (type === "s") {
        const vEl = cellEl.getElementsByTagNameNS("*", "v")[0];
        const idx = vEl ? parseInt(vEl.textContent ?? "", 10) : NaN;
        value = Number.isFinite(idx) ? (sharedStrings[idx] ?? "") : "";
      } else if (type === "inlineStr") {
        const isEl = cellEl.getElementsByTagNameNS("*", "is")[0];
        value = isEl ? textFromElement(isEl) : "";
      } else {
        const vEl = cellEl.getElementsByTagNameNS("*", "v")[0];
        value = vEl ? (vEl.textContent ?? "") : "";
      }
      rowValues.push(value);
      cursor = colIndex + 1;
    }

    rowsByNumber.set(rowNumber, rowValues);
    const hasValue = rowValues.some((v) => v.trim() !== "");
    if (hasValue && rowNumber > maxDataRowNumber) maxDataRowNumber = rowNumber;
  }

  if (maxDataRowNumber > MAX_DATA_ROWS + 1) {
    return { ok: false, reason: "rowLimit" };
  }

  const rows: string[][] = [];
  for (let i = 1; i <= maxDataRowNumber; i++) {
    const raw = rowsByNumber.get(i) ?? [];
    const padded = raw.slice(0, 7);
    while (padded.length < 7) padded.push("");
    rows.push(padded);
  }

  return { ok: true, rows };
}

export function parseXlsxToRows(buf: ArrayBuffer): XlsxParseResult {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buf), {
      filter: (f) =>
        f.originalSize <= MAX_ENTRY_SIZE &&
        (f.name === "xl/workbook.xml" ||
          f.name === "xl/_rels/workbook.xml.rels" ||
          f.name === "xl/sharedStrings.xml" ||
          /^xl\/worksheets\/sheet\d+\.xml$/.test(f.name)),
    });
  } catch {
    return { ok: false, error: FORMAT_ERROR };
  }

  const decoder = new TextDecoder("utf-8");
  const workbookXml = files["xl/workbook.xml"]
    ? decoder.decode(files["xl/workbook.xml"])
    : null;
  if (!workbookXml) return { ok: false, error: FORMAT_ERROR };

  const relsXml = files["xl/_rels/workbook.xml.rels"]
    ? decoder.decode(files["xl/_rels/workbook.xml.rels"])
    : undefined;
  const sharedStringsXml = files["xl/sharedStrings.xml"]
    ? decoder.decode(files["xl/sharedStrings.xml"])
    : undefined;

  const sheetTarget = findVisibleSheetTarget(workbookXml, relsXml);
  if (!sheetTarget || !files[sheetTarget]) {
    return { ok: false, error: FORMAT_ERROR };
  }

  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const sheetXml = decoder.decode(files[sheetTarget]);
  const result = parseSheetToRows(sheetXml, sharedStrings);

  if (!result.ok) {
    return {
      ok: false,
      error: result.reason === "rowLimit" ? ROW_LIMIT_ERROR : FORMAT_ERROR,
    };
  }

  return { ok: true, rows: result.rows };
}
