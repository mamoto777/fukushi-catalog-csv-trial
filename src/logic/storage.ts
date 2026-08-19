/*
 * localStorageへの保存・復元・削除。設計書 docs/design.md §5-7
 */
import type { Product } from "../types";
import type { Vocab } from "./csvCore.mjs";

export const STORAGE_KEY = "fukushi-catalog-data-v2";

export interface SavedData {
  version: 2;
  savedAt: string; // ISO 8601(new Date().toISOString())
  fileName: string;
  products: Product[];
  vocab: Vocab;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** 純関数(テスト対象)。次をすべて満たさなければnull(黙って無視) */
export function parseSavedData(json: string | null): SavedData | null {
  if (typeof json !== "string") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!isObject(parsed)) return null;
  if (parsed.version !== 2) return null;
  if (typeof parsed.fileName !== "string") return null;
  if (typeof parsed.savedAt !== "string") return null;

  const products = parsed.products;
  if (!Array.isArray(products) || products.length < 1) return null;
  for (const p of products) {
    if (!isObject(p)) return null;
    if (typeof p.id !== "string" || typeof p.name !== "string") return null;
  }

  const vocab = parsed.vocab;
  if (!isObject(vocab)) return null;
  if (!Array.isArray(vocab.users)) return null;
  if (!Array.isArray(vocab.genres)) return null;
  if (!Array.isArray(vocab.scenes)) return null;

  return {
    version: 2,
    savedAt: parsed.savedAt,
    fileName: parsed.fileName,
    products: products as Product[],
    vocab: vocab as unknown as Vocab,
  };
}

/** 保存成功=true。例外(容量超過等)・localStorage不在時はfalse */
export function saveCustomData(data: Omit<SavedData, "version">): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, ...data }),
    );
    return true;
  } catch {
    return false;
  }
}

export function loadCustomData(): SavedData | null {
  if (typeof localStorage === "undefined") return null;
  return parseSavedData(localStorage.getItem(STORAGE_KEY));
}

export function clearCustomData(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 例外は握りつぶす(アプリ動作を止めない)
  }
}
