# マップ返信のアイコン：紺の背景＋白いテストマップ（表の線）＋オレンジの吹き出し
from PIL import Image, ImageDraw
S = 1024
def make(pad):
    im = Image.new('RGB', (S, S), (31, 58, 95))
    d = ImageDraw.Draw(im)
    for y in range(S):
        k = y / S
        d.line([(0, y), (S, y)], fill=(int(28 + 14 * k), int(52 + 22 * k), int(88 + 30 * k)))
    p = pad
    x0, y0, x1, y1 = 170 + p, 200 + p, 760 - p, 800 - p
    d.rounded_rectangle([x0 + 14, y0 + 18, x1 + 14, y1 + 18], 36, fill=(16, 30, 52))
    d.rounded_rectangle([x0, y0, x1, y1], 36, fill=(250, 248, 243))
    # 見出しの帯
    d.rectangle([x0 + 44, y0 + 50, x1 - 44, y0 + 100], fill=(31, 58, 95))
    # 表の線（教科ごとの段）
    w = x1 - x0
    for i in range(5):
        yy = y0 + 150 + i * 82
        d.line([(x0 + 44, yy), (x1 - 44, yy)], fill=(160, 152, 140), width=8)
        d.line([(x0 + 44, yy), (x0 + 44, yy + 82)], fill=(160, 152, 140), width=8)
        d.line([(x0 + 150, yy), (x0 + 150, yy + 82)], fill=(160, 152, 140), width=6)
        # 線で消したタスク
        if i < 3:
            d.line([(x0 + 180, yy + 42), (x0 + 180 + int((w - 280) * (0.8 - i * 0.15)), yy + 42)], fill=(217, 98, 43), width=10)
    d.line([(x0 + 44, y0 + 560), (x1 - 44, y0 + 560)], fill=(160, 152, 140), width=8)
    # 吹き出し
    cx, cy, r = x1 + 10, y1 - 30, 165 - p // 3
    d.ellipse([cx - r - 14, cy - r - 14, cx + r + 14, cy + r + 14], fill=(250, 248, 243))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(217, 98, 43))
    d.polygon([(cx - r * 0.75, cy + r * 0.45), (cx - r * 1.15, cy + r * 1.05), (cx - r * 0.25, cy + r * 0.8)], fill=(217, 98, 43))
    for j in range(3):
        dx = (j - 1) * r * 0.45
        rr = r * 0.13
        d.ellipse([cx + dx - rr, cy - rr, cx + dx + rr, cy + rr], fill=(255, 255, 255))
    return im
base = make(0)
base.resize((192, 192), Image.LANCZOS).save('icon-192-v1.png')
base.resize((512, 512), Image.LANCZOS).save('icon-512-v1.png')
base.resize((180, 180), Image.LANCZOS).save('apple-touch-icon-v1.png')
make(80).resize((512, 512), Image.LANCZOS).save('icon-maskable-v1.png')
print('ok')
