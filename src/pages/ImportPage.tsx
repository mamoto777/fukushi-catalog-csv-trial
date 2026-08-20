import { useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import BackButton from "../components/BackButton";
import { useProducts } from "../data/ProductsContext";
import { importCsvFile } from "../logic/csvImport";
import { importXlsxFile } from "../logic/xlsxImport";
import simpleTemplateUrl from "../assets/products-template-simple.xlsx?url";
import fullTemplateUrl from "../assets/products-template.csv?url";

type ImportUiState =
  | { status: "idle" }
  | { status: "success"; count: number; saved: boolean }
  | { status: "error"; errors: string[] };

/** 商品データ読み込み画面 */
export default function ImportPage() {
  const { source, vocab, fileName, loadCustom, resetToDemo } = useProducts();
  const [state, setState] = useState<ImportUiState>({ status: "idle" });

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    let result;
    if (lowerName.endsWith(".xlsx")) {
      result = await importXlsxFile(file);
    } else if (lowerName.endsWith(".xls")) {
      result = {
        ok: false as const,
        errors: [
          "古いExcel形式(.xls)には対応していません。かんたん版ひな形(.xlsx)をお使いください",
        ],
      };
    } else {
      result = await importCsvFile(file, vocab);
    }

    if (result.ok) {
      const saved = loadCustom(result.products, result.vocab, file.name);
      setState({ status: "success", count: result.count, saved });
    } else {
      setState({ status: "error", errors: result.errors });
    }
  }

  return (
    <main className="page">
      <Header title="商品データを読み込む" />
      <BackButton />

      <p className="import-lead">
        ひな形に商品データを記入し、このページで読み込むと、アプリの商品が自分のデータに入れ替わります。
        <br />
        読み込んだデータは<strong>この端末のブラウザ内だけに保存</strong>され、外部には一切送信されません。「デモデータに戻す」でいつでも消せます。
      </p>

      <p className="import-guide-link">
        {/* オフライン版はパッケージ同梱の「使い方ガイド.html」へリンクする(docs/design-offline.md タスク2) */}
        <a
          href={__OFFLINE_BUILD__ ? "./使い方ガイド.html" : "./guide.html"}
          target="_blank"
          rel="noopener"
        >
          はじめての方へ: 使い方ガイド(画面写真つき)
        </a>
        {__OFFLINE_BUILD__ && (
          <>
            <br />
            (アプリと同じフォルダにある「使い方ガイド.html」が開きます)
          </>
        )}
      </p>

      <a
        href={simpleTemplateUrl}
        download="商品リストかんたん版.xlsx"
        className="big-button big-button--primary"
      >
        かんたん版ひな形(Excel)をダウンロード
      </a>

      <label className="big-button big-button--primary import-file-label">
        記入したファイルを選ぶ(Excel / CSV)
        <input
          type="file"
          accept=".xlsx,.csv,text/csv"
          onChange={handleFileChange}
          className="import-file-input"
        />
      </label>

      <details className="import-advanced">
        <summary>詳しく登録したい方(16項目CSV)</summary>
        <a
          href={fullTemplateUrl}
          download="products-template.csv"
          className="big-button big-button--secondary"
        >
          ひな形CSVをダウンロード
        </a>
      </details>

      {state.status === "success" && (
        <div className="import-result import-result--success" role="status">
          <p>{state.count}件の商品データを読み込みました</p>
          {!state.saved && (
            <p className="import-save-warning" role="alert">
              端末への保存はできませんでした(次回開くと消えます)
            </p>
          )}
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
