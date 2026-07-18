import type { Product } from "../types";

export interface Vocab {
  users: string[];
  genres: { id: string; label: string }[];
  scenes: { label: string; concerns: string[] }[];
}

export interface ValidateResult {
  products: Product[];
  errors: string[]; // 「N行目: メッセージ」形式。エラー時 products は空配列
}

export function parseCsv(text: string): string[][];
export function validateProducts(rows: string[][], vocab: Vocab): ValidateResult;
