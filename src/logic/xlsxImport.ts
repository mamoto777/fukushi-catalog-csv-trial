/*
 * .xlsxファイルの取り込み口(v2)。設計書 docs/design.md §5-5
 */
import { parseXlsxToRows } from "./xlsxCore";
import { validateSimpleRows } from "./simpleCore";
import { buildScenesFromRows } from "./sceneCore";
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

  if (parsed.sceneRows === null) {
    return {
      ok: false,
      errors: [
        "シーン設定シートが見つかりません。ひな形が古い形式の可能性があります。アプリから新しいひな形(Excel)をダウンロードしてお使いください",
      ],
    };
  }

  const { scenes, errors: sceneErrors } = buildScenesFromRows(parsed.sceneRows);
  if (sceneErrors.length > 0) {
    return { ok: false, errors: sceneErrors };
  }

  const vocab: Vocab = {
    users: (vocabJson as Vocab).users,
    genres: (vocabJson as Vocab).genres,
    scenes,
  };

  const { products, errors } = validateSimpleRows(parsed.productRows, vocab);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, products, count: products.length, encoding: "xlsx", vocab };
}
