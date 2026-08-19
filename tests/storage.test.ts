// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  STORAGE_KEY,
  parseSavedData,
  saveCustomData,
  loadCustomData,
  clearCustomData,
  type SavedData,
} from "../src/logic/storage";
import type { Vocab } from "../src/logic/csvCore.mjs";
import type { Product } from "../src/types";

const vocab: Vocab = {
  users: ["本人が使う", "家族の介護に使う"],
  genres: [{ id: "walking", label: "歩行補助" }],
  scenes: [{ label: "歩く・移動", concerns: ["ふらつく・転びやすい"] }],
};

function makeProduct(id: string): Product {
  return {
    id,
    name: "テスト商品",
    maker: "テストメーカー",
    genre: "walking",
    genreLabel: "歩行補助",
    price: 1000,
    insurance: "rental",
    image: "./images/genre-walking.svg",
    summary: "要約",
    description: "説明",
    specs: {},
    recommendFor: ["テスト"],
    caution: "注意",
    concernTags: ["ふらつく・転びやすい"],
    sceneTags: ["歩く・移動"],
    userTags: ["本人が使う"],
    popularity: 3,
  };
}

const validSaved: Omit<SavedData, "version"> = {
  savedAt: "2026-08-19T03:00:00.000Z",
  fileName: "商品リストかんたん版.xlsx",
  products: [makeProduct("p001")],
  vocab,
};

beforeEach(() => {
  localStorage.clear();
});

describe("STORAGE_KEY", () => {
  it('"fukushi-catalog-data-v2" に固定されている', () => {
    expect(STORAGE_KEY).toBe("fukushi-catalog-data-v2");
  });
});

describe("parseSavedData", () => {
  it("正常なJSONを復元する", () => {
    const json = JSON.stringify({ version: 2, ...validSaved });
    const result = parseSavedData(json);
    expect(result).not.toBeNull();
    expect(result?.fileName).toBe(validSaved.fileName);
    expect(result?.products).toHaveLength(1);
  });

  it("nullはnullを返す", () => {
    expect(parseSavedData(null)).toBeNull();
  });

  it("壊れたJSONはnullを返す", () => {
    expect(parseSavedData("{not valid json")).toBeNull();
  });

  it("version不一致はnullを返す", () => {
    const json = JSON.stringify({ version: 1, ...validSaved });
    expect(parseSavedData(json)).toBeNull();
  });

  it("productsが空配列ならnullを返す", () => {
    const json = JSON.stringify({ version: 2, ...validSaved, products: [] });
    expect(parseSavedData(json)).toBeNull();
  });

  it("vocabが欠落していたらnullを返す", () => {
    const { vocab: _omit, ...rest } = validSaved;
    const json = JSON.stringify({ version: 2, ...rest });
    expect(parseSavedData(json)).toBeNull();
  });

  it("fileNameが文字列でなければnullを返す", () => {
    const json = JSON.stringify({ version: 2, ...validSaved, fileName: 123 });
    expect(parseSavedData(json)).toBeNull();
  });

  it("productsの要素にid/nameが無ければnullを返す", () => {
    const json = JSON.stringify({
      version: 2,
      ...validSaved,
      products: [{ price: 100 }],
    });
    expect(parseSavedData(json)).toBeNull();
  });
});

describe("saveCustomData / loadCustomData / clearCustomData", () => {
  it("保存→復元ができる", () => {
    const ok = saveCustomData(validSaved);
    expect(ok).toBe(true);
    const loaded = loadCustomData();
    expect(loaded?.fileName).toBe(validSaved.fileName);
    expect(loaded?.products[0].id).toBe("p001");
  });

  it("保存されていない状態ではnullを返す", () => {
    expect(loadCustomData()).toBeNull();
  });

  it("clearCustomDataで削除される", () => {
    saveCustomData(validSaved);
    clearCustomData();
    expect(loadCustomData()).toBeNull();
  });

  it("壊れたデータが直接localStorageに入っていても復元時はnull(削除はしない)", () => {
    localStorage.setItem(STORAGE_KEY, "{broken");
    expect(loadCustomData()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("{broken");
  });
});
