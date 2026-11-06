# KEYWORD のアイコン：黒地に、ライム色の鍵穴。鍵穴の丸の中に黒い「A」（単語＝鍵）。
# 実行: python3 tools/keyword-icon.py （study-game から）。keyword/ に書き出す。
from PIL import Image, ImageDraw, ImageFont

S = 1024
BG = (12, 12, 13)
BG2 = (28, 28, 31)
KEY = (215, 249, 74)


def font(sz):
    for p in ['/System/Library/Fonts/Supplemental/Arial Black.ttf',
              '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
              '/System/Library/Fonts/Helvetica.ttc']:
        try:
            return ImageFont.truetype(p, sz)
        except OSError:
            pass
    return ImageFont.load_default()


def make(full=True):
    im = Image.new('RGB', (S, S), BG)
    d = ImageDraw.Draw(im)
    for y in range(S):
        k = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(BG2[i] * (1 - k) + BG[i] * k) for i in range(3)))
    sc = 1.0 if full else 0.78
    c = S / 2

    def P(x, y):
        return (c + (x - c) * sc, c + (y - c) * sc)
    # 細い輪
    rr = 400 * sc
    d.ellipse([c - rr, c - rr, c + rr, c + rr], outline=(60, 62, 52), width=int(10 * sc))
    # 鍵穴：丸＋下に広がる台形
    cx, cy, r = c, c - 90 * sc, 190 * sc
    d.polygon([P(c - 70, 400), P(c + 70, 400), P(c + 150, 790), P(c - 150, 790)], fill=KEY)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=KEY)
    # 丸の中の A
    f = font(int(250 * sc))
    bb = d.textbbox((0, 0), 'A', font=f)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    d.text((cx - w / 2 - bb[0], cy - h / 2 - bb[1]), 'A', font=f, fill=BG)
    return im


full = make(True)
mask = make(False)
for size, name, im in [(512, 'icon-512.png', full), (192, 'icon-192.png', full),
                       (180, 'apple-touch-icon.png', full), (512, 'icon-maskable.png', mask)]:
    im.resize((size, size), Image.LANCZOS).save('keyword/' + name)
