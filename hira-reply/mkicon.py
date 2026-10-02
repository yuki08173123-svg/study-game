# ヒラ返信のアイコン：紺の背景＋白い吹き出し（返信）＋中に赤ペンの線3本と朱の丸
from PIL import Image, ImageDraw
S = 1024
def make(pad):
    im = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(im)
    for y in range(S):
        k = y / S
        d.line([(0, y), (S, y)], fill=(int(24 + 14 * k), int(46 + 22 * k), int(82 + 34 * k)))
    p = pad
    x0, y0, x1, y1 = 170 + p, 220 + p, 854 - p, 720 - p
    d.rounded_rectangle([x0 + 12, y0 + 16, x1 + 12, y1 + 16], 90, fill=(12, 24, 46))
    d.rounded_rectangle([x0, y0, x1, y1], 90, fill=(255, 255, 255))
    # 吹き出しのしっぽ（左下）
    d.polygon([(x0 + 120, y1 - 10), (x0 + 60, y1 + 150 - p // 2), (x0 + 260, y1 - 10)], fill=(255, 255, 255))
    w = x1 - x0
    for i, frac in enumerate([0.74, 0.58, 0.40]):
        yy = y0 + 110 + i * 105
        d.rounded_rectangle([x0 + 80, yy, x0 + 80 + int((w - 160) * frac), yy + 46], 23, fill=(31, 58, 95))
    # 朱の丸（はなまる風）
    cx, cy, r = x1 - 150, y1 - 140, 92 - p // 4
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(200, 60, 44), width=34)
    return im
base = make(0)
base.resize((192, 192), Image.LANCZOS).save('icon-192-v1.png')
base.resize((512, 512), Image.LANCZOS).save('icon-512-v1.png')
base.resize((180, 180), Image.LANCZOS).save('apple-touch-icon-v1.png')
make(80).resize((512, 512), Image.LANCZOS).save('icon-maskable-v1.png')
print('ok')
