import vocab from "./vocab.json";
import type { GenreId } from "../types";

/** 質問1「どなたが使いますか?」の選択肢(単一選択) */
export const USER_OPTIONS: string[] = vocab.users;

/** 質問2「どの場面で困っていますか?」の選択肢(単一選択) */
export interface SceneOption {
  label: string;
  concerns: string[];
}
export const SCENE_OPTIONS: SceneOption[] = vocab.scenes;

/** 質問3の選択肢(質問2の回答に応じて動的表示、最大3つ複数選択) */
export function concernsForScene(scene: string): string[] {
  return SCENE_OPTIONS.find((s) => s.label === scene)?.concerns ?? [];
}

/** 質問3で選択できる最大数 */
export const MAX_CONCERNS = 3;

/** ジャンル一覧(9ジャンル) */
export interface GenreOption {
  id: GenreId;
  label: string;
}
export const GENRE_OPTIONS: GenreOption[] = vocab.genres as GenreOption[];

export function genreLabel(id: string): string {
  return GENRE_OPTIONS.find((g) => g.id === id)?.label ?? id;
}
