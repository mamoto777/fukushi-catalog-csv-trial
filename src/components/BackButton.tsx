import { useNavigate } from "react-router-dom";

interface Props {
  /** 指定時は履歴の戻るより優先する(ナビの1問戻る等) */
  onClick?: () => void;
  label?: string;
}

/** 全画面共通の大型「もどる」ボタン */
export default function BackButton({ onClick, label = "もどる" }: Props) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="back-button"
      onClick={onClick ?? (() => navigate(-1))}
      aria-label={label}
    >
      ← {label}
    </button>
  );
}
