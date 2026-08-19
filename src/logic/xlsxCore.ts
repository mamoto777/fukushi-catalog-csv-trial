/*
 * .xlsx(zip+XML)を string[][] に変換する共通コア。設計書 docs/design.md §5-4
 * fflateでzip展開し、XML解釈はブラウザ標準の DOMParser で行う(追加依存最小化)。
 */
import { unzipSync } from "fflate";

const NS_RELS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const MAX_ENTRY_SIZE = 30 * 1024 * 1024; // 30MB(zip爆弾対策)
const MAX_DATA_ROWS = 1000;
const SCENE_SHEET_NAME = "シーン設定";

export type XlsxParseResult =
  | {
      ok: true;
      productRows: string[][]; // 商品リストシート。各行10列にパディング
      sceneRows: string[][] | null; // シーン設定シート。各行2列にパディング。シート不在時=null
    }
  | { ok: false; error: string };

const FORMAT_ERROR =
  "Excelファイルを読み取れませんでした。かんたん版ひな形(.xlsx)をそのまま使って保存してください";
const PRODUCT_ROW_LIMIT_ERROR = "商品データは1,000行までにしてください";
const SCENE_ROW_LIMIT_ERROR = "シーン設定シートは1,000行までにしてください";

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

function resolveRelsTarget(rId: string, relsXml: string | undefined): string | null {
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

interface SheetTargets {
  productTarget: string | null;
  /** シーン設定シートが見つからなかった場合はnull(エラーではない)。見つかったがTarget解決不可はundefined(FORMAT_ERROR) */
  sceneTarget: string | null | undefined;
}

/**
 * workbook.xmlのsheet要素を文書順に走査し、商品リストシートとシーン設定シートを特定する。
 * - 商品リストシート = state属性が無いか"visible"、かつname属性が"シーン設定"でない最初のシート
 * - シーン設定シート = name属性が"シーン設定"と完全一致する最初のシート(表示状態は不問)
 */
function findSheetTargets(
  workbookXml: string,
  relsXml: string | undefined,
): SheetTargets | null {
  const wbDoc = new DOMParser().parseFromString(workbookXml, "text/xml");
  if (wbDoc.getElementsByTagName("parsererror").length > 0) return null;

  const sheets = Array.from(wbDoc.getElementsByTagNameNS("*", "sheet"));

  const getTarget = (sheetEl: Element): string | null => {
    let rId = sheetEl.getAttribute("r:id");
    if (!rId) rId = sheetEl.getAttributeNS(NS_RELS, "id");
    if (!rId) return null;
    return resolveRelsTarget(rId, relsXml);
  };

  const productSheet = sheets.find((s) => {
    const state = s.getAttribute("state");
    const isVisible = !state || state === "visible";
    const name = s.getAttribute("name");
    return isVisible && name !== SCENE_SHEET_NAME;
  });
  const productTarget = productSheet ? getTarget(productSheet) : null;
  if (!productSheet || !productTarget) {
    return { productTarget: null, sceneTarget: null };
  }

  const sceneSheet = sheets.find((s) => s.getAttribute("name") === SCENE_SHEET_NAME);
  let sceneTarget: string | null | undefined = null;
  if (sceneSheet) {
    const target = getTarget(sceneSheet);
    sceneTarget = target ?? undefined; // 見つかったがTarget解決不可はundefined
  }

  return { productTarget, sceneTarget };
}

type SheetParseResult =
  | { ok: true; rows: string[][] }
  | { ok: false; reason: "parse" | "rowLimit" };

function parseSheetToRows(
  sheetXml: string,
  sharedStrings: string[],
  colCount: number,
  maxDataRows: number,
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

  if (maxDataRowNumber > maxDataRows + 1) {
    return { ok: false, reason: "rowLimit" };
  }

  const rows: string[][] = [];
  for (let i = 1; i <= maxDataRowNumber; i++) {
    const raw = rowsByNumber.get(i) ?? [];
    const padded = raw.slice(0, colCount);
    while (padded.length < colCount) padded.push("");
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

  const targets = findSheetTargets(workbookXml, relsXml);
  if (!targets || !targets.productTarget || !files[targets.productTarget]) {
    return { ok: false, error: FORMAT_ERROR };
  }
  // シーン設定シートが見つかったがTarget解決不可、またはファイル欠落
  if (targets.sceneTarget === undefined) {
    return { ok: false, error: FORMAT_ERROR };
  }
  if (targets.sceneTarget !== null && !files[targets.sceneTarget]) {
    return { ok: false, error: FORMAT_ERROR };
  }

  const sharedStrings = parseSharedStrings(sharedStringsXml);

  const productSheetXml = decoder.decode(files[targets.productTarget]);
  const productResult = parseSheetToRows(productSheetXml, sharedStrings, 10, MAX_DATA_ROWS);
  if (!productResult.ok) {
    return {
      ok: false,
      error: productResult.reason === "rowLimit" ? PRODUCT_ROW_LIMIT_ERROR : FORMAT_ERROR,
    };
  }

  let sceneRows: string[][] | null = null;
  if (targets.sceneTarget !== null) {
    const sceneSheetXml = decoder.decode(files[targets.sceneTarget]);
    const sceneResult = parseSheetToRows(sceneSheetXml, sharedStrings, 2, MAX_DATA_ROWS);
    if (!sceneResult.ok) {
      return {
        ok: false,
        error: sceneResult.reason === "rowLimit" ? SCENE_ROW_LIMIT_ERROR : FORMAT_ERROR,
      };
    }
    sceneRows = sceneResult.rows;
  }

  return { ok: true, productRows: productResult.rows, sceneRows };
}
