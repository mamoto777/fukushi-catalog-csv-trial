# fukushi-csv-import-案件版

福祉用具カタログアプリ。知人がまず個人的に使ってみる配布用のベースアプリ。ひな形(Excel/CSV)に自分の商品データを記入してブラウザ内で読み込むと、アプリの中身が丸ごと入れ替わり、端末内(localStorage)に保存されて次回起動時も復元される。

要件定義: `docs/requirements.md`(v2・知人配布版、2026-08-19確定)
設計書: @docs/design.md(v2・知人配布版が正。旧版(案件版v1・かんたん版)はgit履歴を参照)

## プロジェクト固有ルール

- 環境変数・APIキー・外部通信は一切使わない(`.env` が存在しないことが正)。読み込みはブラウザのFile APIによる端末内処理のみ、保存は端末内のlocalStorageのみ
- `dangerouslySetInnerHTML` 使用禁止
- 商品タグ(concernTags/sceneTags/userTags)は「現在有効な語彙」(初期値=内蔵`src/data/vocab.json`。かんたん版Excel読み込みでscenesのみ入れ替わる)に対して検証する。users/genresは常に内蔵固定
- ビルド: `npm run build`(= `tsc --noEmit && vite build`)/ テスト: `npm test`
- **実在の商品・価格・取引先データをリポジトリに含めない**(リポジトリ内は仮想100商品のみ。実データはブラウザ内でのみ扱う)
- リポジトリ公開設定: **Public + GitHub Pages で確定**(2026-07-18)。コミット・pushは人間が実施する
- 本フォルダが案件版の正。デモ版フォルダは凍結(改修はこちらでのみ行う)
