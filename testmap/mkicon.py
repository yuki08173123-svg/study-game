# テストマップのアイコン：えんじの背景＋白い用紙（タスクの表）＋右下に的（ゴール）
from PIL import Image, ImageDraw
S = 1024
def make(pad):
    im = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(im)
    for y in range(S):
        k = y / S
        d.line([(0, y), (S, y)], fill=(int(170 - 30 * k), int(52 - 12 * k), int(44 - 8 * k)))
    p = pad
    x0, y0, x1, y1 = 190 + p, 200 + p, 834 - p, 810 - p
    d.rounded_rectangle([x0 + 14, y0 + 18, x1 + 14, y1 + 18], 40, fill=(90, 22, 18))
    d.rounded_rectangle([x0, y0, x1, y1], 40, fill=(255, 255, 255))
    ink = (40, 26, 26)
    w = x1 - x0
    # タスクの行：〇と線（上2つは完了＝ぬりつぶし＋横線）
    for i in range(4):
        yy = y0 + 80 + i * 105
        cx = x0 + 80
        r = 26
        if i < 2:
            d.ellipse([cx - r, yy - r, cx + r, yy + r], fill=ink)
        else:
            d.ellipse([cx - r, yy - r, cx + r, yy + r], outline=ink, width=9)
        lx0, lx1 = cx + 56, x0 + int(w * (0.82 if i % 2 == 0 else 0.68))
        d.rounded_rectangle([lx0, yy - 14, lx1, yy + 14], 14, fill=(214, 206, 203))
        if i < 2:
            d.line([(lx0 - 6, yy), (lx1 + 6, yy)], fill=ink, width=8)
    # 的（ゴール）
    mx, my = x1 - 40, y1 - 50
    R = 150 - p // 3
    red = (163, 48, 42)
    for k, c in [(R + 18, (255, 255, 255)), (R, red), (R * 0.68, (255, 255, 255)), (R * 0.38, red)]:
        d.ellipse([mx - k, my - k, mx + k, my + k], fill=c)
    return im
base = make(0)
base.resize((192, 192), Image.LANCZOS).save('icon-192-v2.png')
base.resize((512, 512), Image.LANCZOS).save('icon-512-v2.png')
base.resize((180, 180), Image.LANCZOS).save('apple-touch-icon-v2.png')
make(80).resize((512, 512), Image.LANCZOS).save('icon-maskable-v2.png')
print('ok')
