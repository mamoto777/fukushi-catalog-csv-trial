import { Link } from "react-router-dom";
import Header from "../components/Header";
import BackButton from "../components/BackButton";
import { GENRE_OPTIONS } from "../data/questions";

/** ジャンル一覧(9ジャンル・2列グリッド) */
export default function GenreList() {
  return (
    <main className="page">
      <Header title="ジャンルから探す" />
      <BackButton />
      <ul className="genre-grid">
        {GENRE_OPTIONS.map((g) => (
          <li key={g.id}>
            <Link
              to={`/list?genre=${g.id}`}
              className="genre-card"
              aria-label={`${g.label}の商品一覧を見る`}
            >
              <img
                src={`./images/genre-${g.id}.svg`}
                alt=""
                width={80}
                height={80}
                loading="lazy"
              />
              <span>{g.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
