import { Link } from "react-router-dom";

interface Props {
  /** 「条件をひろげて再検索」を出すか(ナビ起点で困りごと条件がある場合のみ) */
  onBroaden?: () => void;
  /** 絞り込みリセットを出すか(フィルタで0件になった場合) */
  onResetFilters?: () => void;
}

/** 該当0件時の導線(設計書§5-5) */
export default function EmptyState({ onBroaden, onResetFilters }: Props) {
  return (
    <div className="empty-state" role="status">
      <p className="empty-state__message">
        条件に合う商品が見つかりませんでした
      </p>
      {onBroaden && (
        <button type="button" className="big-button big-button--primary" onClick={onBroaden}>
          条件をひろげて再検索
        </button>
      )}
      {onResetFilters && (
        <button
          type="button"
          className="big-button big-button--secondary"
          onClick={onResetFilters}
        >
          絞り込みをリセット
        </button>
      )}
      <Link to="/genres" className="big-button big-button--secondary">
        ジャンルから探す
      </Link>
    </div>
  );
}
