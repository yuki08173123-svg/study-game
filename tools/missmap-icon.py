# ミスマップのアイコン
# 考え方: 「ミスマップであること」は捨てない。表に並んだミスが、○に変わる形。
#   ただし紙・罫線・細かい行といった、小さくすると潰れて安く見える要素はやめる。
#   行は2つだけ（ミスの行と、極まった行）。濃紺の地に、金の丸だけを主役にする。
#   3行案も試したが、48px で✕がつぶれて読めなかったので2行にした。
import math
from PIL import Image, ImageDraw, ImageFilter

SS = 4  # なめらかにするための拡大率

BG1 = (0x1C, 0x30, 0x68)     # 左上（明るい紺）
BG2 = (0x07, 0x0C, 0x1E)     # 右下（暗い紺）
MARK = (0x56, 0x72, 0xBC)    # まだミスのままの✕
BAR = (0x33, 0x47, 0x82)     # 書きこみを表す線
BAR_ON = (0x82, 0x98, 0xD4)  # 極まった行の線
GOLD_L = (0xF2, 0xE0, 0xAE)  # 丸の書きはじめ
GOLD_D = (0xBE, 0x94, 0x42)  # 丸の書きおわり
EDGE = (0xD8, 0xBB, 0x6E)    # ふちの細い金


def grad(size, c1, c2):
    g = Image.new('RGB', (64, 64))
    px = g.load()
    for y in range(64):
        for x in range(64):
            t = (x + y) / 126
            px[x, y] = tuple(int(round(c1[i] + (c2[i] - c1[i]) * t)) for i in range(3))
    return g.resize(size, Image.BICUBIC)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def hand_circle(draw, cx, cy, rx, ry, rot, w0, color_at, steps=760):
    """丸付けの○。太さが変わる一筆で、少しだけ書きすぎて閉じる。"""
    rot = math.radians(rot)
    t0 = math.radians(-115)
    t1 = t0 + math.radians(381)
    for i in range(steps + 1):
        t = i / steps
        a = t0 + (t1 - t0) * t
        wob = 1 + 0.013 * math.sin(a * 3 + 0.7)
        x, y = rx * wob * math.cos(a), ry * wob * math.sin(a)
        px = cx + x * math.cos(rot) - y * math.sin(rot)
        py = cy + x * math.sin(rot) + y * math.cos(rot)
        w = w0 * (0.44 + 0.56 * math.sin(math.pi * min(1.0, t * 1.05)) ** 0.55)
        r = max(0.6, w / 2)
        draw.ellipse([px - r, py - r, px + r, py + r], fill=color_at(t))


def cross(draw, cx, cy, arm, w, color):
    for dx, dy in ((1, 1), (1, -1)):
        draw.line([cx - arm * dx, cy - arm * dy, cx + arm * dx, cy + arm * dy],
                  fill=color + (255,), width=int(w))
        for sx in (-1, 1):
            px, py = cx + arm * dx * sx, cy + arm * dy * sx
            draw.ellipse([px - w / 2, py - w / 2, px + w / 2, py + w / 2], fill=color + (255,))


def bar(draw, x0, x1, y, h, color):
    draw.rounded_rectangle([x0, y - h / 2, x1, y + h / 2], radius=h / 2, fill=color + (255,))


def make(size, maskable=False):
    S = size * SS
    k = S / 1000.0
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    img.paste(grad((S, S), BG1, BG2), (0, 0))

    # 左上のやわらかい光
    glow = Image.new('L', (S, S), 0)
    ImageDraw.Draw(glow).ellipse([-0.3 * S, -0.5 * S, 0.8 * S, 0.5 * S], fill=42)
    glow = glow.filter(ImageFilter.GaussianBlur(0.24 * S))
    img = Image.composite(Image.new('RGBA', (S, S), (0x4A, 0x6B, 0xC0, 255)), img, glow)

    m = Image.new('L', (S, S), 0)
    md = ImageDraw.Draw(m)
    if maskable:
        md.rectangle([0, 0, S, S], fill=255)
    else:
        md.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(224 * k), fill=255)
    img.putalpha(m)

    sc = 0.78 if maskable else 1.0
    def P(v):
        return (500 + (v - 500) * sc) * k

    lay = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    L = ImageDraw.Draw(lay)

    # ふちの細い金（カードのような品を出す。控えめに）
    if not maskable:
        ins = 74 * k
        L.rounded_rectangle([ins, ins, S - ins, S - ins], radius=int(168 * k),
                            outline=EDGE + (46,), width=max(1, int(3.4 * k)))

    # 2行。上がミスのままの行、下が○に変わった行。
    rows = [
        (375, 300, MARK, BAR),
        (605, 268, None, BAR_ON),
    ]
    arm = 66 * sc * k
    wx = 32 * sc * k
    mx = P(322)
    bx0 = P(430)
    for ry_, blen, mcol, bcol in rows:
        y = P(ry_)
        bar(L, bx0, P(430 + blen), y, 36 * sc * k, bcol)
        if mcol:
            cross(L, mx, y, arm, wx, mcol)

    img = Image.alpha_composite(img, lay)

    # 主役の○（いちばん下の行）
    ring = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    R = ImageDraw.Draw(ring)
    hand_circle(R, mx, P(605), 116 * sc * k, 110 * sc * k, -8, 38 * sc * k,
                lambda t: lerp(GOLD_L, GOLD_D, min(1.0, t * 1.15)) + (255,))
    sh = ring.split()[3].filter(ImageFilter.GaussianBlur(7 * k)).point(lambda v: int(v * 0.5))
    shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    shadow.paste(Image.new('RGBA', (S, S), (3, 6, 18, 255)), (0, int(6 * k)), sh)
    img = Image.alpha_composite(img, shadow)
    img = Image.alpha_composite(img, ring)

    img.putalpha(m)
    return img.resize((size, size), Image.LANCZOS)


for sz, name in ((512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')):
    make(sz).save('missmap/' + name)
make(512, True).save('missmap/icon-maskable.png')
# ホーム画面の見え方を確かめる用（小さく並べる）
prev = Image.new('RGB', (520, 150), (0x16, 0x18, 0x1D))
for i, s in enumerate((120, 90, 60, 40)):
    ic = make(s)
    prev.paste(ic, (30 + i * 130, 75 - s // 2), ic)
prev.save('/tmp/missmap-icon-preview.png')
print('ok')
