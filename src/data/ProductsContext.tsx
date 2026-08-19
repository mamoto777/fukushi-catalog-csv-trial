import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import productsJson from "./products.json";
import vocabJson from "./vocab.json";
import type { Product } from "../types";
import type { Vocab } from "../logic/csvCore.mjs";
import { loadCustomData, saveCustomData, clearCustomData } from "../logic/storage";

const DEMO_PRODUCTS = productsJson as unknown as Product[];

interface InternalState {
  products: Product[];
  vocab: Vocab;
  source: "demo" | "custom";
  fileName: string | null;
}

const DEMO_STATE: InternalState = {
  products: DEMO_PRODUCTS,
  vocab: vocabJson as Vocab,
  source: "demo",
  fileName: null,
};

export interface ProductsState {
  products: Product[];
  vocab: Vocab; // 現在有効な語彙(初期値=内蔵vocab.json)
  source: "demo" | "custom";
  fileName: string | null;
  /** 取り込み成功時に呼ぶ。vocab=nullなら現在の語彙を維持。戻り値=localStorage保存の成否 */
  loadCustom: (products: Product[], vocab: Vocab | null, fileName: string) => boolean;
  resetToDemo: () => void; // 内蔵100商品+内蔵語彙に戻し、保存データも削除
}

const ProductsContext = createContext<ProductsState | null>(null);

/** 商品データ+語彙の差し替え口。localStorageに保存し次回起動時に復元する */
export function ProductsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InternalState>(() => {
    const saved = loadCustomData();
    if (saved) {
      return {
        products: saved.products,
        vocab: saved.vocab,
        source: "custom",
        fileName: saved.fileName,
      };
    }
    return DEMO_STATE;
  });

  const value = useMemo<ProductsState>(
    () => ({
      products: state.products,
      vocab: state.vocab,
      source: state.source,
      fileName: state.fileName,
      loadCustom: (newProducts, newVocab, newFileName) => {
        const nextVocab = newVocab ?? state.vocab;
        setState({
          products: newProducts,
          vocab: nextVocab,
          source: "custom",
          fileName: newFileName,
        });
        return saveCustomData({
          savedAt: new Date().toISOString(),
          fileName: newFileName,
          products: newProducts,
          vocab: nextVocab,
        });
      },
      resetToDemo: () => {
        setState(DEMO_STATE);
        clearCustomData();
      },
    }),
    [state],
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts(): ProductsState {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts は ProductsProvider の内側で使ってください");
  return ctx;
}
