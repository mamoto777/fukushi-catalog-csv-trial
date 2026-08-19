/*
 * シーン設定シート(場面・困りごと)→ Vocab["scenes"] への変換。設計書 docs/design.md §5-3
 */
import type { Vocab } from "./csvCore.mjs";

export interface SceneBuildResult {
  scenes: Vocab["scenes"]; // エラー時は空配列
  errors: string[];
}

export const SCENE_SHEET_HEADER: readonly string[] = ["場面", "困りごと"];

const MAX_SCENES = 12;
const MAX_CONCERN_ROWS = 120;

export function buildScenesFromRows(rows: string[][]): SceneBuildResult {
  const header = (rows[0] ?? []).map((c) => c.trim());
  if (header.join(",") !== SCENE_SHEET_HEADER.join(",")) {
    return {
      scenes: [],
      errors: [
        "シーン設定シート 1行目: 見出しが「場面」「困りごと」ではありません。アプリから新しいひな形(Excel)をダウンロードしてお使いください",
      ],
    };
  }

  const errors: string[] = [];
  const sceneMap = new Map<string, string[]>();
  const seenConcerns = new Set<string>();

  rows.slice(1).forEach((rawCols, idx) => {
    const line = idx + 2; // ヘッダが1行目(Excelの行番号のまま)
    const scene = (rawCols[0] ?? "").trim();
    const concern = (rawCols[1] ?? "").trim();

    if (scene === "" && concern === "") return; // 両方空はスキップ

    if (scene === "" && concern !== "") {
      errors.push(`シーン設定シート ${line}行目: 場面 が空です`);
      return;
    }
    if (concern === "" && scene !== "") {
      errors.push(`シーン設定シート ${line}行目: 困りごと が空です`);
      return;
    }
    if (seenConcerns.has(concern)) {
      errors.push(
        `シーン設定シート ${line}行目: 困りごと "${concern}" が重複しています(困りごとは全体で1つずつにしてください)`,
      );
      return;
    }
    seenConcerns.add(concern);
    const list = sceneMap.get(scene);
    if (list) {
      list.push(concern);
    } else {
      sceneMap.set(scene, [concern]);
    }
  });

  if (sceneMap.size === 0 && errors.length === 0) {
    errors.push(
      "シーン設定シートに場面と困りごとが1件もありません(2行目以降に記入してください)",
    );
  }
  if (sceneMap.size > MAX_SCENES) {
    errors.push(
      `シーン設定シート: 場面は12種類までにしてください(現在${sceneMap.size}種類)`,
    );
  }
  if (seenConcerns.size > MAX_CONCERN_ROWS) {
    errors.push(
      `シーン設定シート: 困りごとは120行までにしてください(現在${seenConcerns.size}行)`,
    );
  }

  if (errors.length > 0) {
    return { scenes: [], errors };
  }

  const scenes: Vocab["scenes"] = Array.from(sceneMap.entries()).map(
    ([label, concerns]) => ({ label, concerns }),
  );
  return { scenes, errors: [] };
}
