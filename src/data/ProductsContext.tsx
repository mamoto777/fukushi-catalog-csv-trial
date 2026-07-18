import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import productsJson from "./products.json";
import type { Product } from "../types";

const DEMO_PRODUCTS = productsJson as unknown as Product[];

export interface ProductsState {
  products: Product[];
  source: "demo" | "custom";
  fileName: string | null;
  loadCustom: (products: Product[], fileName: string) => void;
  resetToDemo: () => void;
}

const ProductsContext = createContext<ProductsState | null>(null);

/** 商品データの差し替え口。保存はしない(useStateのみ。リロードでデモに戻る) */
export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [source, setSource] = useState<"demo" | "custom">("demo");
  const [fileName, setFileName] = useState<string | null>(null);

  const value = useMemo<ProductsState>(
    () => ({
      products,
      source,
      fileName,
      loadCustom: (newProducts, newFileName) => {
        setProducts(newProducts);
        setSource("custom");
        setFileName(newFileName);
      },
      resetToDemo: () => {
        setProducts(DEMO_PRODUCTS);
        setSource("demo");
        setFileName(null);
      },
    }),
    [products, source, fileName],
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
