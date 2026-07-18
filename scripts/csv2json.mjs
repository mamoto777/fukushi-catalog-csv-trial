/*
 * CSV→products.json変換(実データ移行用。設計書§5-11)
 *
 * 使い方: node scripts/csv2json.mjs  (npm run data:convert)
 *   入力: data/products.csv (UTF-8・ヘッダ行つき。ひな形は public/products-template.csv)
 *   出力: src/data/products.json
 *
 * CSVの列(15列):
 *   id,name,maker,genre,price,insurance,summary,description,
 *   specs,recommendFor,caution,concernTags,sceneTags,userTags,popularity
 *   - genreLabel と image は genre から自動で付与する
 *   - 複数値(recommendFor/concernTags/sceneTags/userTags)は「|」区切り
 *   - specs は「項目名:値|項目名:値」形式
 *   - カンマや改行を含むセルは "..." で囲む(Excel保存のCSVと同じ規則)
 *
 * スキーマ検証でエラーがあれば行番号つきで全件列挙し、非ゼロ終了する(黙って通さない)。
 * パース・検証の実処理は共通コア src/logic/csvCore.mjs に移動済み(ブラウザ側と共用)。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCsv, validateProducts } from "../src/logic/csvCore.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = join(root, "data", "products.csv");
const OUTPUT = join(root, "src", "data", "products.json");
const VOCAB = JSON.parse(
  readFileSync(join(root, "src", "data", "vocab.json"), "utf-8"),
);

function main() {
  let text;
  try {
    text = readFileSync(INPUT, "utf-8");
  } catch {
    console.error(`入力ファイルが見つかりません: ${INPUT}`);
    console.error(
      "public/products-template.csv をコピーして data/products.csv を作成してください。",
    );
    process.exit(1);
  }

  const rows = parseCsv(text);
  const { products, errors } = validateProducts(rows, VOCAB);

  if (errors.length > 0) {
    console.error(`検証エラー ${errors.length}件:`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  writeFileSync(OUTPUT, JSON.stringify(products, null, 2) + "\n", "utf-8");
  console.log(`OK: ${products.length}件を ${OUTPUT} に出力しました`);
}

main();
