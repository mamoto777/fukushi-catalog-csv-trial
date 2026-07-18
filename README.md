# 福祉用具えらびナビ(デモ)

福祉用具レンタル業の若手社員が、顧客ヒアリングの場で「困りごと」から適切な福祉用具にたどり着き、説明・価格提示までできるスマホ/タブレット用アプリの**デモ版**です。

> **免責**: 本アプリは仮想データによるデモです。掲載の商品・価格・仕様・メーカー名はすべて架空であり、実在のものではありません。

## 特徴

- **困りごとナビ**: 3つの質問(誰が使う/どの場面/どんな困りごと)に答えるだけで、タグマッチングにより候補商品を提案
- **ジャンル検索**: 9ジャンルから一覧で探せる(どの商品にもホームから3タップ以内)
- **高齢者に見せられるUI**: 大きな文字(本文18px)・大きなボタン(タップ領域48px以上)・高コントラスト
- **PWA対応**: スマホの「ホーム画面に追加」でアプリのように使える。2回目以降はオフラインでも閲覧可
- **個人情報ゼロ**: 入力フォームなし。回答は保存されず、外部送信も一切なし(LLM/AIも不使用)

## 技術構成

| 項目 | 内容 |
|---|---|
| ビルド | Vite 8 + TypeScript |
| UI | React 19 + react-router-dom(HashRouter) |
| スタイル | 素のCSS(CSS変数) |
| テスト | Vitest(マッチングロジックの単体テスト) |
| PWA | 手書き manifest + Service Worker(cache-first・同一オリジンのみ) |
| データ | `src/data/products.json`(仮想100商品をビルドに同梱) |
| ホスティング | GitHub Pages(GitHub Actions で自動デプロイ) |

バックエンド・DB・環境変数・APIキーはありません。

## 起動方法(開発)

```bash
npm install        # 初回のみ
npm run dev        # 開発サーバー(http://localhost:5173)
npm test           # 単体テスト
npm run build      # 型チェック + 本番ビルド(dist/)
npm run preview    # 本番ビルドの確認(http://localhost:4173)
```

## データ更新手順(実データへの差し替え)

商品データはCSVから変換して差し替えられます。

1. `data/products-template.csv` をコピーして `data/products.csv` を作る
2. Excel等で商品を入力する(UTF-8で保存)
   - 複数の値(おすすめ・タグ類)は `|` 区切り
   - 仕様(specs)は `項目名:値|項目名:値` 形式
   - `concernTags` / `sceneTags` / `userTags` は `src/data/vocab.json` にある語彙のみ使える(語彙外はエラーで弾かれる)
   - `genre` は walking / wheelchair / bed / mattress / transfer / bath / toilet / handrail / watch の9種
   - `insurance` は rental(レンタル) / purchase(特定福祉用具販売) / none(保険適用外)
3. 変換を実行する

   ```bash
   npm run data:convert
   ```

   エラーがあれば行番号つきで全件表示されます(その場合ファイルは更新されません)
4. `npm run build` して動作確認 → git push で自動デプロイ

商品画像はジャンル共通のイラスト(`public/images/genre-*.svg`)を使用しています。個別の商品写真に差し替える場合は `public/images/` に画像を置き、CSVのimage列対応を追加する改修が必要です(Phase 2)。

## デプロイ(GitHub Pages)

`main` ブランチへの push で `.github/workflows/deploy.yml` が走り、テスト→ビルド→GitHub Pages 公開まで自動で行われます。

初回のみ、GitHubリポジトリの **Settings → Pages → Source を「GitHub Actions」** に設定してください。

公開URL(予定): `https://mamoto777.github.io/fukushi-catalog-demo/`

## 個人情報の取り扱い

本アプリは以下を**仕様として持ちません**。

- 氏名・年齢等の入力フォーム
- localStorage / Cookie への保存(ナビの回答はメモリ上のみで、画面を離れると消えます)
- 外部サーバーへの送信(Service Workerのキャッシュも同一オリジンのみ)

## ライセンス・注意

知人への納品を前提とした試作品です。商品データ・メーカー名はすべて架空です。
