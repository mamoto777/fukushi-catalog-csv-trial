/*
 * CSV→products.json変換(実データ移行用。設計書§5-11)
 *
 * 使い方: node scripts/csv2json.mjs  (npm run data:convert)
 *   入力: data/products.csv (UTF-8・ヘッダ行つき。ひな形は data/products-template.csv)
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
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = join(root, "data", "products.csv");
const OUTPUT = join(root, "src", "data", "products.json");
const VOCAB = JSON.parse(
  readFileSync(join(root, "src", "data", "vocab.json"), "utf-8"),
);

const HEADER = [
  "id",
  "name",
  "maker",
  "genre",
  "price",
  "insurance",
  "summary",
  "description",
  "specs",
  "recommendFor",
  "caution",
  "concernTags",
  "sceneTags",
  "userTags",
  "popularity",
];

const GENRE_LABELS = Object.fromEntries(
  VOCAB.genres.map((g) => [g.id, g.label]),
);
const SCENE_SET = new Set(VOCAB.scenes.map((s) => s.label));
const CONCERN_SET = new Set(VOCAB.scenes.flatMap((s) => s.concerns));
const USER_SET = new Set(VOCAB.users);
const INSURANCE_SET = new Set(["rental", "purchase", "none"]);

/** RFC4180準拠の簡易CSVパーサ(引用符・セル内カンマ・セル内改行対応) */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  // BOM除去
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // 完全な空行は除外
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

function splitMulti(s) {
  return s
    .split("|")
    .map((x) => x.trim())
    .filter((x) => x !== "");
}

function main() {
  let text;
  try {
    text = readFileSync(INPUT, "utf-8");
  } catch {
    console.error(`入力ファイルが見つかりません: ${INPUT}`);
    console.error(
      "data/products-template.csv をコピーして data/products.csv を作成してください。",
    );
    process.exit(1);
  }

  const rows = parseCsv(text);
  const errors = [];

  const header = rows[0] ?? [];
  if (header.join(",") !== HEADER.join(",")) {
    console.error("ヘッダ行が想定と一致しません。");
    console.error(`想定: ${HEADER.join(",")}`);
    console.error(`実際: ${header.join(",")}`);
    process.exit(1);
  }

  const products = [];
  const seenIds = new Set();

  rows.slice(1).forEach((cols, idx) => {
    const line = idx + 2; // ヘッダが1行目
    const err = (msg) => errors.push(`${line}行目: ${msg}`);

    if (cols.length !== HEADER.length) {
      err(`列数が${cols.length}です(${HEADER.length}列必要)`);
      return;
    }
    const rec = Object.fromEntries(HEADER.map((h, i) => [h, cols[i].trim()]));

    // 必須列
    for (const key of ["id", "name", "maker", "summary", "description", "caution"]) {
      if (rec[key] === "") err(`${key} が空です`);
    }
    // id
    if (!/^p\d{3}$/.test(rec.id)) err(`id "${rec.id}" は p001 形式ではありません`);
    if (seenIds.has(rec.id)) err(`id "${rec.id}" が重複しています`);
    seenIds.add(rec.id);
    // genre
    if (!(rec.genre in GENRE_LABELS)) err(`genre "${rec.genre}" は不正です`);
    // price
    const price = Number(rec.price);
    if (!Number.isInteger(price) || price <= 0) {
      err(`price "${rec.price}" は正の整数ではありません`);
    }
    // insurance
    if (!INSURANCE_SET.has(rec.insurance)) {
      err(`insurance "${rec.insurance}" は rental/purchase/none のいずれかにしてください`);
    }
    // popularity
    const popularity = Number(rec.popularity);
    if (!Number.isInteger(popularity) || popularity < 1 || popularity > 5) {
      err(`popularity "${rec.popularity}" は1〜5の整数にしてください`);
    }
    // specs
    const specs = {};
    for (const pair of splitMulti(rec.specs)) {
      const sep = pair.indexOf(":");
      if (sep <= 0) {
        err(`specs "${pair}" は「項目名:値」形式ではありません`);
        continue;
      }
      specs[pair.slice(0, sep).trim()] = pair.slice(sep + 1).trim();
    }
    // タグ語彙チェック(語彙外タグはマッチングに乗らないため禁止)
    const concernTags = splitMulti(rec.concernTags);
    for (const t of concernTags) {
      if (!CONCERN_SET.has(t)) err(`concernTag "${t}" は語彙(vocab.json)にありません`);
    }
    const sceneTags = splitMulti(rec.sceneTags);
    for (const t of sceneTags) {
      if (!SCENE_SET.has(t)) err(`sceneTag "${t}" は語彙(vocab.json)にありません`);
    }
    const userTags = splitMulti(rec.userTags);
    for (const t of userTags) {
      if (!USER_SET.has(t)) err(`userTag "${t}" は語彙(vocab.json)にありません`);
    }
    if (concernTags.length === 0) err("concernTags が空です(最低1つ)");
    if (sceneTags.length === 0) err("sceneTags が空です(最低1つ)");
    if (userTags.length === 0) err("userTags が空です(最低1つ)");
    const recommendFor = splitMulti(rec.recommendFor);
    if (recommendFor.length === 0) err("recommendFor が空です(最低1つ)");

    products.push({
      id: rec.id,
      name: rec.name,
      maker: rec.maker,
      genre: rec.genre,
      genreLabel: GENRE_LABELS[rec.genre] ?? "",
      price,
      insurance: rec.insurance,
      image: `./images/genre-${rec.genre}.svg`,
      summary: rec.summary,
      description: rec.description,
      specs,
      recommendFor,
      caution: rec.caution,
      concernTags,
      sceneTags,
      userTags,
      popularity,
    });
  });

  if (errors.length > 0) {
    console.error(`検証エラー ${errors.length}件:`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  writeFileSync(OUTPUT, JSON.stringify(products, null, 2) + "\n", "utf-8");
  console.log(`OK: ${products.length}件を ${OUTPUT} に出力しました`);
}

main();
