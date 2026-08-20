import type { GenreId } from "../types";

import walking from "./images/genre-walking.svg";
import wheelchair from "./images/genre-wheelchair.svg";
import bed from "./images/genre-bed.svg";
import mattress from "./images/genre-mattress.svg";
import transfer from "./images/genre-transfer.svg";
import bath from "./images/genre-bath.svg";
import toilet from "./images/genre-toilet.svg";
import handrail from "./images/genre-handrail.svg";
import watch from "./images/genre-watch.svg";

/**
 * ジャンルid→アイコンURLの明示マップ。設計書 docs/design-offline.md タスク2。
 * 動的テンプレート文字列参照(`./images/genre-${id}.svg`)はViteのimport解析対象外のため、
 * importしたURLを明示的にマップ化する(通常ビルド=ハッシュ付きパス、オフラインビルド=データURIに自動で切り替わる)。
 */
export const GENRE_ICONS: Record<GenreId, string> = {
  walking,
  wheelchair,
  bed,
  mattress,
  transfer,
  bath,
  toilet,
  handrail,
  watch,
};
