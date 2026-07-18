interface Props {
  /** 現在地表示(画面タイトル) */
  title: string;
}

/** 画面上部の現在地表示 */
export default function Header({ title }: Props) {
  return (
    <header className="app-header">
      <p className="app-header__brand">福祉用具えらびナビ(デモ)</p>
      <h1 className="app-header__title">{title}</h1>
    </header>
  );
}
