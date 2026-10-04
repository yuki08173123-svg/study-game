# 分析マップのアイコン：深い緑青の背景＋白い用紙（表と▼）＋朱の虫めがね
from PIL import Image, ImageDraw
S = 1024
def make(pad):
    im = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(im)
    for y in range(S):
        k = y / S
        d.line([(0, y), (S, y)], fill=(int(12 + 14 * k), int(70 + 24 * k), int(76 + 26 * k)))
    p = pad
    x0, y0, x1, y1 = 200 + p, 220 + p, 824 - p, 800 - p
    d.rounded_rectangle([x0 + 14, y0 + 18, x1 + 14, y1 + 18], 40, fill=(6, 40, 44))
    d.rounded_rectangle([x0, y0, x1, y1], 40, fill=(255, 255, 255))
    w = x1 - x0; h = y1 - y0
    ink = (24, 40, 44)
    # 上の表
    tx0, ty0, tx1, ty1 = x0 + 50, y0 + 50, x1 - 50, y0 + int(h * 0.42)
    d.rectangle([tx0, ty0, tx1, ty1], outline=ink, width=10)
    for i in range(1, 3):
        yy = ty0 + (ty1 - ty0) * i // 3
        d.line([(tx0, yy), (tx1, yy)], fill=ink, width=6)
    for i in range(1, 4):
        xx = tx0 + (tx1 - tx0) * i // 4
        d.line([(xx, ty0), (xx, ty1)], fill=ink, width=6)
    # 灰色の列（取れた失点）
    gx0 = tx0 + (tx1 - tx0) * 2 // 4; gx1 = tx0 + (tx1 - tx0) * 3 // 4
    d.rectangle([gx0 + 4, ty0 + (ty1 - ty0) // 3 + 4, gx1 - 3, ty1 - 5], fill=(200, 208, 210))
    # ▼
    cx = (x0 + x1) // 2; ty = ty1 + 30
    d.polygon([(cx - 46, ty), (cx + 46, ty), (cx, ty + 56)], fill=ink)
    # 下の行
    for i, frac in enumerate([0.72, 0.5]):
        yy = ty + 100 + i * 70
        d.rounded_rectangle([x0 + 50, yy, x0 + 50 + int((w - 100) * frac), yy + 28], 14, fill=(205, 214, 216))
    # 朱の虫めがね
    mx, my, r = x1 - 40, y1 - 70, 120 - p // 4
    d.line([(mx + r * 0.7, my + r * 0.7), (mx + r * 1.5, my + r * 1.5)], fill=(255, 255, 255), width=int(r * 0.62))
    d.line([(mx + r * 0.7, my + r * 0.7), (mx + r * 1.45, my + r * 1.45)], fill=(214, 84, 52), width=int(r * 0.42))
    d.ellipse([mx - r - 16, my - r - 16, mx + r + 16, my + r + 16], fill=(255, 255, 255))
    d.ellipse([mx - r, my - r, mx + r, my + r], fill=(214, 84, 52))
    d.ellipse([mx - r * 0.66, my - r * 0.66, mx + r * 0.66, my + r * 0.66], fill=(255, 255, 255))
    d.line([(mx - r * 0.36, my + r * 0.02), (mx - r * 0.08, my + r * 0.3), (mx + r * 0.4, my - r * 0.28)], fill=(214, 84, 52), width=int(r * 0.17), joint='curve')
    return im
base = make(0)
base.resize((192, 192), Image.LANCZOS).save('icon-192-v1.png')
base.resize((512, 512), Image.LANCZOS).save('icon-512-v1.png')
base.resize((180, 180), Image.LANCZOS).save('apple-touch-icon-v1.png')
make(80).resize((512, 512), Image.LANCZOS).save('icon-maskable-v1.png')
print('ok')
