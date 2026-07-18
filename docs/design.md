# 福祉用具カタログアプリ(案件版・ブラウザ内CSV読み込み) 設計書

**作成日**: 2026-07-18
**ステータス**: 確定(実装未着手)
**元要件**: `要件定義書.md`(2026-07-18確定) + デモ版設計書(mamoto777/fukushi-catalog-demo の docs/design.md)
**前提**: 本フォルダはデモ版コード一式のコピーから出発する。デモ版の設計(画面構成・型・マッチング・PWA・UX規則)は**変更せずそのまま引き継ぐ**。本設計書は「案件版で追加・変更する部分」のみを定義し、デモ版から不変の部分は「デモ版のまま」と明記する。

---

## 0. 設計方針: 下位モデル(Sonnet/Haiku級)での実装効率を最優先

実装は下位モデルへの委任を想定するため、以下の原則で設計する。

1. **判断余地を残さない**: 関数シグネチャ・エラーメッセージ文言・受入基準を本設計書に明記する。実装者は転記と結線のみ行う
2. **新規作成より移設**: CSV検証ロジックは `scripts/csv2json.mjs` に検証済み実装が存在する。「新しく書く」のではなく「共通モジュールへ**移動**する」タスクとして指示する(ロジックの再発明・改変を禁止)
3. **1タスク=1コミット=1〜3ファイル**: 各タスク完了時に `npm run build` と `npm test` が通る状態を維持する
4. **タスクごとに検証コマンドを明記**: 「動いたか」の確認方法を実装者が考えなくてよいようにする
5. **タスクごとに推奨モデルを明記**(§9の表)

---

## 1. 概要

### 目的

デモ版を見た企業(エンジニア不在・Copilot利用中)が、**自社の商品CSVをブラウザ内で読み込んでテストプレイ**できるようにする。実データはブラウザのメモリ上にのみ存在し、リポジトリ・公開ページ・外部サーバーには一切載らない。

### スコープ(要件定義書§3・§6より)

| 項目 | 判断 |
|---|---|
| CSV読み込み(File API・ブラウザ内検証) | **本設計の中核** |
| 読み込みデータの保存(localStorage等) | **しない**(メモリのみ。リロードでデモデータに戻る)。保存オプションはPhase 2送り |
| 既存機能(ナビ・リスト・詳細・マッチング・PWA) | デモ版のまま維持 |
| 依頼元向け記入キット3点 | 同梱ドキュメントとして整備 |
| Excel直接読み込み・サーバー・DB・比較機能 | スコープ外 |

### 公開・ホスティング(確定)

**Public リポジトリ + GitHub Pages**(デモ版と同構成・0円)。実データはリポジトリに載らない設計のため公開して安全。リポジトリ名案: `fukushi-catalog-csv-trial`(GitHub.com上で人間が手動作成)。

---

## 2. 技術スタック

デモ版のまま: Vite 8系 + React + TypeScript / react-router-dom(HashRouter) / 素のCSS / Vitest 4系 / 手書きPWA。

**追加パッケージ: なし**。CSVパーサは既存の自前実装(csv2json.mjs内のRFC4180準拠パーサ)を共通モジュール化して流用する。`npm audit` 0を維持。

**文字コード判定**: ブラウザ標準の `TextDecoder`(Encoding API)で UTF-8 / Shift_JIS を自動判定する(§5-3)。ExcelはCSV保存時に「CSV UTF-8」と「CSV(=Shift_JIS)」の2形式があり、依頼元の保存ミスを吸収するため。追加依存なしで実現できる(全モダンブラウザ対応。実装時にMDNで対応状況を1回確認する)。

---

## 3. ディレクトリ構成(変更・追加分のみ)

