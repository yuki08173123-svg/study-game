#!/usr/bin/env python3
"""理科の一問一答 のアイコンを作る（PIL だけ）。
藍の地に方眼、白い「理」を丸ゴシックで大きく。右下に赤い丸印「一問一答」。
python3 tools/rika-icon.py → rika/ にアイコン4枚と /tmp/rika-icon-preview.png
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'rika')
MARU = '/System/Library/Fonts/ヒラギノ丸ゴ ProN W4.ttc'
GOTH = '/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc'

S = 1024
TOP = (36, 92, 145)
BOT = (20, 56, 94)
WHITE = (250, 252, 255)
RED = (214, 72, 56)


def draw(size=S, safe=1.0):
    im = Image.new('RGB', (size, size))
    px = im.load()
    for y in range(size):
        t = y / (size - 1)
        c = tuple(int(TOP[i] * (1 - t) + BOT[i] * t) for i in range(3))
        for x in range(size):
            px[x, y] = c
    im = im.convert('RGBA')
    grid = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    g = ImageDraw.Draw(grid)
    step = size / 16
    for k in range(1, 16):
        g.line([(k * step, 0), (k * step, size)], fill=(255, 255, 255, 16), width=max(1, size // 512))
        g.line([(0, k * step), (size, k * step)], fill=(255, 255, 255, 16), width=max(1, size // 512))
    im.alpha_composite(grid)
    d = ImageDraw.Draw(im)
    k = size / S * safe
    cx, cy = size / 2, size / 2
    f = ImageFont.truetype(GOTH, int(560 * k))
    d.text((cx - 50 * k, cy - 40 * k), '理', font=f, fill=WHITE, anchor='mm')
    # 丸い印
    r = 150 * k
    ox, oy = cx + 235 * k, cy + 235 * k
    d.ellipse([ox - r, oy - r, ox + r, oy + r], fill=RED)
    sf = ImageFont.truetype(GOTH, int(84 * k))
    d.text((ox, oy - 46 * k), '一問', font=sf, fill=WHITE, anchor='mm')
    d.text((ox, oy + 46 * k), '一答', font=sf, fill=WHITE, anchor='mm')
    return im.convert('RGB')


def main():
    big = draw()
    big.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'))
    big.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'icon-192.png'))
    big.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, 'apple-touch-icon.png'))
    draw(safe=0.8).resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-maskable.png'))
    sizes = [180, 110, 72, 48]
    pv = Image.new('RGB', (sum(sizes) + 40 * 5, 220), (240, 240, 240))
    x = 40
    for s in sizes:
        pv.paste(big.resize((s, s), Image.LANCZOS), (x, 20))
        x += s + 40
    pv.save('/tmp/rika-icon-preview.png')


if __name__ == '__main__':
    main()
