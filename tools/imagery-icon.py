# Imagery のアイコン：青緑の地に、白い写真（山と太陽）と、それにかざす虫めがね。
# 実行: python3 tools/imagery-icon.py （study-game から）。imagery/ に書き出す。
from PIL import Image, ImageDraw
import os

Z = 2048
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'imagery')


def draw(scale=1.0):
    im = Image.new('RGB', (Z, Z))
    d = ImageDraw.Draw(im)
    top, bot = (42, 138, 146), (20, 84, 92)
    for y in range(Z):
        t = y / Z
        d.line([(0, y), (Z, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    c = Z / 2

    def P(x, y):
        return (c + (x - c) * scale, c + (y - c) * scale)

    def box(x0, y0, x1, y1):
        a, b = P(x0, y0); e, f = P(x1, y1)
        return [a, b, e, f]
    # 写真（少しかたむけない・白いふち）
    d.rounded_rectangle(box(330, 470, 1500, 1400), int(90 * scale), fill=(255, 255, 255))
    d.rounded_rectangle(box(420, 560, 1410, 1310), int(50 * scale), fill=(214, 236, 238))
    # 太陽
    d.ellipse(box(1110, 660, 1290, 840), fill=(245, 190, 70))
    # 山
    pts = [P(420, 1310), P(760, 880), P(960, 1120), P(1110, 960), P(1410, 1310)]
    d.polygon(pts, fill=(31, 111, 120))
    d.rounded_rectangle(box(420, 1240, 1410, 1310), 0, fill=(31, 111, 120))
    # 虫めがね
    lw = int(95 * scale)
    d.line([P(1460, 1420), P(1760, 1720)], fill=(26, 26, 26), width=int(150 * scale))
    d.ellipse(box(1110, 1070, 1590, 1550), fill=(236, 247, 248))
    d.ellipse(box(1110, 1070, 1590, 1550), outline=(26, 26, 26), width=lw)
    d.arc(box(1200, 1160, 1500, 1460), 200, 260, fill=(255, 255, 255), width=int(40 * scale))
    return im


full = draw(1.0)
safe = draw(0.8)
for name, im, s in [('icon-512.png', full, 512), ('icon-192.png', full, 192), ('apple-touch-icon.png', full, 180), ('icon-maskable.png', safe, 512)]:
    im.resize((s, s), Image.LANCZOS).save(os.path.join(OUT, name))
print('ok')