```
fukushi-csv-import-案件版/
├─ docs/
│  ├─ design.md                    # 本設計書
│  └─ 依頼元向けキット/
│     ├─ CSV記入手順書.md           # 新規: Excelでの記入→UTF-8保存→読み込みまで
│     ├─ タグ語彙一覧.md            # 新規: 場面×困りごと等の全語彙表(Excel貼り付け可の表形式)
│     └─ Copilot依頼文例.md        # 新規: タグ付け・データ整形をCopilotに頼む定型文
├─ public/
│  └─ products-template.csv        # 移動: data/ から移す(アプリからダウンロード可能にする)
├─ scripts/
│  └─ csv2json.mjs                 # 改修: 共通コアを呼ぶ薄いラッパーに書き換え
├─ src/
│  ├─ App.tsx                      # 改修: ProductsProviderで包む + /import ルート追加
│  ├─ logic/
│  │  ├─ csvCore.mjs               # 新規: パース+検証の共通コア(純粋JS・Node/ブラウザ両用)
│  │  ├─ csvCore.d.ts              # 新規: csvCore.mjs の型宣言(手書き)
│  │  └─ csvImport.ts              # 新規: ブラウザ側File読み込み(文字コード判定・サイズ検査)
│  ├─ data/
│  │  └─ ProductsContext.tsx       # 新規: 商品データの差し替え口(Context + Provider + hook)
│  ├─ pages/
│  │  ├─ Home.tsx                  # 改修: 「自社データで試す」ボタン追加
│  │  ├─ ImportPage.tsx            # 新規: CSV読み込み画面
│  │  ├─ ProductList.tsx           # 改修: products.json直import → useProducts()
│  │  └─ ProductDetail.tsx         # 改修: 同上
│  └─ components/
│     └─ DisclaimerFooter.tsx      # 改修: 自社データ表示中はバッジ表示に切り替え
├─ tests/
│  ├─ matching.test.ts             # 既存のまま
│  └─ csvCore.test.ts              # 新規: パース・検証・文字コード判定のテスト
└─ data/
   └─ products-template.csv        # 削除(public/へ移動。二重管理回避)
```

上記以外のファイル(types.ts / matching.ts / format.ts / questions.ts / vocab.json / products.json / sw.js ほか)は**デモ版のまま変更しない**(sw.jsのみタスク7でキャッシュ名更新)。

---

## 4. 型定義・データ構造(追加分)

既存 `src/types.ts` の `Product` / `Insurance` / `GenreId` 等はそのまま使う。追加は以下。

`src/logic/csvCore.d.ts`(csvCore.mjsの型宣言。実装と一致させる):

```typescript
import type { Product } from "../types";

export interface Vocab {
  users: string[];
  genres: { id: string; label: string }[];
  scenes: { label: string; concerns: string[] }[];
}

export interface ValidateResult {
  products: Product[];
  errors: string[];   // 「N行目: メッセージ」形式。エラー時 products は空配列
}

export function parseCsv(text: string): string[][];
export function validateProducts(rows: string[][], vocab: Vocab): ValidateResult;
```

`src/data/ProductsContext.tsx`:

```typescript
export interface ProductsState {
  products: Product[];
  source: "demo" | "custom";
  fileName: string | null;                                  // custom時のみ
  loadCustom: (products: Product[], fileName: string) => void;
  resetToDemo: () => void;
}
// useProducts(): ProductsState を返すhook。Provider外で呼んだら throw
```

`src/logic/csvImport.ts`:

```typescript
export type ImportResult =
  | { ok: true; products: Product[]; count: number; encoding: "utf-8" | "shift_jis" }
  | { ok: false; errors: string[] };

export async function importCsvFile(file: File): Promise<ImportResult>;
```

---

## 5. 機能仕様(追加・変更分)

### 5-1. 共通コア `src/logic/csvCore.mjs`(タスク1)

`scripts/csv2json.mjs` から以下を**そのまま移動**する(ロジック改変禁止。Node API(`node:fs`等)への依存を持たせない):

- `parseCsv(text)` — RFC4180準拠パーサ(BOM除去・引用符・セル内カンマ/改行対応)。現行実装をそのまま
- `validateProducts(rows, vocab)` — 現行 `main()` 内の検証部を関数化したもの。ヘッダ検査(不一致なら `errors: ["ヘッダ行が想定と一致しません。想定: ... / 実際: ..."]` を返す)、必須列・id形式(`p\d{3}`)・id重複・genre・price(正の整数)・insurance・popularity(1〜5)・specs形式・タグ語彙チェック・各複数値の最低1件チェック。**エラーメッセージ文言は現行csv2json.mjsと一字一句同じにする**(「N行目: 〜」形式)
- vocab は引数で受け取る(コア内でファイル読み込みしない)
- 検証エラーが1件以上あれば `products: []` で返す(部分的な取り込みをしない)

`.mjs`+手書き`.d.ts`とする理由: TSファイルはNode(csv2json.mjs)から直接importできず、共通化にはプレーンESMが必要なため。tsconfigの変更は不要(d.tsがあればTS側からimport可能)。

### 5-2. `scripts/csv2json.mjs` の薄型化(タスク1)

ファイル読み書き・vocab読み込み・`process.exit` のみ残し、パースと検証は `../src/logic/csvCore.mjs` をimportして呼ぶ。**入出力仕様(コマンド・入出力パス・エラー時の表示と非ゼロ終了)は現行と完全に同一**。これで検証ルールの二重管理が構造的に発生しなくなる(要件§3-1)。

