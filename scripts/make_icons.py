# PWAアイコン生成(開発時のみ使用。設計書§3)
# 使い方: python scripts/make_icons.py
# 出力: public/icons/icon-192.png / icon-512.png
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "icons"

BG = (15, 90, 160)  # theme_color #0f5aa0
FG = (255, 255, 255)

FONT_CANDIDATES = [
    "C:/Windows/Fonts/meiryob.ttc",
    "C:/Windows/Fonts/meiryo.ttc",
    "C:/Windows/Fonts/YuGothB.ttc",
    "C:/Windows/Fonts/msgothic.ttc",
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    raise FileNotFoundError("日本語フォントが見つかりません")


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    # 角丸の内側パネル
    margin = size // 16
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=size // 8,
        outline=FG,
        width=max(2, size // 48),
    )
    # 中央に「福」
    font = load_font(int(size * 0.5))
    text = "福"
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw.text(
        ((size - w) / 2 - bbox[0], (size - h) / 2 - bbox[1]),
        text,
        font=font,
        fill=FG,
    )
    return img


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        icon = make_icon(size)
        out = OUT_DIR / f"icon-{size}.png"
        icon.save(out)
        print(f"OK: {out}")


if __name__ == "__main__":
    main()
