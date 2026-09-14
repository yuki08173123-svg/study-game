# ミスマップのアイコン
# 考え方（2026-09-14 ユーザーの見本にそろえた）:
#   炭色の地に金のふち。左上に銅の✕、そこから金の矢印が弧を描いて、右下の大きな金のチェックへ。
#   「ミスが、できるに変わる」という流れをそのまま形にしたもの。
#   金属に見せるため、面はグラデーション、縁は上左に明るい線・下右に暗い線（ベベル）、下に影を敷く。
import math
from PIL import Image, ImageDraw, ImageFilter, ImageChops

SS = 4  # なめらかにするための拡大率

# --- 色 ---
BG_HI = (0x4A, 0x49, 0x45)   # 地のあかるいところ
BG_LO = (0x1F, 0x1F, 0x1E)   # 地のくらいところ
GOLD = [(0.00, (0xFF, 0xF7, 0xDC)), (0.16, (0xF3, 0xDC, 0x9C)),
        (0.42, (0xDD, 0xB4, 0x66)), (0.72, (0xB3, 0x88, 0x3A)),
        (1.00, (0x74, 0x53, 0x1B))]
COPPER = [(0.00, (0xF0, 0xC0, 0xA2)), (0.18, (0xDB, 0x99, 0x72)),
          (0.48, (0xBB, 0x74, 0x50)), (0.78, (0x93, 0x52, 0x35)),
          (1.00, (0x5C, 0x2F, 0x1E))]
RIM = [(0.00, (0xFF, 0xF2, 0xC8)), (0.30, (0xE2, 0xBE, 0x74)),
       (0.66, (0xA8, 0x80, 0x36)), (1.00, (0x63, 0x47, 0x18))]


def ramp(stops, t):
    t = max(0.0, min(1.0, t))
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        if t0 <= t <= t1:
            u = 0 if t1 == t0 else (t - t0) / (t1 - t0)
            return tuple(int(round(c0[j] + (c1[j] - c0[j]) * u)) for j in range(3))
    return stops[-1][1]


def grad_img(W, H, stops, ang=45, lo=112):
    """斜めのグラデーション。小さく作って引きのばす（速いし、金属はなめらかな方がよい）"""
    g = Image.new('RGB', (lo, lo))
    px = g.load()
    a = math.radians(ang)
    dx, dy = math.cos(a), math.sin(a)
    n = abs(dx) + abs(dy)
    for y in range(lo):
        for x in range(lo):
            t = ((x / (lo - 1)) * dx + (y / (lo - 1)) * dy) / n
            px[x, y] = ramp(stops, t)
    return g.resize((max(1, W), max(1, H)), Image.BICUBIC)


def shift(m, dx, dy):
    # ImageChops.offset は反対のふちから回りこんでしまい、角にすじが出る
    out = Image.new('L', m.size, 0)
    out.paste(m, (dx, dy))
    return out


def metal(S, mask, stops, ang=48, bevel=None, shadow=None, hi_col=(255, 246, 214)):
    """マスクの形を金属に見せる。bevel=(幅, 明るさ, 暗さ), shadow=(ずらし, ぼかし, 濃さ)"""
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    if shadow:
        off, blur, op = shadow
        sm = mask.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * op))
        sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        sh.paste(Image.new('RGBA', (S, S), (10, 8, 6, 255)), (0, off), sm)
        out = Image.alpha_composite(out, sh)
    # 光の当たり方は「形ごと」に作る。画面全体で1つにすると、
    # 小さい形には色の幅の一部しか乗らず、のっぺりした樹脂のように見えるため。
    bb = mask.getbbox() or (0, 0, S, S)
    gw, gh = bb[2] - bb[0], bb[3] - bb[1]
    canvas = Image.new('RGB', (S, S), stops[-1][1])
    canvas.paste(grad_img(gw, gh, stops, ang), (bb[0], bb[1]))
    body = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    body.paste(canvas, (0, 0), mask)
    out = Image.alpha_composite(out, body)
    if bevel:
        bw, hi, dk = bevel
        inner = mask.filter(ImageFilter.MinFilter(3))
        for _ in range(max(0, bw - 1)):
            inner = inner.filter(ImageFilter.MinFilter(3))
        # 上左の明るいふち
        edge_hi = ImageChops.subtract(mask, shift(inner, bw, bw))
        edge_hi = ImageChops.multiply(edge_hi, mask).filter(ImageFilter.GaussianBlur(bw * 0.16))
        lay = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        lay.paste(Image.new('RGBA', (S, S), hi_col + (255,)),
                  (0, 0), edge_hi.point(lambda v: int(v * hi)))
        out = Image.alpha_composite(out, lay)
        # 下右の暗いふち
        edge_dk = ImageChops.subtract(mask, shift(inner, -bw, -bw))
        edge_dk = ImageChops.multiply(edge_dk, mask).filter(ImageFilter.GaussianBlur(bw * 0.16))
        lay = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        lay.paste(Image.new('RGBA', (S, S), (40, 24, 6, 255)),
                  (0, 0), edge_dk.point(lambda v: int(v * dk)))
        out = Image.alpha_composite(out, lay)
    return out


