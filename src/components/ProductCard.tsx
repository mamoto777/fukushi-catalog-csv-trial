import { Link } from "react-router-dom";
import type { Product } from "../types";
import { priceLabel } from "../logic/format";

interface Props {
  product: Product;
  /** ナビ起点時のみ表示するマッチ度(スコア) */
  score?: number;
}

/** マッチ度バッジの文言(スコア帯で3段階) */
export function matchBadgeLabel(score: number): string {
  if (score >= 6) return "ぴったり";
  if (score >= 3) return "おすすめ";
  return "ちかい商品";
}

/** リスト用商品カード */
export default function ProductCard({ product, score }: Props) {
  return (
    <li className="product-card">
      <Link
        to={`/product/${product.id}`}
        className="product-card__link"
        aria-label={`${product.name} の詳細を見る`}
      >
        <img
          src={product.image}
          alt=""
          className="product-card__image"
          loading="lazy"
          width={96}
          height={96}
        />
        <div className="product-card__body">
          {score !== undefined && score > 0 && (
            <span className="match-badge">{matchBadgeLabel(score)}</span>
          )}
          <p className="product-card__name">{product.name}</p>
          <p className="product-card__maker">{product.maker}</p>
          <p className="product-card__price">{priceLabel(product)}</p>
          <p className="product-card__summary">{product.summary}</p>
        </div>
      </Link>
    </li>
  );
}
