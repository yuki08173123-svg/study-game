# 自習室のアイコン：夜の紺色に、灯りのともった机のスタンド。灯りの下がふんわり明るい。
# 実行: python3 tools/jishu-icon.py （study-game から）。最後に /tmp/jishu-icon-preview.png で 160/110/72/48px を並べる。
from PIL import Image, ImageDraw, ImageFilter

S = 1024
NAVY = (20, 26, 40)
NAVY_D = (12, 15, 24)
LAMP = (242, 178, 74)
GLOW = (255, 205, 120)
DESK = (120, 84, 46)


def make(full=True):
    im = Image.new('RGB', (S, S), NAVY)
    d = ImageDraw.Draw(im)
    for y in range(S):
        k = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(NAVY[i] * (1 - k) + NAVY_D[i] * k) for i in range(3)))
    sc = 1.18 if full else 0.88
    cx = S / 2
    def P(x, y):   # 中心からの位置を、縮めたいときは縮める
        return (cx + (x - cx) * sc, S / 2 + (y - S / 2) * sc)

    # 灯りの下の光（台形に広がる光をぼかす）
    lt = Image.new('L', (S, S), 0)
    ImageDraw.Draw(lt).polygon([P(400, 470), P(624, 470), P(820, 760), P(204, 760)], fill=150)
    lt = lt.filter(ImageFilter.GaussianBlur(60))
    im.paste(GLOW, (0, 0), lt)
    # かさのまわりの光
    gl = Image.new('L', (S, S), 0)
    x0, y0 = P(330, 210); x1, y1 = P(694, 560)
    ImageDraw.Draw(gl).ellipse([x0, y0, x1, y1], fill=120)
    gl = gl.filter(ImageFilter.GaussianBlur(70))
    im.paste(GLOW, (0, 0), gl)

    d = ImageDraw.Draw(im)
    w = int(34 * sc)
    # 机
    d.rounded_rectangle([*P(170, 760), *P(854, 800)], int(18 * sc), fill=DESK)
    # 柱
    d.rounded_rectangle([*P(cx - 17, 470), *P(cx + 17, 770)], int(14 * sc), fill=LAMP)
    # 台
    d.rounded_rectangle([*P(390, 740), *P(634, 772)], int(16 * sc), fill=LAMP)
    # かさ
    d.polygon([P(372, 480), P(652, 480), P(590, 270), P(434, 270)], fill=LAMP)
    d.rounded_rectangle([*P(434, 256), *P(590, 290)], int(14 * sc), fill=LAMP)
    # 電球
    bx, by = P(cx, 500)
    r = 30 * sc
    d.ellipse([bx - r, by - r, bx + r, by + r], fill=(255, 240, 200))
    return im


full = make(True)
mask = make(False)
for size, name, im in [(512, 'icon-512.png', full), (192, 'icon-192.png', full),
                       (180, 'apple-touch-icon.png', full), (512, 'icon-maskable.png', mask)]:
    im.resize((size, size), Image.LANCZOS).save('jishu/' + name)

pv = Image.new('RGB', (420, 180), (240, 240, 240))
x = 10
for s in (160, 110, 72, 48):
    pv.paste(full.resize((s, s), Image.LANCZOS), (x, 10))
    x += s + 10
pv.save('/tmp/jishu-icon-preview.png')
print('ok')
