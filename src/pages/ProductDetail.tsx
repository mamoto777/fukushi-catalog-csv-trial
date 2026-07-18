import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import BackButton from "../components/BackButton";
import productsJson from "../data/products.json";
import { insuranceLabel, priceLabel } from "../logic/format";
import type { Product } from "../types";

const PRODUCTS = productsJson as unknown as Product[];

/** 商品詳細 */
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const product = PRODUCTS.find((p) => p.id === id);

  if (!product) {
    return (
      <main className="page">
        <Header title="商品詳細" />
        <BackButton />
        <div className="empty-state" role="status">
          <p className="empty-state__message">商品が見つかりませんでした</p>
          <Link to="/" className="big-button big-button--primary">
            ホームにもどる
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <Header title="商品詳細" />
      <BackButton />

      <article className="product-detail">
        <img
          src={product.image}
          alt={`${product.genreLabel}のイメージ画像`}
          className="product-detail__image"
          width={160}
          height={160}
        />
        <p className="product-detail__genre">{product.genreLabel}</p>
        <h2 className="product-detail__name">{product.name}</h2>
        <p className="product-detail__maker">{product.maker}</p>

        <section className="product-detail__price-box" aria-label="価格">
          <p className="product-detail__price">{priceLabel(product)}</p>
          <p className="product-detail__insurance">{insuranceLabel(product)}</p>
          <p className="product-detail__note">
            ※負担割合は所得により2〜3割の場合があります
          </p>
        </section>

        <section aria-labelledby="detail-desc">
          <h3 id="detail-desc">商品説明</h3>
          <p className="product-detail__description">{product.description}</p>
        </section>

        <section aria-labelledby="detail-recommend">
          <h3 id="detail-recommend">こんな方におすすめ</h3>
          <ul className="product-detail__recommend">
            {product.recommendFor.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="detail-specs">
          <h3 id="detail-specs">仕様</h3>
          <table className="product-detail__specs">
            <tbody>
              {Object.entries(product.specs).map(([k, v]) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="detail-caution">
          <h3 id="detail-caution">注意点</h3>
          <p className="product-detail__caution">{product.caution}</p>
        </section>
      </article>
    </main>
  );
}
