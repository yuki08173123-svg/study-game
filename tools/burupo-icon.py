# ブルポ帳のアイコン：青い表紙に、方眼のノートの紙。黒い「字」と、はねの所に青い○（ブルポ）。
# 実行: python3 tools/burupo-icon.py （study-game から）。最後に /tmp/burupo-icon-preview.png で 160/110/72/48px を並べる。
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = 1024
KLEE = '/System/Library/AssetsV2/com_apple_MobileAsset_Font8/81e879dcb4d596ab140f7cffcd5ccaaf8108519b.asset/AssetData/Klee.ttc'
BLUE = (31, 86, 200)
BLUE_D = (20, 63, 154)
PAPER = (255, 253, 245)
GRID = (205, 219, 240)
INK = (29, 29, 31)


def hand_circle(d, cx, cy, rx, ry, w, col, start=-1.9, sweep=2.18):
    """一筆の丸（始めと終わりが少し重なり、太さが変わる）"""
    n = 160
    pts = []
    for i in range(n + 1):
        t = start + sweep * math.pi * i / n
        wob = 1 + 0.035 * math.sin(3 * t + 0.6)
        pts.append((cx + rx * wob * math.cos(t), cy + ry * wob * math.sin(t), i / n))
    for (x1, y1, a), (x2, y2, _) in zip(pts, pts[1:]):
        ww = w * (0.55 + 0.45 * math.sin(math.pi * min(1, a * 1.15)))
        d.line([(x1, y1), (x2, y2)], fill=col, width=max(1, int(ww)))
        r = ww / 2
        d.ellipse([x2 - r, y2 - r, x2 + r, y2 + r], fill=col)


def make(full=True):
    im = Image.new('RGB', (S, S), BLUE)
    d = ImageDraw.Draw(im)
    # 表紙のグラデ
    for y in range(S):
        k = y / S
        c = tuple(int(BLUE[i] * (1 - k * 0.28) + BLUE_D[i] * k * 0.28) for i in range(3))
        d.line([(0, y), (S, y)], fill=c)
    # 紙（少し影）
    m = 150 if full else 210
    px0, py0, px1, py1 = m, m - 10, S - m, S - m + 30
    sh = Image.new('L', (S, S), 0)
    ImageDraw.Draw(sh).rounded_rectangle([px0 + 8, py0 + 22, px1 + 8, py1 + 22], 36, fill=110)
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    im.paste((10, 30, 80), (0, 0), sh)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([px0, py0, px1, py1], 36, fill=PAPER)
    # 方眼
    step = (px1 - px0) / 6
    for k in range(1, 6):
        x = px0 + step * k
        d.line([(x, py0 + 4), (x, py1 - 4)], fill=GRID, width=4)
        y = py0 + (py1 - py0) / 6 * k
        d.line([(px0 + 4, y), (px1 - 4, y)], fill=GRID, width=4)
    # 字
    cx, cy = (px0 + px1) / 2, (py0 + py1) / 2
    size = int((px1 - px0) * 0.74)
    f = ImageFont.truetype(KLEE, size, index=1)   # Klee の太いほう
    bb = d.textbbox((0, 0), '字', font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    tx, ty = cx - tw / 2 - bb[0], cy - th / 2 - bb[1] - 6
    d.text((tx, ty), '字', font=f, fill=INK, stroke_width=int(size * 0.014), stroke_fill=INK)
    # はねの所に青い○
    hx, hy = tx + bb[0] + tw * 0.44, ty + bb[1] + th * 0.86
    rr = (px1 - px0) * 0.15
    hand_circle(d, hx, hy, rr * 1.12, rr * 0.9, (px1 - px0) * 0.045, BLUE)
    return im


def main():
    im = make(True)
    out = 'burupo/'
    im.resize((512, 512), Image.LANCZOS).save(out + 'icon-512.png')
    im.resize((192, 192), Image.LANCZOS).save(out + 'icon-192.png')
    im.resize((180, 180), Image.LANCZOS).save(out + 'apple-touch-icon.png')
    make(False).resize((512, 512), Image.LANCZOS).save(out + 'icon-maskable.png')
    # 並べて確認
    sizes = [160, 110, 72, 48]
    pv = Image.new('RGB', (sum(sizes) + 20 * (len(sizes) + 1), 200), (244, 238, 226))
    x = 20
    for s in sizes:
        pv.paste(im.resize((s, s), Image.LANCZOS), (x, 20))
        x += s + 20
    pv.save('/tmp/burupo-icon-preview.png')


if __name__ == '__main__':
    main()
