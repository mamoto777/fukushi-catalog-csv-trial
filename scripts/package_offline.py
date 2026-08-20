"""
オフライン単一HTML版のパッケージ化スクリプト。設計書 docs/design-offline.md タスク5

前提: `npm run build:offline` を先に実行し dist-offline/index.html を生成しておくこと。

実行: PYTHONUTF8=1 python scripts/package_offline.py

出力: release-offline/福祉用具えらびナビ_オフライン版.zip
      (中身: アプリ.html / 使い方ガイド.html)
"""

import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OFFLINE_HTML = ROOT / "dist-offline" / "index.html"
GUIDE_HTML = ROOT / "public" / "guide.html"
RELEASE_DIR = ROOT / "release-offline"
ZIP_PATH = RELEASE_DIR / "福祉用具えらびナビ_オフライン版.zip"

APP_ENTRY_NAME = "アプリ.html"
GUIDE_ENTRY_NAME = "使い方ガイド.html"

MIN_APP_SIZE_BYTES = 100_000  # 埋め込み失敗の検知(未埋め込みなら数KB程度で収まるはず)


def check_prerequisites() -> None:
    missing = []
    if not OFFLINE_HTML.exists():
        missing.append(str(OFFLINE_HTML))
    if not GUIDE_HTML.exists():
        missing.append(str(GUIDE_HTML))
    if missing:
        print("前提ファイルが見つかりません:")
        for m in missing:
            print(f"  - {m}")
        print("先に `npm run build:offline` を実行してください。")
        sys.exit(1)


def build_release_dir() -> None:
    if RELEASE_DIR.exists():
        shutil.rmtree(RELEASE_DIR)
    RELEASE_DIR.mkdir(parents=True)


def copy_files() -> tuple[Path, Path]:
    app_dest = RELEASE_DIR / APP_ENTRY_NAME
    guide_dest = RELEASE_DIR / GUIDE_ENTRY_NAME
    shutil.copyfile(OFFLINE_HTML, app_dest)
    shutil.copyfile(GUIDE_HTML, guide_dest)
    return app_dest, guide_dest


def make_zip(app_path: Path, guide_path: Path) -> None:
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.write(app_path, arcname=APP_ENTRY_NAME)
        zf.write(guide_path, arcname=GUIDE_ENTRY_NAME)


def verify() -> None:
    app_size = (RELEASE_DIR / APP_ENTRY_NAME).stat().st_size
    if app_size < MIN_APP_SIZE_BYTES:
        print(
            f"警告: {APP_ENTRY_NAME} のサイズが{app_size}バイトしかありません"
            f"(想定{MIN_APP_SIZE_BYTES}バイト以上)。埋め込みが失敗している可能性があります。",
        )
        sys.exit(1)

    with zipfile.ZipFile(ZIP_PATH, "r") as zf:
        names = set(zf.namelist())
        expected = {APP_ENTRY_NAME, GUIDE_ENTRY_NAME}
        if names != expected:
            print(f"警告: zip内のファイル構成が想定と異なります。実際: {names} / 期待: {expected}")
            sys.exit(1)
        bad = zf.testzip()
        if bad is not None:
            print(f"警告: zip内の破損エントリを検出しました: {bad}")
            sys.exit(1)


def main() -> None:
    check_prerequisites()
    build_release_dir()
    app_path, guide_path = copy_files()
    make_zip(app_path, guide_path)
    verify()

    print("生成完了:")
    print(f"  {app_path} ({app_path.stat().st_size:,} bytes)")
    print(f"  {guide_path} ({guide_path.stat().st_size:,} bytes)")
    print(f"  {ZIP_PATH} ({ZIP_PATH.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
