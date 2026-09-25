#!/usr/bin/env python3
"""古文単語350 のアイコンを作る（PIL だけ）。
藍の地に、生成りの「古」を明朝で大きく。右下に朱の落款「三五〇」。
python3 tools/kobun-icon.py → kobun/ にアイコン4枚と /tmp/kobun-icon-preview.png
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'kobun')
MIN = '/System/Library/Fonts/ヒラギノ明朝 ProN.ttc'

S = 1024
INDIGO_TOP = (38, 52, 96)
INDIGO_BOT = (22, 30, 58)
PAPER = (246, 239, 224)
SHU = (196, 64, 44)


def draw(size=S, safe=1.0):
    im = Image.new('RGB', (size, size))
    px = im.load()
    for y in range(size):
        t = y / (size - 1)
        c = tuple(int(INDIGO_TOP[i] * (1 - t) + INDIGO_BOT[i] * t) for i in range(3))
        for x in range(size):
            px[x, y] = c
    noise = Image.effect_noise((size, size), 18).convert('L')
    im = Image.blend(im, Image.merge('RGB', (noise, noise, noise)), 0.035)

    d = ImageDraw.Draw(im)
    k = size / S * safe
    cx, cy = size / 2, size / 2
    # 「古」
    f = ImageFont.truetype(MIN, int(640 * k), index=1)  # W6
    d.text((cx - 40 * k, cy - 30 * k), '古', font=f, fill=PAPER, anchor='mm')
    # 落款（朱の角印）
    w = 250 * k
    x0, y0 = cx + 170 * k, cy + 170 * k
    seal = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(seal)
    sd.rounded_rectangle([x0, y0, x0 + w, y0 + w], radius=int(22 * k), fill=SHU + (255,))
    sf = ImageFont.truetype(MIN, int(88 * k), index=1)
    sd.text((x0 + w / 2, y0 + w * 0.30), '三五', font=sf, fill=PAPER, anchor='mm')
    sd.text((x0 + w / 2, y0 + w * 0.70), '〇語', font=sf, fill=PAPER, anchor='mm')
    im = im.convert('RGBA')
    im.alpha_composite(seal)
    return im.convert('RGB')


def main():
    big = draw()
    big.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'))
    big.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'icon-192.png'))
    big.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, 'apple-touch-icon.png'))
    draw(safe=0.8).resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-maskable.png'))
    # 並べて確認
    sizes = [180, 110, 72, 48]
    pv = Image.new('RGB', (sum(sizes) + 40 * 5, 220), (240, 240, 240))
    x = 40
    for s in sizes:
        pv.paste(big.resize((s, s), Image.LANCZOS), (x, 20))
        x += s + 40
    pv.save('/tmp/kobun-icon-preview.png')


if __name__ == '__main__':
    main()
