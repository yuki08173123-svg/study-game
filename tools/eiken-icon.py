#!/usr/bin/env python3
"""英検準2級 単熟語 のアイコンを作る（PIL だけ）。
青の地に、白の「英」を太いゴシックで大きく（左右のまん中）。下のまん中に金の札「準2」。
python3 tools/eiken-icon.py → eiken-p2/ にアイコン4枚と /tmp/eiken-icon-preview.png
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'eiken-p2')
GOTH = '/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc'
GOTH6 = '/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc'
S = 1024
TOP, BOT = (40, 98, 168), (24, 62, 116)
WHITE = (255, 255, 255)
GOLD = (236, 178, 58)
NAVY = (22, 40, 74)


def draw(size=S, safe=1.0):
    im = Image.new('RGB', (size, size))
    px = im.load()
    for y in range(size):
        t = y / (size - 1)
        c = tuple(int(TOP[i] * (1 - t) + BOT[i] * t) for i in range(3))
        for x in range(size):
            px[x, y] = c
    d = ImageDraw.Draw(im)
    k = size / S * safe
    cx, cy = size / 2, size / 2
    # 「英」は左右のまん中。字の形（インクの範囲）で中心を合わせる
    f = ImageFont.truetype(GOTH, int(540 * k))
    l, t, r, b = d.textbbox((0, 0), '英', font=f, anchor='lt')
    d.text((cx - (l + r) / 2, cy - 70 * k - (t + b) / 2), '英', font=f, fill=WHITE, anchor='lt')
    # 金の札「準2」は下のまん中
    w, h = 300 * k, 170 * k
    y0 = cy + 255 * k
    d.rounded_rectangle([cx - w / 2, y0, cx + w / 2, y0 + h], radius=int(36 * k), fill=GOLD)
    sf = ImageFont.truetype(GOTH6, int(118 * k))
    d.text((cx, y0 + h / 2), '準2', font=sf, fill=NAVY, anchor='mm')
    return im


def main():
    big = draw()
    big.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'))
    big.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'icon-192.png'))
    big.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, 'apple-touch-icon.png'))
    draw(safe=0.8).resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-maskable.png'))
    big.resize((256, 256), Image.LANCZOS).save('/tmp/eiken-icon-preview.png')


if __name__ == '__main__':
    main()
