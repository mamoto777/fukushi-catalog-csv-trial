/// <reference types="vite/client" />

/**
 * ビルドモード定数。設計書 docs/design-offline.md タスク3。
 * vite.config.ts(通常ビルド)では"false"、vite.offline.config.ts(オフライン単一HTML版)では"true"。
 * vite.config.tsのdefineで注入され、実行時に文字列置換される。
 */
declare const __OFFLINE_BUILD__: boolean;
