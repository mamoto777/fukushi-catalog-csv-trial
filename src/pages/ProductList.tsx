import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import BackButton from "../components/BackButton";
import ProductCard from "../components/ProductCard";
import SortFilterBar, {
  type InsuranceFilter,
  type PriceBand,
  type SortKey,
} from "../components/SortFilterBar";
import EmptyState from "../components/EmptyState";
import { useProducts } from "../data/ProductsContext";
import { matchProducts } from "../logic/matching";
import { genreLabel } from "../data/questions";
import type { NaviAnswers, Product, ScoredProduct } from "../types";

function inPriceBand(price: number, band: PriceBand): boolean {
  switch (band) {
    case "all":
      return true;
    case "low":
      return price <= 1000;
    case "mid":
      return price > 1000 && price <= 5000;
    case "high":
      return price > 5000;
  }
}

function inInsurance(product: Product, filter: InsuranceFilter): boolean {
  if (filter === "all") return true;
  if (filter === "rental") return product.insurance === "rental";
  return product.insurance === "purchase" || product.insurance === "none";
}

/** 商品リスト(ナビ結果/ジャンル共用) */
export default function ProductList() {
  const { products } = useProducts();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const genre = searchParams.get("genre");
  const fromNavi = searchParams.get("from") === "navi";
  const naviAnswers = (location.state ?? null) as NaviAnswers | null;

  const [sort, setSort] = useState<SortKey>("recommend");
  const [priceBand, setPriceBand] = useState<PriceBand>("all");
  const [insurance, setInsurance] = useState<InsuranceFilter>("all");
  /** EmptyStateの「条件をひろげて再検索」: 困りごと条件を外し場面一致のみで再表示 */
  const [broadenRequested, setBroadenRequested] = useState(false);

  const base: { items: ScoredProduct[]; broadened: boolean } = useMemo(() => {
    if (fromNavi && naviAnswers) {
      const answers = broadenRequested
        ? { ...naviAnswers, concerns: [] }
        : naviAnswers;
      return matchProducts(products, answers);
    }
    if (genre) {
      return {
        items: products.filter((p) => p.genre === genre).map((product) => ({
          product,
          score: 0,
        })),
        broadened: false,
      };
    }
    return { items: [], broadened: false };
  }, [products, fromNavi, naviAnswers, genre, broadenRequested]);

  const items = useMemo(() => {
    const filtered = base.items.filter(
      (s) =>
        inPriceBand(s.product.price, priceBand) &&
        inInsurance(s.product, insurance),
    );
    const sorted = [...filtered];
    if (sort === "cheap") {
      sorted.sort((a, b) => a.product.price - b.product.price);
    } else if (sort === "expensive") {
      sorted.sort((a, b) => b.product.price - a.product.price);
    } else if (!fromNavi) {
      // ジャンル起点のおすすめ順 = popularity降順
      sorted.sort(
        (a, b) =>
          b.product.popularity - a.product.popularity ||
          a.product.id.localeCompare(b.product.id),
      );
    }
    // ナビ起点のおすすめ順は matchProducts のスコア順をそのまま使う
    return sorted;
  }, [base, sort, priceBand, insurance, fromNavi]);

  // ナビ起点なのに回答がない(URL直打ち等) → ナビへ誘導
  if (fromNavi && !naviAnswers) {
    return (
      <main className="page">
        <Header title="商品リスト" />
        <BackButton />
        <div className="empty-state" role="status">
          <p className="empty-state__message">
            検索条件がありません。困りごとナビからやり直してください。
          </p>
          <Link to="/navi" className="big-button big-button--primary">
            困りごとナビをはじめる
          </Link>
        </div>
      </main>
    );
  }

  const title = fromNavi
    ? "困りごとに合う商品"
    : genre
      ? `${genreLabel(genre)}の商品`
      : "商品リスト";

  const hasFilter = priceBand !== "all" || insurance !== "all";

  return (
    <main className="page">
      <Header title={title} />
      <BackButton />

      {fromNavi && naviAnswers && naviAnswers.concerns.length > 0 && (
        <p className="list-conditions">
          選んだ困りごと: {naviAnswers.concerns.join(" / ")}
        </p>
      )}
      {(base.broadened || broadenRequested) && items.length > 0 && (
        <p className="list-note" role="status">
          近い商品もあわせて表示しています
        </p>
      )}

      <SortFilterBar
        sort={sort}
        onSortChange={setSort}
        priceBand={priceBand}
        onPriceBandChange={setPriceBand}
        insurance={insurance}
        onInsuranceChange={setInsurance}
      />

      <p className="list-count" role="status">
        {items.length}件
      </p>

      {items.length === 0 ? (
        <EmptyState
          onBroaden={
            fromNavi &&
            naviAnswers !== null &&
            naviAnswers.concerns.length > 0 &&
            !broadenRequested
              ? () => setBroadenRequested(true)
              : undefined
          }
          onResetFilters={
            hasFilter
              ? () => {
                  setPriceBand("all");
                  setInsurance("all");
                }
              : undefined
          }
        />
      ) : (
        <ul className="product-list">
          {items.map((s) => (
            <ProductCard
              key={s.product.id}
              product={s.product}
              score={fromNavi ? s.score : undefined}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
