import { parseCsv, validateProducts } from "./csvCore.mjs";
import vocabJson from "../data/vocab.json";
import type { Product } from "../types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB(グローバル方針のデフォルト上限)
const MAX_DATA_ROWS = 1000; // マッチング・描画の性能保証範囲

export type ImportResult =
  | {
      ok: true;
      products: Product[];
      count: number;
      encoding: "utf-8" | "shift_jis" | "xlsx";
    }
  | { ok: false; errors: string[] };

function hasReplacementChar(text: string): boolean {
  return text.includes("�");
}

export async function importCsvFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, errors: ["ファイルが大きすぎます(上限10MB)"] };
  }

  const buf = await file.arrayBuffer();

  let text: string | null = null;
  let encoding: "utf-8" | "shift_jis" | null = null;

  const utf8Text = new TextDecoder("utf-8").decode(buf);
  if (!hasReplacementChar(utf8Text)) {
    text = utf8Text;
    encoding = "utf-8";
  } else {
    try {
      const sjisText = new TextDecoder("shift_jis").decode(buf);
      if (!hasReplacementChar(sjisText)) {
        text = sjisText;
        encoding = "shift_jis";
      }
    } catch {
      // TextDecoder("shift_jis") 非対応環境。文字コード判定不能として扱う
    }
  }

  if (text === null || encoding === null) {
    return {
      ok: false,
      errors: ["文字コードを判定できません。Excelで「CSV UTF-8」形式で保存し直してください"],
    };
  }

  const rows = parseCsv(text);
  const dataRowCount = Math.max(rows.length - 1, 0);
  if (dataRowCount > MAX_DATA_ROWS) {
    return { ok: false, errors: ["商品データは1,000行までにしてください"] };
  }

  const { products, errors } = validateProducts(rows, vocabJson);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, products, count: products.length, encoding };
}