def cross_mask(S, k, cx, cy, arm, w):
    m = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(m)
    for dx, dy in ((1, 1), (1, -1)):
        d.line([cx - arm * dx, cy - arm * dy, cx + arm * dx, cy + arm * dy], fill=255, width=int(w))
        for s in (-1, 1):
            px, py = cx + arm * dx * s, cy + arm * dy * s
            d.ellipse([px - w / 2, py - w / 2, px + w / 2, py + w / 2], fill=255)
    return m


def check_mask(S, k, pts, w):
    m = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(m)
    d.line(pts, fill=255, width=int(w), joint='curve')
    for p in (pts[0], pts[-1]):
        d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=255)
    return m


def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return (u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1])


def arrow_mask(S, k, p0, p1, p2, p3, w0, w1, head):
    """細くはじまり太くなる弧＋矢じり"""
    m = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(m)
    N = 420
    for i in range(N + 1):
        t = i / N
        x, y = bez(p0, p1, p2, p3, t)
        w = w0 + (w1 - w0) * (t ** 0.85)
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=255)
    # 矢じり
    a, b = bez(p0, p1, p2, p3, 0.965), bez(p0, p1, p2, p3, 1.0)
    ang = math.atan2(b[1] - a[1], b[0] - a[0])
    tip = (b[0] + math.cos(ang) * head * 0.95, b[1] + math.sin(ang) * head * 0.95)
    for s in (1, -1):
        e = ang + s * math.radians(140)
        d.polygon([tip, (b[0] + math.cos(e) * head, b[1] + math.sin(e) * head),
                   (b[0] - math.cos(ang) * head * 0.18, b[1] - math.sin(ang) * head * 0.18)], fill=255)
    return m


def make(size, maskable=False):
    S = size * SS
    k = S / 1000.0
    sc = 0.76 if maskable else 1.0
    P = lambda v: (500 + (v - 500) * sc) * k
    Q = lambda v: v * sc * k

    # --- 地 ---
    shape = Image.new('L', (S, S), 0)
    sd = ImageDraw.Draw(shape)
    if maskable:
        sd.rectangle([0, 0, S, S], fill=255)
    else:
        sd.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(232 * k), fill=255)

    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ground = grad_img(S, S, [(0.0, BG_HI), (0.45, (0x35, 0x35, 0x32)), (1.0, BG_LO)], 55)
    img.paste(ground, (0, 0), shape)
    # ざらつき（革のような手ざわり）
    noise = Image.effect_noise((S, S), 26).filter(ImageFilter.GaussianBlur(0.6 * k))
    tex = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    tex.paste(Image.new('RGBA', (S, S), (255, 255, 255, 255)),
              (0, 0), ImageChops.multiply(noise.point(lambda v: max(0, v - 118)), shape).point(lambda v: int(v * 0.16)))
    img = Image.alpha_composite(img, tex)
    tex = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    tex.paste(Image.new('RGBA', (S, S), (0, 0, 0, 255)),
              (0, 0), ImageChops.multiply(noise.point(lambda v: max(0, 118 - v)), shape).point(lambda v: int(v * 0.16)))
    img = Image.alpha_composite(img, tex)

    # --- 金のふち ---
    if not maskable:
        rw = 19 * k
        outer = shape
        inner = Image.new('L', (S, S), 0)
        ImageDraw.Draw(inner).rounded_rectangle([rw, rw, S - 1 - rw, S - 1 - rw],
                                                radius=int(232 * k - rw), fill=255)
        rim = ImageChops.subtract(outer, inner)
        img = Image.alpha_composite(img, metal(S, rim, RIM, 50, hi_col=(255, 243, 204), bevel=(max(2, int(4 * k)), 0.6, 0.55)))

    # --- ✕（銅） ---
    xm = cross_mask(S, k, P(262), P(248), Q(88), Q(58))
    img = Image.alpha_composite(img, metal(S, xm, COPPER, 48, hi_col=(255, 206, 172),
                                           bevel=(max(2, int(8 * k)), 0.45, 0.52),
                                           shadow=(int(10 * k), 11 * k, 0.5)))

    # --- 矢印（金） ---
    am = arrow_mask(S, k,
                    (P(356), P(262)), (P(556), P(268)), (P(652), P(396)), (P(612), P(566)),
                    Q(15), Q(38), Q(60))
    img = Image.alpha_composite(img, metal(S, am, GOLD, 60, hi_col=(255, 244, 206),
                                           bevel=(max(2, int(6 * k)), 0.52, 0.48),
                                           shadow=(int(9 * k), 10 * k, 0.45)))

    # --- チェック（金） ---
    cm = check_mask(S, k, [(P(424), P(654)), (P(558), P(792)), (P(856), P(452))], Q(112))
    img = Image.alpha_composite(img, metal(S, cm, GOLD, 52, hi_col=(255, 244, 206),
                                           bevel=(max(2, int(10 * k)), 0.6, 0.55),
                                           shadow=(int(13 * k), 14 * k, 0.55)))

    img.putalpha(shape)
    return img.resize((size, size), Image.LANCZOS)


for sz, name in ((512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')):
    make(sz).save('missmap/' + name)
make(512, True).save('missmap/icon-maskable.png')

prev = Image.new('RGB', (560, 200), (0xEE, 0xEC, 0xE8))
for i, s in enumerate((160, 110, 72, 48)):
    ic = make(s)
    prev.paste(ic, (30 + i * 135, 100 - s // 2), ic)
prev.save('/tmp/missmap-icon-preview.png')
print('ok')
