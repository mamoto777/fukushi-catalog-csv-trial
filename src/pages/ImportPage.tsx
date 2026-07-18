import { useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import BackButton from "../components/BackButton";
import { useProducts } from "../data/ProductsContext";
import { importCsvFile } from "../logic/csvImport";

type ImportUiState =
  | { status: "idle" }
  | { status: "success"; count: number }
  | { status: "error"; errors: string[] };

/** CSV読み込み画面 */
export default function ImportPage() {
  const { source, fileName, loadCustom, resetToDemo } = useProducts();
  const [state, setState] = useState<ImportUiState>({ status: "idle" });

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const result = await importCsvFile(file);
    if (result.ok) {
      loadCustom(result.products, file.name);
      setState({ status: "success", count: result.count });
    } else {
      setState({ status: "error", errors: result.errors });
    }
  }

  return (
    <main className="page">
      <Header title="自社データで試す" />
      <BackButton />

      <p className="import-lead">
        ひな形CSVに商品データを記入し、このページで読み込むと、自社商品でテストプレイができます。
        <br />
        読み込んだデータはこの端末のブラウザ内だけで使われ、どこにも送信・保存されません。
      </p>

      <p className="import-guide-link">
        <a href="./guide.html" target="_blank" rel="noopener">
          はじめての方へ: 使い方ガイド(画面写真つき)
        </a>
      </p>

      <a
        href="./products-template.csv"
        download
        className="big-button big-button--secondary"
      >
        ひな形CSVをダウンロード
      </a>

      <label className="big-button big-button--primary import-file-label">
        CSVファイルを選ぶ
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="import-file-input"
        />
      </label>

      {state.status === "success" && (
        <div className="import-result import-result--success" role="status">
          <p>{state.count}件の商品データを読み込みました</p>
          <div className="import-result__actions">
            <Link to="/navi" className="big-button big-button--primary">
              困りごとから探す
            </Link>
            <Link to="/genres" className="big-button big-button--secondary">
              ジャンルから探す
            </Link>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="import-result import-result--error" role="alert">
          <p>読み込めませんでした(データは変更されていません)</p>
          <ul className="import-errors">
            {state.errors.map((message, i) => (
              <li key={i}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {source === "custom" && (
        <div className="import-current" role="status">
          <p>現在のデータ: {fileName}</p>
          <button
            type="button"
            className="big-button big-button--secondary"
            onClick={resetToDemo}
          >
            デモデータに戻す
          </button>
        </div>
      )}
    </main>
  );
}
