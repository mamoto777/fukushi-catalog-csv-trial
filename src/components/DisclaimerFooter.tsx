import { useProducts } from "../data/ProductsContext";

/** 表示状態の常時明示(設計書§1・§5-6: 全画面フッター必須) */
export default function DisclaimerFooter() {
  const { source } = useProducts();

  if (source === "custom") {
    return (
      <footer className="disclaimer-footer disclaimer-footer--custom" role="contentinfo">
        読み込みデータ表示中(この端末内だけに保存・外部送信なし)
      </footer>
    );
  }

  return (
    <footer className="disclaimer-footer" role="contentinfo">
      本アプリは仮想データによるデモです。掲載の商品・価格・仕様は実在のものではありません
    </footer>
  );
}
