import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Header from "../components/Header";
import BackButton from "../components/BackButton";
import ProductCard from "../components/ProductCard";
import EmptyState from "../components/EmptyState";
import { useProducts } from "../data/ProductsContext";
import { searchProducts } from "../logic/search";

/** 商品名キーワード検索(設計書§5-8) */
export default function SearchPage() {
  const { products } = useProducts();
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => searchProducts(products, query),
    [products, query],
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <main className="page">
      <Header title="商品名からさがす" />
      <BackButton />

      <input
        type="search"
        className="search-input"
        placeholder="商品名・メーカー・TAISコード"
        aria-label="商品名・メーカー・TAISコード"
        value={query}
        onChange={handleChange}
      />

      {query.trim() === "" ? (
        <p className="search-hint">
          商品名・メーカー名・TAISコードの一部を入力してください
        </p>
      ) : results.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <p className="list-count" role="status">
            {results.length}件
          </p>
          <ul className="product-list">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