### 5-3. ブラウザ側読み込み `src/logic/csvImport.ts`(タスク5)

処理手順(この順で実装):

1. **サイズ検査**: `file.size > 10 * 1024 * 1024`(10MB、グローバル方針のデフォルト上限)なら `{ ok: false, errors: ["ファイルが大きすぎます(上限10MB)"] }`
2. **文字コード判定**: `file.arrayBuffer()` で読み、
   - `new TextDecoder("utf-8").decode(buf)` に U+FFFD(置換文字)が**含まれなければ** UTF-8 として採用
   - 含まれる場合 `new TextDecoder("shift_jis").decode(buf)` を試し、U+FFFDが含まれなければ Shift_JIS として採用(`TextDecoder`生成は try/catch で包む)
   - どちらも化ける場合: `{ ok: false, errors: ["文字コードを判定できません。Excelで「CSV UTF-8」形式で保存し直してください"] }`
3. **行数上限**: `parseCsv` 後、データ行が1,000行を超える場合 `{ ok: false, errors: ["商品データは1,000行までにしてください"] }`(マッチング・描画の性能保証範囲)
4. `validateProducts(rows, vocab)` を呼ぶ(vocabは `src/data/vocab.json` をimport)。エラーがあればそのまま `{ ok: false, errors }`
5. 成功: `{ ok: true, products, count, encoding }`

### 5-4. データ差し替え口 `src/data/ProductsContext.tsx`(タスク3)

- Provider の初期状態: `{ products: productsJson(デモ100商品), source: "demo", fileName: null }`
- `loadCustom(products, fileName)`: stateを丸ごと差し替え(`source: "custom"`)
- `resetToDemo()`: 初期状態に戻す
- **保存しない**: useStateのみ。localStorage・sessionStorage・Cookieへの書き込みコードを一切書かない(リロードで自動的にデモデータへ戻る=要件§7-3)
- `ProductList.tsx` / `ProductDetail.tsx` の `import productsJson from "../data/products.json"` を `useProducts().products` に置き換える(この2ファイル以外に直importは存在しないことをgrepで確認済み)

### 5-5. CSV読み込み画面 `src/pages/ImportPage.tsx`(タスク4・5)

ルート: `#/import`。ホームに3つ目の大ボタン「自社データで試す」を追加して遷移。

画面構成(上から):

1. Header「自社データで試す」+ BackButton(既存コンポーネント流用)
2. 説明文(2〜3行): ひな形CSVに記入→このページで読み込み。「読み込んだデータはこの端末のブラウザ内だけで使われ、どこにも送信・保存されません」を明記
3. `<a href="./products-template.csv" download>` 「ひな形CSVをダウンロード」
4. ファイル選択: `<label>` を BigButton 風に装飾した `<input type="file" accept=".csv,text/csv">`(スマホのタップしやすさ確保。§5-9のUX規則 `--tap-min: 48px` 準拠)
5. 結果表示エリア:
   - 成功: 「◯件の商品データを読み込みました」+「困りごとから探す」「ジャンルから探す」ボタン(そのままテストプレイへ)
   - 失敗: 「読み込めませんでした(データは変更されていません)」+ エラー全件を `<ul>` で列挙(行番号つき。スクロール可)
6. `source === "custom"` のとき: 現在の読み込みファイル名表示 + 「デモデータに戻す」ボタン(`resetToDemo()`)

エラー時は既存データ(デモまたは前回読み込み分)を**維持**する(要件§3-1「黙って通さない・差し替えない」)。

### 5-6. 表示状態の明示(タスク6)

`DisclaimerFooter.tsx` を `useProducts()` 参照に改修し、表示を切り替える:

- `source === "demo"`: 現行どおり「本アプリは仮想データによるデモです。掲載の商品・価格・仕様は実在のものではありません」
- `source === "custom"`: 背景色を変えたバッジ様式で「**読み込みデータ表示中(この端末のみ)** — リロードするとデモデータに戻ります」

フッターは全画面共通表示のため、これ1箇所の改修で要件§3-2(全画面に常時表示)を満たす。新規コンポーネントは作らない。

### 5-7. ひな形CSVの配布(タスク7)

`data/products-template.csv` を `public/products-template.csv` へ**移動**(コピーではなく移動。二重管理回避)。csv2json.mjs のコメント・README内の参照パスも更新する。sw.js のプリキャッシュ一覧に `./products-template.csv` を追加し、キャッシュ名のバージョンを1つ上げる。

