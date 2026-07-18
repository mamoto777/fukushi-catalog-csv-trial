import Header from "../components/Header";
import BigButton from "../components/BigButton";

/** ホーム(2大ボタン) */
export default function Home() {
  return (
    <main className="page">
      <Header title="ホーム" />
      <p className="home-lead">
        お客様の「困りごと」から、ぴったりの福祉用具をいっしょに探せるアプリです。
      </p>
      <nav className="home-buttons" aria-label="探し方をえらぶ">
        <BigButton to="/navi">
          <span className="home-buttons__main">困りごとから探す</span>
          <span className="home-buttons__sub">3つの質問に答えるだけ(おすすめ)</span>
        </BigButton>
        <BigButton to="/genres" variant="secondary">
          <span className="home-buttons__main">ジャンルから探す</span>
          <span className="home-buttons__sub">商品の種類をえらんで探す</span>
        </BigButton>
      </nav>
    </main>
  );
}
