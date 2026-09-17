# 報告レビューのアイコン：紺のグラデ背景＋白い報告用紙＋金の丸に赤ペンのチェック
from PIL import Image, ImageDraw
S = 1024
def make(pad):
    im = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(im)
    for y in range(S):
        k = y / S
        d.line([(0, y), (S, y)], fill=(int(28 + 10 * k), int(58 + 30 * k), int(120 + 60 * k)))
    p = pad
    x0, y0, x1, y1 = 250 + p, 190 + p, 774 - p, 834 - p
    d.rounded_rectangle([x0 + 14, y0 + 18, x1 + 14, y1 + 18], 48, fill=(16, 34, 72))
    d.rounded_rectangle([x0, y0, x1, y1], 48, fill=(255, 255, 255))
    d.rounded_rectangle([x0 + 50, y0 + 60, x1 - 50, y0 + 110], 20, fill=(44, 111, 228))
    w = x1 - x0
    for i, frac in enumerate([0.78, 0.62, 0.70, 0.5]):
        yy = y0 + 170 + i * 84
        d.rounded_rectangle([x0 + 50, yy, x0 + 50 + int((w - 100) * frac), yy + 30], 15, fill=(205, 216, 232))
    # 金の丸＋チェック
    cx, cy, r = x1 - 40, y1 - 50, 150 - p // 3
    d.ellipse([cx - r - 12, cy - r - 12, cx + r + 12, cy + r + 12], fill=(255, 255, 255))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(228, 176, 58))
    d.line([(cx - r * 0.48, cy + r * 0.02), (cx - r * 0.12, cy + r * 0.38), (cx + r * 0.52, cy - r * 0.36)], fill=(255, 255, 255), width=int(r * 0.24), joint='curve')
    return im
base = make(0)
base.resize((192, 192), Image.LANCZOS).save('icon-192-v1.png')
base.resize((512, 512), Image.LANCZOS).save('icon-512-v1.png')
base.resize((180, 180), Image.LANCZOS).save('apple-touch-icon-v1.png')
make(70).resize((512, 512), Image.LANCZOS).save('icon-maskable-v1.png')
print('ok')