### 5-8. 依頼元向け記入キット(タスク8)

`docs/依頼元向けキット/` に3点。いずれも非エンジニア向けの平易な日本語で書く:

1. **CSV記入手順書.md**: ①ひな形ダウンロード → ②Excelで開く → ③記入ルール(15列の意味・「|」区切り・specs形式・idはp001形式) → ④「CSV UTF-8」で保存(通常CSVでも自動判定されるが推奨はUTF-8) → ⑤アプリの「自社データで試す」で読み込み → ⑥エラーが出たときの読み方(行番号と文言)
2. **タグ語彙一覧.md**: `src/data/vocab.json` の内容(users / genres / scenes×concerns)をMarkdown表に全件転記。**実装時にvocab.jsonから機械的に転記し、件数(場面7・困りごと計29等)を照合すること**
3. **Copilot依頼文例.md**: 「以下の商品説明に合うタグを、次の一覧から2〜4個選んでください: [語彙一覧貼り付け]」等、タグ付け・15列への整形・「|」区切り変換を Copilot に手伝わせる定型文3〜5例

### 5-9. 変更しない機能

困りごとナビ・ジャンル一覧・並べ替え/絞り込み・マッチングロジック・価格表示・PWA(manifest)・UX規則・免責の考え方は**デモ版設計のまま**。読み込んだ自社データも既存の`matching.ts`にそのまま乗る(語彙検証済みのため)。

---

## 6. DB設計 / 7. API設計

なし(デモ版と同じくバックエンド・外部通信ゼロ。CSV読み込みはFile APIによる端末内処理のみ)。

---

## 8. セキュリティ要件

### 8-1. 共通項

- **環境変数・APIキー・`.env`: 存在しない**(存在しないことが正)。LLM API不使用
- **個人情報非収集を維持**: CSVは商品データ15列のみで氏名等の列は存在しない。読み込みデータはReactのメモリ上のみ。localStorage・Cookie・外部送信を実装しない(§5-4で明示的に禁止)
- **入力バリデーション**: 唯一の外部入力口がCSVファイル。サイズ上限10MB・行数上限1,000・スキーマ検証(必須列/形式/語彙)を§5-3で実装。検証はすべて端末内で完結
- **実在データをリポジトリに含めない**: リポジトリ内は仮想100商品+ひな形のみ。依頼元のCSVはコミット対象に存在し得ない構成(ブラウザ内のみ)
- **XSS**: エラーメッセージ・CSV由来の全文字列はReactのテキストノードとして描画(エスケープ委任)。`dangerouslySetInnerHTML` 禁止(プロジェクトルール)
- **依存追加なし**: `npm audit` 0維持。外部公開トリガー(Stripe/LLM/CORS/0.0.0.0)すべて該当なし

### 8-2. Claude Code 採用時

- `.env` 書き込み: 発生しない設計(グローバルPreToolUseフック有効のまま)
- **初回push前**(タスク10): リポジトリはPublic。push前に①実在の商品・価格・取引先データの混入なし ②`/pre-commit`(gitleaks・npm audit・visibility確認)通過、を確認
- `gh` コマンドはブロックされるため**リポジトリ作成はGitHub.comで人間が手動実行**
- 外部送信コマンド(curl/wget/nc): グローバルdenyのまま

---

## 9. タスク分解(1コミット単位・推奨モデルつき)

実装は `/implement` で自律実行。各タスクは直前タスクの完了(ビルド・テスト通過)を前提に順番に行う。

