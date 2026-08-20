import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * オフライン単一HTML版のビルド設定。設計書 docs/design-offline.md
 * JS/CSS/画像/ひな形を全部1つのHTMLへ埋め込み、file://直開きで動くようにする。
 * 通常ビルド(vite.config.ts, GitHub Pages向け)には一切影響しない。
 */
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  assetsInclude: ["**/*.xlsx"],
  // public/(guide.html・sw.js・icons等)は複製しない。出力はindex.html単体にする
  // (使い方ガイドはscripts/package_offline.pyがpublic/guide.htmlから直接同梱する)
  publicDir: false,
  define: {
    __OFFLINE_BUILD__: "true",
  },
  build: {
    outDir: "dist-offline",
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
});
