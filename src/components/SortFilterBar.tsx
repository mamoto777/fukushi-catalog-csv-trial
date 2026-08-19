export type SortKey = "recommend" | "cheap" | "expensive";
export type PriceBand = "all" | "low" | "mid" | "high";
export type InsuranceFilter = "all" | "rental" | "sale";

interface Props {
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
  priceBand: PriceBand;
  onPriceBandChange: (v: PriceBand) => void;
  insurance: InsuranceFilter;
  onInsuranceChange: (v: InsuranceFilter) => void;
  /** 場面絞り込み。sceneOptions を渡したときだけ「場面」selectを表示する */
  sceneOptions?: string[];
  scene?: string; // "all" またはシーンlabel
  onSceneChange?: (v: string) => void;
}

/** 並べ替え・絞り込みUI(設計書§5-5・§5-9) */
export default function SortFilterBar({
  sort,
  onSortChange,
  priceBand,
  onPriceBandChange,
  insurance,
  onInsuranceChange,
  sceneOptions,
  scene,
  onSceneChange,
}: Props) {
  return (
    <div className="sort-filter-bar">
      {sceneOptions && (
        <label className="sort-filter-bar__item">
          <span>場面</span>
          <select
            value={scene}
            onChange={(e) => onSceneChange?.(e.target.value)}
          >
            <option value="all">すべて</option>
            {sceneOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="sort-filter-bar__item">
        <span>並べ替え</span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
        >
          <option value="recommend">おすすめ順</option>
          <option value="cheap">価格が安い順</option>
          <option value="expensive">価格が高い順</option>
        </select>
      </label>
      <label className="sort-filter-bar__item">
        <span>価格帯</span>
        <select
          value={priceBand}
          onChange={(e) => onPriceBandChange(e.target.value as PriceBand)}
        >
          <option value="all">すべて</option>
          <option value="low">〜1,000円</option>
          <option value="mid">1,000〜5,000円</option>
          <option value="high">5,000円〜</option>
        </select>
      </label>
      <label className="sort-filter-bar__item">
        <span>保険区分</span>
        <select
          value={insurance}
          onChange={(e) =>
            onInsuranceChange(e.target.value as InsuranceFilter)
          }
        >
          <option value="all">すべて</option>
          <option value="rental">レンタル対象</option>
          <option value="sale">販売対象</option>
        </select>
      </label>
    </div>
  );
}