| # | タスク | 対象ファイル | 完了条件(検証コマンド) | 推奨モデル |
|---|---|---|---|---|
| 0 | **ベースライン初回コミット**: 現状(デモ版コピー)のまま `npm install`→`npm run build`→`npm test` 通過を確認して初回コミット | (変更なし) | build/testエラー0 | Haiku 4.5 |
| 1 | **共通コア抽出**: csvCore.mjs(パース+検証の移動)・csvCore.d.ts 新規、csv2json.mjs を薄型ラッパー化(§5-1・5-2) | csvCore.mjs / csvCore.d.ts / csv2json.mjs | `npm run build` 通過。`node scripts/csv2json.mjs` が現行同様に動く(products.csv不在エラー表示を確認) | Sonnet 5 |
| 2 | **コアのテスト**: 正常3行 / ヘッダ不一致 / 列数不足 / id形式・重複 / 語彙外タグ / price・popularity不正 / 引用符・セル内カンマ改行 / BOM付き、の各ケース | tests/csvCore.test.ts | `npm test` 全パス | Sonnet 5 |
| 3 | **Context導入**: ProductsContext.tsx 新規、App.tsxでProvider包み、ProductList/ProductDetailをuseProducts()へ置換(§5-4) | ProductsContext.tsx / App.tsx / ProductList.tsx / ProductDetail.tsx | `npm run build` 通過。`npm run dev` で全画面が従来どおり表示 | Sonnet 5 |
| 4 | **読み込み画面の骨組み**: ImportPage.tsx 新規(UI+ルート+ホームのボタン。読み込み処理はダミー) | ImportPage.tsx / App.tsx / Home.tsx | dev画面で #/import 表示・戻る動作 | Sonnet 5 |
| 5 | **読み込み処理本体**: csvImport.ts(§5-3)+ImportPage結線+文字コード判定・上限のテスト追加 | csvImport.ts / ImportPage.tsx / tests/csvCore.test.ts | `npm test` 全パス。devでひな形CSV読み込み成功・不正CSVで行番号エラー表示 | Sonnet 5 |
| 6 | **バッジ切替**: DisclaimerFooter改修+バッジ用CSS(§5-6) | DisclaimerFooter.tsx / styles.css | devでcustom時にバッジ表示、リロードでデモに戻る | Haiku 4.5 |
| 7 | **ひな形移動とSW**: template移動・参照パス更新・sw.jsプリキャッシュ追加+キャッシュ名更新(§5-7) | public/products-template.csv / sw.js ほか参照箇所 | `vite preview` でダウンロードリンク動作 | Haiku 4.5 |
| 8 | **記入キット3点**(§5-8。タグ語彙一覧はvocab.jsonと件数照合) | docs/依頼元向けキット/*.md | 3ファイル存在・語彙件数一致 | Sonnet 5 |
| 9 | **README更新**: 案件版の概要・CSV読み込み手順・「データは端末内のみ」の明記・キットへの導線 | README.md | 記載内容が本設計と一致 | Haiku 4.5 |
| 10 | **公開**(人間+Claude Code): GitHub.comでPublicリポジトリ手動作成 → remote追加 → `/pre-commit` → push → Pages有効化 → スマホ実機でCSV読み込み確認 | .github/workflows/deploy.yml(必要なら調整) | 実機で完了条件§10-6を満たす | Sonnet 5 |

タスク1〜9は git add/commit を Claude Code が行わず、各タスク完了時に人間が `git status` 確認のうえコミットする(自律実装テンプレートの標準運用)。

---

## 10. 完了条件(要件定義書§7と同一)

1. ひな形準拠のCSVをブラウザで読み込み、全画面(ナビ・リスト・詳細)が差し替えデータで動作する
2. 不正なCSV(必須列欠落・語彙外タグ・価格不正)が行番号つきエラーで拒否され、既存データが維持される
3. 読み込みデータがリロードで消え、localStorage・Cookie・外部送信のいずれにも痕跡がない(コードレビューで確認)
4. 記入キット3点が揃っている
5. `npm run build` 通過・Vitest全パス・`npm audit` 0件
6. スマホ実機でCSV読み込み→テストプレイが完了できる

---

## 11. 実装エージェントと実行サーフェス

- **11-1. 採用エージェント**: Claude Code 単体
- **11-2. 根拠**: 判定1に該当(並列タスク不要・画像生成なし・外部APIなし・`/implement`利用・Git操作は通常頻度)。デモ版と同判定
- **11-3. 実行サーフェス**: **ローカルCLI**。Web版4条件のうち「ブラウザでの動作確認が不要」を満たさない(CSVファイル選択・スマホ実機・PWA確認が必要)
- **11-4/11-5**: 該当なし(Codex不使用)
- **実装時のモデル運用**: §9の推奨モデル列に従う。設計判断は本設計書で完結させているため、実装セッションでFable/Opus級は不要。曖昧さに遭遇して設計変更が必要になった場合のみ上位モデルに切り替えて判断する

---

## クロスチェック記録

> クロスチェック実施結果: 第1層(2026-07-18 実施)。新規の外部サービス・LLM API・npmパッケージの追加が**ゼロ**のため、検証対象は既存スタック(デモ版で検証済み)のみ。提案閾値該当の差分なし。唯一の新規技術要素は Encoding API(`TextDecoder("shift_jis")`)で、ブラウザ標準機能のため依存追加なし(実装時にMDNで対応状況を1回確認する)。ナレッジVault検索: デモ版設計時(2026-07-12)に確認済み・本件追加分(ブラウザ内CSV処理)に直接該当する資料なしと判断し再検索省略。
