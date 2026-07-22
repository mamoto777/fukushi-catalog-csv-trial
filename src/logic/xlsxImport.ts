/*
 * .xlsxファイルの取り込み口。設計書 docs/design-かんたん版.md §6-3
 */
import { parseXlsxToRows } from "./xlsxCore";
import { validateSimpleRows } from "./simpleCore";
import vocabJson from "../data/vocab.json";
import type { ImportResult } from "./csvImport";
import type { Vocab } from "./csvCore.mjs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB(フル版csvImport.tsと同じ上限)

export async function importXlsxFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, errors: ["ファイルが大きすぎます(上限10MB)"] };
  }

  const buf = await file.arrayBuffer();
  const parsed = parseXlsxToRows(buf);
  if (!parsed.ok) {
    return { ok: false, errors: [parsed.error] };
  }

  const { products, errors } = validateSimpleRows(
    parsed.rows,
    vocabJson as Vocab,
  );
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, products, count: products.length, encoding: "xlsx" };
}
