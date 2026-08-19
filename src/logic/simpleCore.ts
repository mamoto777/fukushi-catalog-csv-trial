/*
 * かんたん版(Excel10列)の検証+自動補完。設計書 docs/design.md §5-2
 */
import type { Vocab, ValidateResult } from "./csvCore.mjs";
import type { Product } from "../types";

export const SIMPLE_HEADER: readonly string[] = [
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
];

const USER_CHOICES = ["本人が使う", "家族の介護に使う", "どちらも"] as const;

function isAllEmpty(cols: string[]): boolean {
  return cols.every((c) => c.trim() === "");
}

/**
 * 仕様セル(G列)のパース。設計書§5-2「仕様(G列)のパース規則」。
 * エラーはerrArgに追記し、成功した項目のみspecsに反映する。
 */
function parseSpecsCell(
  cell: string,
  err: (msg: string) => void,
): Record<string, string> {
  const specs: Record<string, string> = {};
  const lines = cell
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "");

  for (const rawLine of lines) {
    const halfIdx = rawLine.indexOf(":");
    const fullIdx = rawLine.indexOf("：");
    const candidates = [halfIdx, fullIdx].filter((i) => i !== -1);
    const sep = candidates.length > 0 ? Math.min(...candidates) : -1;

    if (sep === -1 || sep === 0) {
      err(`仕様 "${rawLine}" は「項目名:値」形式ではありません`);
      continue;
    }
    const key = rawLine.slice(0, sep).trim();
    const value = rawLine.slice(sep + 1).trim();
    specs[key] = value;
  }
  return specs;
}

export function validateSimpleRows(
  rows: string[][],
  vocab: Vocab,
): ValidateResult {
  const errors: string[] = [];

  const header = (rows[0] ?? []).map((c) => c.trim());
  if (header.join(",") !== SIMPLE_HEADER.join(",")) {
    errors.push(
      "1行目: ひな形が古い形式か、見出しが変更されています。アプリから新しいひな形(Excel)をダウンロードしてお使いください",
    );
    return { products: [], errors };
  }

  const genreByLabel = new Map(vocab.genres.map((g) => [g.label, g.id]));
  const concernSet = new Set(vocab.scenes.flatMap((s) => s.concerns));
  const sceneByConcern = new Map<string, string>();
  for (const scene of vocab.scenes) {
    for (const concern of scene.concerns) {
      sceneByConcern.set(concern, scene.label);
    }
  }
  const sceneOrder = vocab.scenes.map((s) => s.label);

  const products: Product[] = [];
  let seq = 0;

  rows.slice(1).forEach((rawCols, idx) => {
    const line = idx + 2; // ヘッダが1行目(Excelの行番号のまま)
    const err = (msg: string) => errors.push(`${line}行目: ${msg}`);

    const cols = rawCols.slice(0, 10);
    while (cols.length < 10) cols.push("");

    if (isAllEmpty(cols)) return; // 全列空はスキップ

    const [
      rawName,
      rawMaker,
      rawGenre,
      rawPrice,
      rawTaisCode,
      rawSummary,
      rawSpecs,
      rawConcern1,
      rawConcern2,
      rawUser,
    ] = cols.map((c) => c.trim());

    const errBefore = errors.length;

    if (rawName === "") err("商品名 が空です");

    const genreId = genreByLabel.get(rawGenre);
    if (genreId === undefined) {
      err(`分類 "${rawGenre}" は選択肢にありません(プルダウンから選んでください)`);
    }

    const price = Number(rawPrice);
    if (!Number.isInteger(price) || price <= 0) {
      err(`価格 "${rawPrice}" は正の整数ではありません(数字だけを入力してください)`);
    }

    if (rawSummary === "") err("ひとこと説明 が空です");

    const specs = parseSpecsCell(rawSpecs, err);

    if (rawConcern1 === "") {
      err("困りごと1 が空です(プルダウンから選んでください)");
    } else if (!concernSet.has(rawConcern1)) {
      err(`困りごと "${rawConcern1}" は選択肢にありません(プルダウンから選んでください)`);
    }
    if (rawConcern2 !== "" && !concernSet.has(rawConcern2)) {
      err(`困りごと "${rawConcern2}" は選択肢にありません(プルダウンから選んでください)`);
    }

    if (!USER_CHOICES.includes(rawUser as (typeof USER_CHOICES)[number])) {
      err(`誰が使う "${rawUser}" は選択肢にありません(プルダウンから選んでください)`);
    }

    const rowHasError = errors.length > errBefore;
    if (rowHasError) return;

    seq += 1;
    const id = `p${String(seq).padStart(3, "0")}`;

    const concernTags = Array.from(
      new Set([rawConcern1, rawConcern2].filter((c) => c !== "")),
    );
    const sceneTags = Array.from(
      new Set(
        concernTags
          .map((c) => sceneByConcern.get(c))
          .filter((s): s is string => s !== undefined),
      ),
    ).sort((a, b) => sceneOrder.indexOf(a) - sceneOrder.indexOf(b));

    let userTags: string[];
    if (rawUser === "どちらも") {
      userTags = ["本人が使う", "家族の介護に使う"];
    } else {
      userTags = [rawUser];
    }

    const genre = genreId as Product["genre"];
    const maker = rawMaker === "" ? "―" : rawMaker;

    products.push({
      id,
      name: rawName,
      maker,
      taisCode: rawTaisCode,
      genre,
      genreLabel: rawGenre,
      price,
      insurance: "rental",
      image: `./images/genre-${genre}.svg`,
      summary: rawSummary,
      description: rawSummary,
      specs,
      recommendFor: concernTags.map((c) => `「${c}」でお困りの方`),
      caution:
        "ご使用の前に、担当者または取扱説明書で正しい使い方をご確認ください。",
      concernTags,
      sceneTags,
      userTags,
      popularity: 3,
    });
  });

  if (errors.length > 0) {
    return { products: [], errors };
  }
  if (products.length === 0) {
    return {
      products: [],
      errors: ["商品データが1件もありません(2行目以降に記入してください)"],
    };
  }
  return { products, errors: [] };
}
