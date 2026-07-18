/*
 * CSVパース+検証の共通コア(Node/ブラウザ両用)。純粋JS・node:fs等への依存なし。
 * 設計書 docs/design.md §5-1
 */

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

const INSURANCE_SET = new Set(["rental", "purchase", "none"]);

/** RFC4180準拠の簡易CSVパーサ(引用符・セル内カンマ・セル内改行対応) */
export function parseCsv(text) {
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

/**
 * パース済み行(rows[0]がヘッダ)を検証し、Product配列またはエラー一覧を返す。
 * エラーが1件以上あれば products は空配列(部分的な取り込みをしない)。
 */
export function validateProducts(rows, vocab) {
  const GENRE_LABELS = Object.fromEntries(
    vocab.genres.map((g) => [g.id, g.label]),
  );
  const SCENE_SET = new Set(vocab.scenes.map((s) => s.label));
  const CONCERN_SET = new Set(vocab.scenes.flatMap((s) => s.concerns));
  const USER_SET = new Set(vocab.users);

  const errors = [];
  const header = rows[0] ?? [];
  if (header.join(",") !== HEADER.join(",")) {
    errors.push(
      `ヘッダ行が想定と一致しません。想定: ${HEADER.join(",")} / 実際: ${header.join(",")}`,
    );
    return { products: [], errors };
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
    return { products: [], errors };
  }
  return { products, errors: [] };
}
