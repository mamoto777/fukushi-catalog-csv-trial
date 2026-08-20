/** 保険区分 */
export type Insurance =
  | "rental" // 介護保険レンタル(貸与)対象 → 月額レンタル価格
  | "purchase" // 特定福祉用具販売の対象(入浴・排泄系) → 販売価格
  | "none"; // 保険適用外 → 販売価格

export type GenreId =
  | "walking" // 歩行補助(杖・歩行器・シルバーカー)
  | "wheelchair" // 車いす
  | "bed" // ベッド・起き上がり
  | "mattress" // 床ずれ予防・マットレス
  | "transfer" // 移乗・移動サポート
  | "bath" // 入浴
  | "toilet" // トイレ・排泄
  | "handrail" // 手すり・スロープ・段差
  | "watch"; // 見守り・生活サポート

export interface Product {
  id: string; // "p001"〜"p100"
  name: string; // 商品名(架空)
  maker: string; // メーカー名(架空)
  taisCode?: string; // TAISコード(任意・自由記述。空文字または未定義=なし。デモ100商品は未定義)
  genre: GenreId;
  genreLabel: string; // 表示用ジャンル名
  price: number; // rental: 月額レンタル価格(10割) / purchase・none: 販売価格(税込)
  insurance: Insurance;
  image: string; // "./images/genre-walking.svg" 等。データ互換のため保持(描画には使わず、genreからsrc/assets/genreIcons.tsのGENRE_ICONSを引く)
  summary: string; // 1行特徴(リストカード用)
  description: string; // 3〜5行の説明
  specs: Record<string, string>; // { "重さ": "490g", "高さ調節": "71〜94cm" }
  recommendFor: string[]; // 「こんな方におすすめ」(生活の言葉で2〜4項目)
  caution: string; // 注意点(1〜2行)
  concernTags: string[]; // vocab.json の困りごと語彙から(2〜4個)
  sceneTags: string[]; // vocab.json の場面語彙から(1〜2個)
  userTags: string[]; // "本人が使う" | "家族の介護に使う"(両方可)
  popularity: number; // 1〜5(同点時の並び用)
}

/** 困りごとナビの回答状態(メモリ上のみ。保存しない) */
export interface NaviAnswers {
  user: string | null; // 質問1の回答(userTag)
  scene: string | null; // 質問2の回答(sceneTag)
  concerns: string[]; // 質問3の回答(concernTags、最大3つ複数選択)
}

/** スコア付き商品(リスト表示用) */
export interface ScoredProduct {
  product: Product;
  score: number;
}
