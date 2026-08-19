# かんたん版(Excel取り込み)設計書

> **注記(2026-08-19)**: 本書はv1(7列)時代の設計。v2以降は `docs/design.md` を正とする。

**作成日**: 2026-07-22
**ステータス**: 確定(実装未着手)
**親設計書**: `docs/design.md`(案件版・CSV取り込み。本書はその追加機能)
**前提**: 案件版は全タスク完了・公開済み(https://mamoto777.github.io/fukushi-catalog-csv-trial/)。本書は「かんたん版」で**追加・変更する部分のみ**を定義する。既存のCSV取り込み(フル版)・画面構成・マッチング・PWAは変更しない。

---

## 0. 設計方針: 下位モデル(Sonnet/Haiku級)での実装効率を最優先

親設計書§0と同じ原則で書く。

1. **判断余地を残さない**: 列構成・自動補完値・エラーメッセージ文言・関数シグネチャを本書に明記する。実装者は転記と結線のみ行う
2. **既存資産の流用**: 型 `ValidateResult` / `ImportResult`・エラー表示UI・Context・上限値(10MB/1,000行)はフル版のものをそのまま使う
3. **1タスク=1コミット**: 各タスク完了時に `npm run build`・`npm test`・`npm audit`(0件) が通る状態を維持する
4. **タスクごとに検証コマンドと推奨モデルを明記**(§9)

---

## 1. 概要

### 目的

フル版(英語15列CSV)は非エンジニアには難所が多い。特に**タグを語彙リストと一字一句合わせる手入力**が最大のエラー原因になる。かんたん版は、**プルダウン選択式のExcelひな形(7列)**を配布し、記入済みの .xlsx ファイルをそのままアプリで読み込めるようにする。

- タグはプルダウンで選ぶだけ → 表記ゆれが物理的に発生しない
- Excel→CSV保存の変換手順(形式選択ダイアログ)も不要 → .xlsx のままアップロード
- 足りない項目はアプリが読み込み時に自動補完 → 提案マッチングは完全に動作する

### スコープ

| 項目 | 判断 |
|---|---|
| Excelひな形(.xlsx、プルダウン付き)の生成・配布 | **本設計の中核** |
| .xlsx のブラウザ内読み込み・検証・自動補完 | **本設計の中核** |
| フル版CSV取り込み | 現状のまま維持(かんたん版と共存。ファイル拡張子で自動分岐) |
| 読み込みデータの保存 | フル版と同じく**しない**(メモリのみ・リロードで消える) |
| 記入手順書(かんたん版) | 依頼元向けキットに1点追加 |
| guide.html の全面改訂(スクショ再撮影) | **スコープ外**(かんたん版の案内1節をテキスト追記するのみ) |
| 旧Excel形式(.xls)対応・複数シート編集対応 | スコープ外(エラーメッセージで案内) |

---

## 2. 技術選定

### 2-1. Excel(.xlsx)読み込みの方式(比較の上で確定)

| 案 | 内容 | 判断 |
|---|---|---|
| npm `xlsx`(SheetJS) | 定番だがnpmレジストリ版(0.18.5)は既知の脆弱性勧告あり。`npm audit` 0維持ルールに**抵触** | 不採用 |
| `exceljs` | 依存ツリーが大きくブラウザバンドルも重い。本用途(固定ひな形の値読み取りのみ)には過剰 | 不採用 |
| **`fflate`(zip展開のみ)+自前の最小パーサ** | .xlsx は実体がzip+XML。zip展開だけ実績あるゼロ依存ライブラリ(fflate、MIT)に任せ、XML解釈はブラウザ標準の `DOMParser` で行う。読み込むひな形の構造は自分たちが配布・管理しており、必要なのは「セルの値の読み取り」だけ | **採用** |

採用理由の要点: 追加依存が最小(fflateはゼロ依存・数KB)で `npm audit` 0を維持でき、フル版で自前CSVパーサを書いた本プロジェクトの方針(最小・自己完結)とも一貫する。

### 2-2. 追加パッケージ(親設計書「追加パッケージなし」からの変更点)

| パッケージ | 用途 | 区分 |
|---|---|---|
| `fflate` | .xlsx(zip)の展開 | dependencies(実行時) |
| `jsdom` | テスト実行時の `DOMParser` 提供(Vitestの既定環境nodeにはDOMがないため) | devDependencies(開発時のみ) |
| `@types/node`(実装時追加) | xlsxCore.test.ts が `node:fs`・`node:path`・`Buffer` を使うために必要(型エラー実測、audit 0件で確認済み) | devDependencies(開発時のみ) |

導入タスク(§9 タスク0)完了時に `npm audit` が0件であることを確認する。**0件にならない場合は実装を止めて人間に報告する**(勝手に代替パッケージへ差し替えない)。

### 2-3. ひな形.xlsxの生成方法

Python + `openpyxl` のスクリプト(`scripts/make_simple_template.py`)で機械生成する。手作業でExcelを作らない理由: プルダウンの選択肢は `src/data/vocab.json` が唯一の正であり、語彙が変わったときにスクリプト再実行で追随できるようにするため。

---

## 3. ディレクトリ構成(追加・変更分のみ)

```
fukushi-csv-import-案件版/
├─ docs/
│  ├─ design-かんたん版.md               # 本設計書
│  └─ 依頼元向けキット/
│     └─ かんたん版記入手順書.md          # 新規
├─ public/
│  ├─ products-template-simple.xlsx     # 新規: 生成物(スクリプトが出力)
│  └─ sw.js                             # 改修: プリキャッシュ追加+キャッシュ名v3
├─ scripts/
│  └─ make_simple_template.py           # 新規: ひな形+テストfixture生成
├─ src/
│  ├─ logic/
│  │  ├─ xlsxCore.ts                    # 新規: zip展開+XML解釈 → string[][] 化
│  │  ├─ simpleCore.ts                  # 新規: 7列の検証+自動補完 → Product[]
│  │  ├─ xlsxImport.ts                  # 新規: File → 上限検査 → xlsxCore → simpleCore
│  │  └─ csvImport.ts                   # 改修: ImportResult の encoding に "xlsx" を追加
│  └─ pages/
│     └─ ImportPage.tsx                 # 改修: かんたん版を主導線に・拡張子で分岐
├─ tests/
│  ├─ simpleCore.test.ts                # 新規
│  ├─ xlsxCore.test.ts                  # 新規
│  └─ fixtures/
│     └─ simple-ok.xlsx                 # 新規: 生成物(スクリプトが出力)
└─ README.md                            # 改修: かんたん版の節を追記
```

上記以外(csvCore.mjs / ProductsContext / matching / vocab.json / products.json ほか)は**変更しない**。

---

## 4. かんたん版ひな形の仕様(確定)

### 4-1. シート構成

| シート名 | 状態 | 内容 |
|---|---|---|
| `商品リスト` | 表示(先頭) | 記入用。1行目=見出し、2〜4行目=サンプル3行(上書き・削除して使う) |
| `選択肢` | **非表示**(sheet_state="hidden") | プルダウンの選択肢リスト置き場 |

### 4-2. 列構成(7列・この順・この文言で固定)

| 列 | 見出し(1行目) | 入力方法 | 必須 |
|---|---|---|---|
| A | `商品名` | 手入力 | 必須 |
| B | `分類` | プルダウン(9ジャンルの日本語名: 歩行補助/車いす/ベッド・起き上がり/床ずれ予防・マットレス/移乗・移動サポート/入浴/トイレ・排泄/手すり・スロープ・段差/見守り・生活サポート) | 必須 |
| C | `価格(円)` | 手入力(数値) | 必須 |
| D | `ひとこと説明` | 手入力 | 必須 |
| E | `困りごと1` | プルダウン(vocab.jsonの全困りごと31語) | 必須 |
| F | `困りごと2` | プルダウン(同上) | 任意 |
| G | `誰が使う` | プルダウン(`本人が使う` / `家族の介護に使う` / `どちらも` の3択) | 必須 |

**場面(sceneTags)の列は存在しない**。困りごとは vocab.json 上で必ずどれか1つの場面に属している(語は全場面を通じて重複しない)ため、選ばれた困りごとから場面をアプリが自動で導出する(§6-2)。

### 4-3. サンプル3行(2〜4行目にこの内容で入れる)

| 商品名 | 分類 | 価格(円) | ひとこと説明 | 困りごと1 | 困りごと2 | 誰が使う |
|---|---|---|---|---|---|---|
| らくあゆみステッキ軽量型 | 歩行補助 | 1200 | 軽くてにぎりやすい定番の一本杖 | ふらつく・転びやすい | 屋外の外出が不安 | 本人が使う |
| ささえ四点杖ワイド | 歩行補助 | 1800 | 自立するから立ち上がり時も支えになる四点杖 | ふらつく・転びやすい | 支えがないと立てない | 本人が使う |
| みまもりセンサーライト | 見守り・生活サポート | 2000 | 夜中の動きをやさしく知らせる見守りセンサー | 夜中に動き回る | 一人にするのが心配 | どちらも |

### 4-4. 生成スクリプト `scripts/make_simple_template.py` の仕様

- 実行: `python scripts/make_simple_template.py`(文字化け対策で環境変数 `PYTHONUTF8=1` を付けて実行)。openpyxl 未導入なら先に `python -m pip install openpyxl`
- `src/data/vocab.json` を `encoding="utf-8"` で読み、選択肢を**すべて機械転記**する(手書き転記禁止。生成後に件数を出力し、ジャンル9・困りごと31・誰が使う3 と照合ログを表示する)
- `商品リスト` シート:
  - 1行目: §4-2の見出し。太字+薄い背景色。ウィンドウ枠固定(A2で固定)
  - 列幅: A=28, B=16, C=12, D=44, E=24, F=24, G=14
  - 2〜4行目: §4-3のサンプル
  - データ入力規則(openpyxlの `DataValidation`、`type="list"`・`allow_blank=True`・`showErrorMessage=True`)を2〜1001行に設定:
    - B2:B1001 → `formula1="'選択肢'!$A$2:$A$10"`
    - E2:E1001 と F2:F1001 → `formula1="'選択肢'!$B$2:$B$32"`
    - G2:G1001 → `formula1="'選択肢'!$C$2:$C$4"`
- `選択肢` シート: A2:A10=ジャンル9語、B2:B32=困りごと31語、C2:C4=誰が使う3語(各列1行目は見出し)。`sheet_state = "hidden"`
- 出力1: `public/products-template-simple.xlsx`
- 出力2(`--fixtures` 引数付きで実行時): `tests/fixtures/simple-ok.xlsx`(見出し+§4-3のサンプル3行のみ、入力規則なしでよい)
- **vocab.json を変更したら本スクリプトを再実行してひな形を作り直す**(スクリプト冒頭コメントとREADMEに明記)

---

## 5. 型定義(追加・変更分)

`src/logic/csvImport.ts` の既存型を1箇所だけ拡張する:

```typescript
export type ImportResult =
  | { ok: true; products: Product[]; count: number; encoding: "utf-8" | "shift_jis" | "xlsx" }
  | { ok: false; errors: string[] };
```

新規モジュールのシグネチャ(この通りに実装する):

```typescript
// src/logic/xlsxCore.ts
export type XlsxParseResult =
  | { ok: true; rows: string[][] }        // rows[0]が1行目。空セルは""。各行は7列にパディング
  | { ok: false; error: string };
export function parseXlsxToRows(buf: ArrayBuffer): XlsxParseResult;

// src/logic/simpleCore.ts
import type { Vocab, ValidateResult } from "./csvCore.mjs";  // 既存型を流用
export const SIMPLE_HEADER: readonly string[];               // §4-2の7見出し
export function validateSimpleRows(rows: string[][], vocab: Vocab): ValidateResult;

// src/logic/xlsxImport.ts
import type { ImportResult } from "./csvImport";
export async function importXlsxFile(file: File): Promise<ImportResult>;
```

---

## 6. 機能仕様

### 6-1. `xlsxCore.ts` — .xlsx を string[][] にする(タスク2)

処理手順(この順で実装):

1. `unzipSync`(fflate)で展開する。**filterで必要ファイルのみ展開**し、zip爆弾対策として1ファイルあたり展開後30MB超は除外する:
   ```typescript
   import { unzipSync } from "fflate";
   const files = unzipSync(new Uint8Array(buf), {
     filter: (f) =>
       f.originalSize <= 30 * 1024 * 1024 &&
       (f.name === "xl/workbook.xml" ||
        f.name === "xl/_rels/workbook.xml.rels" ||
        f.name === "xl/sharedStrings.xml" ||
        /^xl\/worksheets\/sheet\d+\.xml$/.test(f.name)),
   });
   ```
   `unzipSync` が例外を投げた場合・`xl/workbook.xml` が無い場合は `{ ok: false, error: "Excelファイルを読み取れませんでした。かんたん版ひな形(.xlsx)をそのまま使って保存してください" }`
2. 各XMLは `new TextDecoder("utf-8").decode(...)` で文字列化し、`new DOMParser().parseFromString(text, "text/xml")` で解釈する。結果に `parsererror` 要素があれば手順1と同じエラーを返す
3. **対象シートの特定**: workbook.xml の `sheet` 要素(`getElementsByTagNameNS("*", "sheet")`)を文書順に見て、`state` 属性が無いか `"visible"` の**最初の**シートを選ぶ(非表示の`選択肢`シートを誤読しないため)。その `r:id`(`getAttribute("r:id")` が null なら `getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id")`)を workbook.xml.rels の `Relationship`(Id一致)で引き、`Target`(例 `worksheets/sheet1.xml`)の先頭に `xl/` を付けてファイルを得る(Targetが `/xl/...` 始まりなら先頭の `/` を除いてそのまま使う)
4. **共有文字列表**: sharedStrings.xml の `si` 要素ごとに、子孫の `t` 要素のテキストを連結して1エントリとする。ただし**祖先に `rPh` 要素を持つ `t` は除外する**(日本語Excelはセル値にふりがなデータ `rPh` を埋め込むことがあり、除外しないと「杖ツエ」のようにふりがなが混入するため)。sharedStrings.xml が無ければ空配列
5. **セル値の取り出し**: 対象シートの `row` 要素ごとに `c`(セル)要素を読む:
   - セル位置は `r` 属性(例 `"B4"`)の英字部分を26進で列番号に変換する。`r` 属性が無いセルは「直前のセルの次の列」とする
   - 値は `t` 属性で分岐: `t="s"` → `v` の数値を共有文字列表の添字として引く / `t="inlineStr"` → `is` 配下の `t` を手順4と同じ規則で連結 / それ以外(`t="str"`・属性なし=数値 等) → `v` のテキストをそのまま
   - `v` も `is` も無いセルは `""`
6. **行の組み立て**: 各 `row` の `r` 属性(Excel上の行番号)を添字として疎な配列に置き、抜けている行は空行(`["","","","","","",""]`)で埋めて密な `string[][]` にする(エラーの「N行目」表示をExcelの行番号と一致させるため)。**非空セルを含む行の行番号が1001を超えていたら** `{ ok: false, error: "商品データは1,000行までにしてください" }`。各行は7列に切り詰め/パディングする(H列以降にメモが書かれていても無視する)

### 6-2. `simpleCore.ts` — 検証と自動補完(タスク3)

**行スキップ規則**: 7列すべてが空文字(trim後)の行は、エラーにせず読み飛ばす(Excelの空行対策)。行番号の数え方はExcelのまま(詰めない)。

**検証**(エラーメッセージはこの文言で固定。`N` はExcel上の行番号):

| 対象 | 条件 | エラーメッセージ |
|---|---|---|
| 見出し行 | rows[0] の7列が SIMPLE_HEADER と完全一致しない | `1行目の見出しが想定と一致しません。かんたん版ひな形(.xlsx)の1行目を変更せずお使いください` |
| 商品名 | 空 | `N行目: 商品名 が空です` |
| 分類 | 9ジャンルの日本語名のいずれでもない | `N行目: 分類 "◯◯" は選択肢にありません(プルダウンから選んでください)` |
| 価格 | `Number()` が正の整数でない | `N行目: 価格 "◯◯" は正の整数ではありません(数字だけを入力してください)` |
| ひとこと説明 | 空 | `N行目: ひとこと説明 が空です` |
| 困りごと1 | 空 | `N行目: 困りごと1 が空です(プルダウンから選んでください)` |
| 困りごと1/2 | 空でなく、かつ困りごと31語のいずれでもない | `N行目: 困りごと "◯◯" は選択肢にありません(プルダウンから選んでください)` |
| 誰が使う | 3択のいずれでもない | `N行目: 誰が使う "◯◯" は選択肢にありません(プルダウンから選んでください)` |
| 全体 | 有効なデータ行が0件 | `商品データが1件もありません(2行目以降に記入してください)` |

フル版と同じく、**エラーが1件以上あれば `products: []` を返す**(部分取り込みをしない)。値はすべてtrimしてから検証する。

**Product への自動補完**(検証通過行を上から順に変換。値はこの表で固定):

| Productフィールド | 値 |
|---|---|
| `id` | `"p" + 通し番号を3桁ゼロ埋め`(1起点。スキップ行は数えない。例: p001, p002, …) |
| `name` | 商品名 |
| `maker` | `"―"`(固定) |
| `genre` | 分類の日本語名から `vocab.genres` を逆引きしたid(例: 歩行補助→walking) |
| `genreLabel` | 分類の日本語名そのまま |
| `price` | 価格の数値 |
| `insurance` | `"rental"`(固定。かんたん版は全商品レンタル扱い表示になる。手順書に明記) |
| `image` | `` `./images/genre-${genre}.svg` ``(フル版と同じ規則) |
| `summary` | ひとこと説明 |
| `description` | ひとこと説明(同文。かんたん版では詳しい説明を省略する仕様) |
| `specs` | `{}`(空オブジェクト) |
| `recommendFor` | 選択された困りごとごとに `` `「${困りごと}」でお困りの方` `` を生成した配列 |
| `caution` | `"ご使用の前に、担当者または取扱説明書で正しい使い方をご確認ください。"`(固定) |
| `concernTags` | [困りごと1, 困りごと2] から空を除き、重複を除いた配列 |
| `sceneTags` | concernTags の各語が属する場面labelを `vocab.scenes` から逆引きし、重複を除いた配列(vocab.scenesの並び順) |
| `userTags` | `本人が使う`→`["本人が使う"]` / `家族の介護に使う`→`["家族の介護に使う"]` / `どちらも`→`["本人が使う","家族の介護に使う"]` |
| `popularity` | `3`(固定。並び順が均一になるだけで動作に支障なし) |

補足: このパスでは id はフル版の `p\d{3}` 正規表現検証を通らない(自動採番のため検証不要)。React key・詳細画面ルーティングに使えれば十分。

### 6-3. `xlsxImport.ts` — 取り込み口(タスク4)

処理手順(この順で実装。上限値・文言はフル版 `csvImport.ts` と揃える):

1. `file.size > 10 * 1024 * 1024` なら `{ ok: false, errors: ["ファイルが大きすぎます(上限10MB)"] }`
2. `parseXlsxToRows(await file.arrayBuffer())` を呼ぶ。`ok: false` なら `{ ok: false, errors: [error] }`
3. `validateSimpleRows(rows, vocab)` を呼ぶ(vocabは `src/data/vocab.json` をimport)。エラーがあれば `{ ok: false, errors }`
4. 成功: `{ ok: true, products, count: products.length, encoding: "xlsx" }`

行数上限(1,000行)は §6-1 手順6 で検査済みのためここでは行わない。

### 6-4. `ImportPage.tsx` の改修(タスク5)

**導線の並び替え**(かんたん版を主、フル版を従に。上から):

1. Header・BackButton・説明文・ガイドリンク: 現状のまま(説明文の「ひな形CSV」は「ひな形」に修正)
2. `<a href="./products-template-simple.xlsx" download="商品リストかんたん版.xlsx" className="big-button big-button--primary">かんたん版ひな形(Excel)をダウンロード</a>` — **新設・最上位**
3. ファイル選択(既存の `<label>` を流用): ラベル文言を `記入したファイルを選ぶ(Excel / CSV)`、`accept=".xlsx,.csv,text/csv"` に変更。装飾は `big-button--primary` のまま
4. 折りたたみ `<details>` で「詳しく登録したい方(15項目CSV)」: 中に既存の「ひな形CSVをダウンロード」リンク(`big-button--secondary`)を移動
5. 結果表示エリア・「デモデータに戻す」: 現状のまま

**読み込み分岐**(`handleFileChange` 内):

- ファイル名(小文字化)が `.xlsx` で終わる → `importXlsxFile(file)`
- `.xls` で終わる → 読み込まず `{ status: "error", errors: ["古いExcel形式(.xls)には対応していません。かんたん版ひな形(.xlsx)をお使いください"] }`
- それ以外 → 従来どおり `importCsvFile(file)`

成功・エラーの表示UIは既存のまま流用する(変更しない)。

### 6-5. `sw.js` の改修(タスク6)

- `SHELL` に `"./products-template-simple.xlsx"` を追加
- `CACHE_NAME` を `"fukushi-navi-v3"` に更新

### 6-6. かんたん版記入手順書(タスク7)

`docs/依頼元向けキット/かんたん版記入手順書.md` を新規作成。非エンジニア向けの平易な日本語で、次の構成:

1. かんたん版とフル版の違い(7項目・プルダウン選択 vs 15項目・自由記入)
2. 手順: ①アプリで「かんたん版ひな形(Excel)をダウンロード」→ ②Excelで開く → ③サンプル3行を上書き・削除して自社商品を記入(分類・困りごと・誰が使うは**プルダウンから選ぶだけ**)→ ④**そのまま上書き保存**(形式変換不要)→ ⑤アプリの「記入したファイルを選ぶ」で読み込み
3. 知っておくこと: 価格は数字だけ入力 / 困りごとは最大2つ / メーカー名・詳しい説明・人気度はかんたん版では省略され、全商品「レンタル」扱いで表示される / もっと作り込みたくなったらフル版CSVへ(CSV記入手順書.md参照)
4. エラーが出たときの読み方(行番号=Excelの行番号と一致)

あわせて既存 `CSV記入手順書.md` の冒頭に「まずはかんたん版がおすすめ」の1段落を追記し、README にかんたん版の節を追記し、`public/guide.html` の取り込み説明部にかんたん版の案内1節(テキストのみ・スクショ追加なし)を追記する。

---

## 7. セキュリティ要件(追加分)

- **外部通信ゼロを維持**: .xlsx の展開・解釈もすべて端末内(fflate+DOMParser)。fetch/XHR等の通信コードを書かない
- **zip爆弾対策**: ファイルサイズ上限10MB(入口)+展開対象のfilter限定+展開後サイズ1ファイル30MB上限(§6-1手順1)
- **XSS**: セル由来の全文字列はReactのテキストノード描画のみ(既存方針)。`dangerouslySetInnerHTML` 禁止(プロジェクトルール)
- **XMLの外部実体参照**: `DOMParser` はDTD/外部実体を解決しないためXXEは成立しない(ブラウザ標準仕様)
- **npm audit 0維持**: fflate・jsdom導入後に確認(§2-2。0件にならなければ停止して人間へ報告)
- **実在データをリポジトリに含めない**: 従来どおり。fixtureはサンプル商品(架空)のみ

---

## 8. テスト(新規分の観点一覧)

`tests/simpleCore.test.ts`(string[][] を直接渡す。xlsxバイナリ不要):

- 正常系: サンプル3行 → 3件のProduct。自動補完値(id連番/maker "―"/insurance "rental"/popularity 3/specs {})の一致
- sceneTags導出: 「支えがないと立てない」→「立つ・座る」、2つの困りごとが同一場面なら場面1つに重複除去
- userTags: 「どちらも」→2タグ
- recommendFor: `「ふらつく・転びやすい」でお困りの方` 形式
- 見出し不一致 / 商品名空 / 分類が語彙外 / 価格 "1,200円" / 困りごと1空 / 困りごとが語彙外 / 誰が使うが語彙外 → 各エラーメッセージが§6-2の文言と一致
- 全列空の行はスキップされ、行番号が詰まらないこと(2行目空・3行目記入 → 3行目のエラーは「3行目:」)
- データ0件エラー

`tests/xlsxCore.test.ts`(先頭に `// @vitest-environment jsdom` を付ける):

- `tests/fixtures/simple-ok.xlsx` を `node:fs` で読み → rows が見出し+3行に一致(値の完全一致)
- 壊れたバイト列(例: `new TextEncoder().encode("not a zip")`)→ ok: false と§6-1のエラーメッセージ

既存テスト(matching / csvCore)は変更しない。

---

## 9. タスク分解(1コミット単位・推奨モデルつき)

実装は `/implement` で自律実行。各タスクは直前タスクの完了(build・test・audit通過)を前提に順番に行う。

| # | タスク | 対象ファイル | 完了条件(検証コマンド) | 推奨モデル |
|---|---|---|---|---|
| 0 | **依存導入**: `npm install fflate` と `npm install -D jsdom` | package.json / package-lock.json | `npm run build`・`npm test` 通過、`npm audit` 0件(非0なら停止・報告) | Haiku 4.5 |
| 1 | **ひな形生成スクリプト**: make_simple_template.py 作成(§4-4)→ 実行してひな形とfixtureを生成 | make_simple_template.py / products-template-simple.xlsx / tests/fixtures/simple-ok.xlsx | スクリプトの照合ログ(9/31/3件)一致。生成された.xlsxを人間がExcelで開き、プルダウン動作を目視確認(**人間チェックポイント**) | Sonnet 5 |
| 2 | **xlsxCore**: parseXlsxToRows 実装(§6-1)+テスト | xlsxCore.ts / tests/xlsxCore.test.ts | `npm test` 全パス | Sonnet 5 |
| 3 | **simpleCore**: SIMPLE_HEADER・validateSimpleRows 実装(§6-2)+テスト | simpleCore.ts / tests/simpleCore.test.ts | `npm test` 全パス | Sonnet 5 |
| 4 | **取り込み口**: xlsxImport.ts 実装(§6-3)+ImportResult拡張(§5) | xlsxImport.ts / csvImport.ts | `npm run build` 通過・`npm test` 全パス | Sonnet 5 |
| 5 | **画面改修**: ImportPage の導線並び替え・accept拡張・拡張子分岐(§6-4) | ImportPage.tsx / styles.css(details装飾が必要なら) | devで: ひな形DL→Excelで1行記入→読み込み成功→ナビで表示。.xls風名ファイルでエラー文言表示。フル版CSVも従来どおり読み込めること | Sonnet 5 |
| 6 | **SW更新**: プリキャッシュ+キャッシュ名v3(§6-5) | sw.js | `npm run build` → `npm run preview` でダウンロードリンク動作 | Haiku 4.5 |
| 7 | **ドキュメント**: かんたん版記入手順書 新規+CSV記入手順書・README・guide.html への追記(§6-6) | docs/依頼元向けキット/かんたん版記入手順書.md ほか3ファイル | 記載内容が本設計と一致(語彙件数・文言) | Sonnet 5 |
| 8 | **公開**(人間+Claude Code): `/pre-commit` → push → Pages反映 → スマホ実機で.xlsx読み込み確認 | (変更なし) | 完了条件§10をすべて満たす | Sonnet 5 |

タスク0〜7は git add/commit を Claude Code が行わず、各タスク完了時に人間が `git status` 確認のうえコミットする(自律実装テンプレートの標準運用)。

---

## 10. 完了条件

1. かんたん版ひな形(.xlsx)をアプリからダウンロードでき、Excelで開くと分類・困りごと・誰が使うがプルダウン選択できる
2. 記入した .xlsx をそのまま読み込むと、全画面(ナビ・リスト・詳細)が差し替えデータで動作する(場面の自動導出・「どちらも」の展開を含む)
3. 不正な内容(見出し改変・価格に文字・プルダウン外の値の貼り付け)が行番号つきエラーで拒否され、既存データが維持される
4. フル版CSV取り込みが従来どおり動作する(回帰なし)
5. かんたん版記入手順書が揃い、既存手順書・README・guide.html に案内が追記されている
6. `npm run build` 通過・Vitest全パス・`npm audit` 0件
7. スマホ実機で .xlsx 読み込み→テストプレイが完了できる

---

## クロスチェック記録

> クロスチェック実施結果: 第1層(2026-07-22 実施)。新規要素は「.xlsxのブラウザ内読み込み」のみ。npm `xlsx`(SheetJS 0.18.5)は既知の脆弱性勧告により不採用、`exceljs` は依存規模過剰により不採用、`fflate`(ゼロ依存・MIT)+ブラウザ標準 `DOMParser` を採用(§2-1の比較表)。fflate・jsdom の audit 状況はタスク0で実測確認し、非0なら停止する取り決めとした。ひな形生成は既知の実績がある openpyxl(technical-notes §34 で運用実績あり)。日本語Excel特有のふりがな(`rPh`)混入は§6-1手順4で対策済み。ナレッジVault検索: ブラウザ内xlsx解釈に直接該当する資料なしと判断(フル版設計時 2026-07-18 の調査範囲と同領域のため再検索省略)。
