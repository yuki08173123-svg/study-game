#!/usr/bin/env python3
"""語彙カード のアイコンを作る（PIL だけ）。
青の地に、少し傾けた白い単語カード（左上にリングの穴）。カードのまん中に明朝の「語」。
python3 tools/goicard-icon.py → goicard/ にアイコン4枚と /tmp/goicard-icon-preview.png
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'goicard')
MINCHO = '/System/Library/Fonts/ヒラギノ明朝 ProN.ttc'
S = 1024
TOP, BOT = (44, 112, 222), (24, 76, 176)
WHITE = (255, 255, 255)
INK = (20, 28, 40)
HOLE = (34, 94, 200)


def draw(size=S, safe=1.0):
    im = Image.new('RGB', (size, size))
    px = im.load()
    for y in range(size):
        t = y / (size - 1)
        c = tuple(int(TOP[i] * (1 - t) + BOT[i] * t) for i in range(3))
        for x in range(size):
            px[x, y] = c
    k = size / S * safe
    cx, cy = size / 2, size / 2
    # カードは別の画像にかいて、少し傾けて重ねる
    cw, ch = int(700 * k), int(500 * k)
    card = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle([0, 0, cw - 1, ch - 1], radius=int(56 * k), fill=WHITE)
    r = int(34 * k)
    d.ellipse([int(56 * k), int(56 * k), int(56 * k) + 2 * r, int(56 * k) + 2 * r], fill=HOLE)
    f = ImageFont.truetype(MINCHO, int(330 * k), index=1)
    l, t, rr, b = d.textbbox((0, 0), '語', font=f, anchor='lt')
    d.text((cw / 2 - (l + rr) / 2, ch / 2 + 10 * k - (t + b) / 2), '語', font=f, fill=INK, anchor='lt')
    card = card.rotate(8, resample=Image.BICUBIC, expand=True)
    im.paste(card, (int(cx - card.width / 2), int(cy - card.height / 2)), card)
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    big = draw()
    big.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, 'apple-touch-icon.png'))
    big.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'icon-192.png'))
    big.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'))
    draw(safe=0.78).resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-maskable.png'))
    big.resize((256, 256), Image.LANCZOS).save('/tmp/goicard-icon-preview.png')
    print('ok')


if __name__ == '__main__':
    main()
