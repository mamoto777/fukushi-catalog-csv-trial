# 設計書: オフライン単一HTML版(パッケージ配布版) — design-offline.md

**版**: v1.0(2026-08-20確定)
**位置づけ**: v2(知人配布版、`docs/design.md`)の追加機能。GitHub Pages版と併存する第2のビルド系統を追加する。本設計はv2本体の挙動を一切変更しない。
**実装担当想定**: Sonnet 5(判断余地を排除した記述とする)

---

## 1. ゴール

ネット接続不要で動く配布物 **「アプリ.html」+「使い方ガイド.html」の2ファイル(zip圧縮で受け渡し)** を作る。

受け取った人はzipを展開し、`アプリ.html` をダブルクリックするだけで、以下の全機能がオフラインで動くこと。

- ひな形Excel/CSVのダウンロード
- かんたん版Excel(.xlsx)・フル版CSVの読み込み
- 全ページ遷移(ホーム/ナビ/ジャンル/一覧/詳細/検索/読み込み)
- 商品名・メーカー・TAISコード検索、類似商品表示、場面絞り込み
- localStorageによる端末内保存と、ブラウザ再起動後の復元

## 2. 方式

- 唯一の本質的障害: ブラウザはファイル直開き(file://)時に**外部JSファイルのモジュール読み込みをブロックする**。HTML内へインライン埋め込みされたスクリプトは実行される
- 対策: **`vite-plugin-singlefile`** を導入し、JS/CSS/画像等を全部1つのHTMLへ埋め込むオフライン専用ビルドモードを追加する
- 好条件(変更不要な既存要素): HashRouter採用(file://で動く)、`base: "./"` 設定済み、実行時依存パッケージ追加なし
- **2系統併存**: 既存 `npm run build`(GitHub Pages向け)の出力は変えない。オフライン版は `npm run build:offline` で別出力先へ

## 3. タスク分解

### タスク1: オフラインビルド系統の追加

1. `vite-plugin-singlefile` を **devDependencies** に追加する(実行時依存は増やさない。バージョンは `npm view vite-plugin-singlefile version` で最新を確認し、vite 8系との互換を確認してから固定)
2. `vite.offline.config.ts` を新設する:
   - 既存 `vite.config.ts` と同じく `defineConfig`(vitest/config)+ `@vitejs/plugin-react` + `base: "./"`
   - `viteSingleFile()` プラグインを追加
   - `build.outDir: "dist-offline"`
   - `build.assetsInlineLimit: 100000000`(全素材をインライン化)
   - `test` 設定は不要(テストは既存configで走る)
3. `package.json` の scripts に追加:
   - `"build:offline": "tsc --noEmit && vite build --config vite.offline.config.ts"`
4. `.gitignore` に `dist-offline/` を追加

### タスク2: 実行時に外部ファイルを参照している箇所の埋め込み化

現在 `public/` 配下(コピーされるだけで埋め込み対象外)の素材を、両ビルドで動く形に切り替える。

| 対象 | 現状 | 変更 |
|---|---|---|
| ジャンルアイコンSVG×9 | `src/pages/GenreList.tsx` が `./images/genre-${g.id}.svg` をURL文字列で参照 | `public/images/genre-*.svg` を `src/assets/images/` へ移動。9本を `?url` 付きでimportし、ジャンルid→URLのマップ(`Record<string, string>`)を作って参照する(動的テンプレート文字列参照は不可のため明示マップにする) |
| ひな形Excel | `src/pages/ImportPage.tsx` の `<a href="./products-template-simple.xlsx" download>` | `public/products-template-simple.xlsx` を `src/assets/` へ移動し `?url` import。hrefにその値を使う(download属性・表示テキストは維持) |
| フル版CSVひな形 | 同 `<a href="./products-template.csv" download>` | 同上(`src/assets/` へ移動し `?url` import) |
| ガイドへのリンク | 同 `<a href="./guide.html" target="_blank">` | href はそのまま。オフラインビルド時のみリンクの近くに「オフライン版では、同じフォルダの『使い方ガイド.html』を開いてください」という注記1行を表示する(ビルドモード判定はタスク3の定数を使う) |

補足:

- `?url` importは、通常ビルドではハッシュ付きファイルパス、オフラインビルド(inline上限最大)ではデータURIに自動で切り替わる。コード側の分岐は不要
- TypeScriptで `?url` / 画像importの型エラーが出る場合は `src/vite-env.d.ts`(なければ新設)に `/// <reference types="vite/client" />` を置く(tsconfigの `types: ["vite/client"]` 設定済みなので原則不要のはず。エラーが出た場合のみ対処)
- `.xlsx` はViteの既知アセット拡張子ではないため、両configに `assetsInclude: ["**/*.xlsx"]` を追加する
- ひな形の生成元 `scripts/make_simple_template.py` の**出力先を `src/assets/products-template-simple.xlsx` へ変更**する(`public/` との二重管理にしない)
- 移動後、旧パス(`products-template-simple.xlsx`・`products-template.csv`・`images/genre` を含む文字列)で `src/`・`scripts/`・`public/guide.html`・README・docs配下を全域grepし、参照切れ・矛盾記述ゼロを確認する。guide.html内に直リンクURLの記載があれば、公開URL(Pages側)は引き続き有効なので変更不要 — ただし「public/に置いてある」等の実装記述があれば直す
- `public/sw.js` のプリキャッシュリストに移動したファイルのパスが含まれている場合は、リストを新しいビルド後パスに合わせて更新する(Pages版のオフラインキャッシュを壊さないため。キャッシュ名のバージョンも1つ上げる)

### タスク3: ビルドモード定数とService Worker登録のスキップ

1. `vite.offline.config.ts` に `define: { __OFFLINE_BUILD__: "true" }` を追加。既存 `vite.config.ts` には `define: { __OFFLINE_BUILD__: "false" }` を追加
2. 型宣言: `src/vite-env.d.ts`(または新設の `src/globals.d.ts`)に `declare const __OFFLINE_BUILD__: boolean;` を追記し、tsconfigのincludeに入っていることを確認
3. `src/main.tsx` のSW登録条件を `if (!__OFFLINE_BUILD__ && import.meta.env.PROD && "serviceWorker" in navigator)` に変更(オフライン版ではSW登録＝通信の肩代わり機能をスキップ。file://では無意味なため)
4. タスク2の「ガイド注記」の表示分岐にも `__OFFLINE_BUILD__` を使う

### タスク4: localStorage衝突ガードの確認

- file://直開きでは、端末内の他のローカルHTMLと保存領域(localStorage)を共有するブラウザ挙動がある
- `src/logic/storage.ts` の保存キーを確認し、アプリ固有の接頭辞(例: `fukushi-catalog:` 等、既存キーがそうなっていればそのまま)が付いていることを確認する。付いていなければ付ける
- **既存キーの変更は不可**(Pages版の利用者の保存データが消えるため)。接頭辞が不十分でも、キー名は現状維持とし、判断に迷う場合は設計書のこの節を根拠に「現状維持+報告」を選ぶ

### タスク5: パッケージ化スクリプト

`scripts/package_offline.py` を新設(Python標準ライブラリのみ、LLM不使用の決定論):

1. 前提チェック: `dist-offline/index.html` と `public/guide.html` の存在確認(なければエラーメッセージを出して終了コード1)
2. `release-offline/` フォルダを作成(存在すれば中身を作り直し)
3. `dist-offline/index.html` → `release-offline/アプリ.html` へコピー
4. `public/guide.html` → `release-offline/使い方ガイド.html` へコピー
5. 上記2ファイルを `release-offline/福祉用具えらびナビ_オフライン版.zip` に圧縮(zipfile、ZIP_DEFLATED)
6. 出力: 各ファイルのサイズと保存先パスを表示
7. 検証を同スクリプト内に含める: zipを読み戻してエントリ名2件が期待どおりであること、`アプリ.html` のサイズが100KB以上であること(埋め込み失敗の検知)
8. ファイル書き込みはUTF-8明示(`encoding="utf-8"`)。zip内の日本語ファイル名はzipfileの既定(UTF-8フラグ)でよい
9. `.gitignore` に `release-offline/` を追加(配布物はリポジトリに含めない)

### タスク6: ドキュメント整合

1. README に「オフライン版(ネット不要のパッケージ)」の節を追加: 作り方(`npm run build:offline` → `python scripts/package_offline.py`)と、配布物が2ファイルzipであること、データは端末内のみである点は同じであること
2. `docs/design.md`(v2本体)は変更しない。本ファイルが正
3. 旧仕様の語(「public/products-template-simple.xlsx」「images/genre」等の移動前パス、「オフライン非対応」等の記述)でREADME・guide.html・手順書類をgrepし、矛盾記述ゼロを確認する

## 4. 変更対象ファイル一覧

| 種別 | ファイル |
|---|---|
| 新規 | `vite.offline.config.ts` / `scripts/package_offline.py` / `docs/design-offline.md`(本書) |
| 修正 | `package.json` / `.gitignore` / `src/main.tsx` / `src/pages/GenreList.tsx` / `src/pages/ImportPage.tsx` / `scripts/make_simple_template.py` / `README.md` / (必要時)`src/vite-env.d.ts`・`public/sw.js`・`vite.config.ts`(assetsInclude・define追加のみ) |
| 移動 | `public/images/genre-*.svg`(9本)→`src/assets/images/` / `public/products-template-simple.xlsx`→`src/assets/` / `public/products-template.csv`→`src/assets/` |

## 5. 完了条件

1. `npm run build`(既存Pages向け)がエラーなし、出力構成が従来どおり(単一化されていないこと)
2. `npm test` 95件全パス(テストの追加は不要。既存が通ることが条件)
3. `npm audit` 0件
4. `npm run build:offline` がエラーなく完走し、`dist-offline/index.html` 単体(目安1〜2MB)にJS/CSS/SVG/ひな形が埋め込まれている(`grep -c "data:" dist-offline/index.html` が1以上、`assets/` フォルダが出力されていない、で機械確認)
5. `python scripts/package_offline.py` がzip生成+自己検証まで成功
6. src配下に `fetch(`・`XMLHttpRequest`・`dangerouslySetInnerHTML` が引き続き不在
7. git add / git commit はしない(人間が確認してから実施)

## 6. 人間チェックポイント(実装完了後、ユーザーが実施)

ネット切断状態で `release-offline/アプリ.html` をダブルクリックし:

1. ひな形Excel/CSVのダウンロードができる
2. `テストデータ-かんたん版50件.xlsx` の読み込みが成功する
3. 全ページ遷移・検索・類似商品表示・場面絞り込みが動く
4. ブラウザを完全に閉じて再度開き、読み込んだデータが復元されている

## 7. 未検証リスク(L3。チェックポイントで潰す)

- **file://でのlocalStorage永続性**: Chrome/Edgeで動く見込みだが、ブラウザ・設定次第で消える可能性 → §6-4が検証を兼ねる。消える場合は「オフライン版は起動のたびに読み込みが必要」と配布文書に明記する方向へ倒す(コード変更はしない)
- **データURI形式のxlsxダウンロードの警告**: Edgeでダウンロード警告が出る可能性 → 出た場合のみ、hrefのデータURIを実行時に `fetch` を使わず `atob` でBlob化し `URL.createObjectURL` で差し替える方式に変更する(この対処もオフライン・Pages両ビルド共通コードでよい)

## 8. 制約(v2から継続)

- 外部通信コード(`fetch`/`XMLHttpRequest`)・`dangerouslySetInnerHTML` 禁止
- 実行時依存パッケージを増やさない(devDependenciesのみ追加可)
- 実在の商品・価格・取引先データをリポジトリに含めない
- `.env` は存在しないことが正
- 既存ファイルの削除はしない(タスク2の「移動」は許可された例外)
