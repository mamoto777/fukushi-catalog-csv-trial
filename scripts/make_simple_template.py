"""
かんたん版ひな形(.xlsx)生成スクリプト。設計書 docs/design-かんたん版.md §4-4

実行: PYTHONUTF8=1 python scripts/make_simple_template.py
      PYTHONUTF8=1 python scripts/make_simple_template.py --fixtures

src/data/vocab.json を正として選択肢を機械転記する。
vocab.json を変更したら本スクリプトを再実行してひな形を作り直すこと。
"""

import json
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
VOCAB_PATH = ROOT / "src" / "data" / "vocab.json"

SIMPLE_HEADER = [
    "商品名",
    "分類",
    "価格(円)",
    "ひとこと説明",
    "困りごと1",
    "困りごと2",
    "誰が使う",
]

USER_CHOICES = ["本人が使う", "家族の介護に使う", "どちらも"]

SAMPLE_ROWS = [
    [
        "らくあゆみステッキ軽量型",
        "歩行補助",
        1200,
        "軽くてにぎりやすい定番の一本杖",
        "ふらつく・転びやすい",
        "屋外の外出が不安",
        "本人が使う",
    ],
    [
        "ささえ四点杖ワイド",
        "歩行補助",
        1800,
        "自立するから立ち上がり時も支えになる四点杖",
        "ふらつく・転びやすい",
        "支えがないと立てない",
        "本人が使う",
    ],
    [
        "みまもりセンサーライト",
        "見守り・生活サポート",
        2000,
        "夜中の動きをやさしく知らせる見守りセンサー",
        "夜中に動き回る",
        "一人にするのが心配",
        "どちらも",
    ],
]

COLUMN_WIDTHS = {"A": 28, "B": 16, "C": 12, "D": 44, "E": 24, "F": 24, "G": 14}


def load_vocab():
    with open(VOCAB_PATH, encoding="utf-8") as f:
        vocab = json.load(f)
    genre_labels = [g["label"] for g in vocab["genres"]]
    concern_labels = [c for s in vocab["scenes"] for c in s["concerns"]]
    return genre_labels, concern_labels


def build_workbook(genre_labels, concern_labels):
    wb = Workbook()

    ws = wb.active
    ws.title = "商品リスト"

    header_font = Font(bold=True)
    header_fill = PatternFill(start_color="DDEBF7", end_color="DDEBF7", fill_type="solid")
    for col_idx, title in enumerate(SIMPLE_HEADER, start=1):
        cell = ws.cell(row=1, column=col_idx, value=title)
        cell.font = header_font
        cell.fill = header_fill

    for col_letter, width in COLUMN_WIDTHS.items():
        ws.column_dimensions[col_letter].width = width

    ws.freeze_panes = "A2"

    for row_idx, row in enumerate(SAMPLE_ROWS, start=2):
        for col_idx, value in enumerate(row, start=1):
            ws.cell(row=row_idx, column=col_idx, value=value)

    # 選択肢シート(非表示)
    ws_choices = wb.create_sheet("選択肢")
    ws_choices.cell(row=1, column=1, value="分類")
    ws_choices.cell(row=1, column=2, value="困りごと")
    ws_choices.cell(row=1, column=3, value="誰が使う")
    for i, label in enumerate(genre_labels, start=2):
        ws_choices.cell(row=i, column=1, value=label)
    for i, label in enumerate(concern_labels, start=2):
        ws_choices.cell(row=i, column=2, value=label)
    for i, label in enumerate(USER_CHOICES, start=2):
        ws_choices.cell(row=i, column=3, value=label)
    ws_choices.sheet_state = "hidden"

    # データ入力規則(プルダウン)
    dv_genre = DataValidation(
        type="list",
        formula1=f"'選択肢'!$A$2:$A${1 + len(genre_labels)}",
        allow_blank=True,
        showErrorMessage=True,
    )
    dv_concern = DataValidation(
        type="list",
        formula1=f"'選択肢'!$B$2:$B${1 + len(concern_labels)}",
        allow_blank=True,
        showErrorMessage=True,
    )
    dv_user = DataValidation(
        type="list",
        formula1=f"'選択肢'!$C$2:$C${1 + len(USER_CHOICES)}",
        allow_blank=True,
        showErrorMessage=True,
    )
    ws.add_data_validation(dv_genre)
    ws.add_data_validation(dv_concern)
    ws.add_data_validation(dv_user)
    dv_genre.add("B2:B1001")
    dv_concern.add("E2:E1001")
    dv_concern.add("F2:F1001")
    dv_user.add("G2:G1001")

    return wb


def build_fixture_workbook():
    """テスト用: 入力規則なし・見出し+サンプル3行のみ"""
    wb = Workbook()
    ws = wb.active
    ws.title = "商品リスト"
    for col_idx, title in enumerate(SIMPLE_HEADER, start=1):
        ws.cell(row=1, column=col_idx, value=title)
    for row_idx, row in enumerate(SAMPLE_ROWS, start=2):
        for col_idx, value in enumerate(row, start=1):
            ws.cell(row=row_idx, column=col_idx, value=value)
    return wb


def main():
    genre_labels, concern_labels = load_vocab()

    print(f"ジャンル: {len(genre_labels)}件")
    print(f"困りごと: {len(concern_labels)}件")
    print(f"誰が使う: {len(USER_CHOICES)}件")

    if "--fixtures" in sys.argv:
        out_path = ROOT / "tests" / "fixtures" / "simple-ok.xlsx"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        wb = build_fixture_workbook()
        wb.save(out_path)
        print(f"生成: {out_path}")
    else:
        out_path = ROOT / "public" / "products-template-simple.xlsx"
        wb = build_workbook(genre_labels, concern_labels)
        wb.save(out_path)
        print(f"生成: {out_path}")


if __name__ == "__main__":
    main()
