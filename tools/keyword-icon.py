# Keyword のアイコン：黒の地に、シャンパンゴールドのアンティークの鍵（v3〜・ヒラ「もう少し高級感がある鍵に」）。
# 持ち手は四つ葉の透かし、軸に飾りの輪、先に歯。金属の照りは横方向のグラデーション＋縁の光と影。
# 実行: python3 tools/keyword-icon.py （study-game から）。keyword/ に書き出す。
from PIL import Image, ImageDraw, ImageFilter, ImageChops

Z = 2048            # 2倍で描いて縮める（縁をなめらかに）
U = Z / 1024


def u(v):
    return v * U


def key_mask(sc):
    m = Image.new('L', (Z, Z), 0)
    d = ImageDraw.Draw(m)
    c = Z / 2

    def P(x, y):
        return (c + (u(x) - c) * sc, c + (u(y) - c) * sc)

    def circ(x, y, r, fill):
        (a, b), rr = P(x, y), u(r) * sc
        d.ellipse([a - rr, b - rr, a + rr, b + rr], fill=fill)

    def rect(x0, y0, x1, y1, fill, r=0):
        a, b = P(x0, y0); e, f = P(x1, y1)
        d.rounded_rectangle([a, b, e, f], u(r) * sc, fill=fill)

    # 持ち手（輪）
    circ(512, 318, 178, 255)
    # 四つ葉の透かし
    for dx, dy in ((0, -52), (0, 52), (-52, 0), (52, 0)):
        circ(512 + dx, 318 + dy, 58, 0)
    circ(512, 318, 40, 0)
    # 首の飾り（輪を2つ）
    rect(452, 488, 572, 520, 255, 14)
    rect(470, 534, 554, 556, 255, 10)
    # 軸
    rect(487, 480, 537, 880, 255, 10)
    # 先の歯（板に切れこみ）
    rect(512, 748, 664, 872, 255, 8)
    rect(624, 776, 666, 800, 0)          # 右の切れこみ（上）
    rect(624, 826, 666, 846, 0)          # 右の切れこみ（下）
    rect(566, 850, 598, 874, 0)          # 下の切れこみ
    # 軸の先の丸み
    circ(512, 876, 25, 255)
    return m


def metal(size):
    # 横方向に明暗の帯をくり返す（シャンパンゴールド）
    stops = [(0.00, (120, 88, 40)), (0.18, (232, 205, 140)), (0.34, (170, 130, 62)),
             (0.50, (255, 240, 198)), (0.66, (190, 150, 78)), (0.82, (240, 214, 150)),
             (1.00, (128, 94, 42))]
    g = Image.new('RGB', (size, 1))
    for x in range(size):
        t = x / (size - 1)
        for (a, ca), (b, cb) in zip(stops, stops[1:]):
            if a <= t <= b:
                k = (t - a) / (b - a)
                g.putpixel((x, 0), tuple(int(ca[i] + (cb[i] - ca[i]) * k) for i in range(3)))
                break
    g = g.resize((size, size))
    # 上を明るく、下を少し暗く
    v = Image.linear_gradient('L').resize((size, size))
    dark = Image.new('RGB', (size, size), (70, 50, 20))
    return Image.composite(dark, g, v.point(lambda p: int(p * 0.35)))


def background(sc_ring):
    bg = Image.new('RGB', (Z, Z), (6, 6, 7))
    # 中央をほんのり明るく
    glow = Image.radial_gradient('L').resize((Z, Z))
    lift = Image.new('RGB', (Z, Z), (34, 32, 30))
    bg = Image.composite(bg, lift, glow)
    d = ImageDraw.Draw(bg)
    c, r = Z / 2, u(440) * sc_ring
    d.ellipse([c - r, c - r, c + r, c + r], outline=(92, 74, 40), width=int(u(3)))
    r2 = r - u(14) * sc_ring
    d.ellipse([c - r2, c - r2, c + r2, c + r2], outline=(52, 44, 28), width=int(u(2)))
    return bg


def make(full=True):
    sc = 1.0 if full else 0.8
    im = background(sc)
    m = key_mask(sc)
    # 影
    sh = m.filter(ImageFilter.GaussianBlur(u(18)))
    sh = ImageChops.offset(sh, int(u(10)), int(u(16))).point(lambda p: int(p * 0.75))
    im = Image.composite(Image.new('RGB', (Z, Z), (0, 0, 0)), im, sh)
    # 金属
    im.paste(metal(Z), (0, 0), m)
    # 縁の光（左上）と影（右下）
    hi = ImageChops.subtract(m, ImageChops.offset(m, int(u(4)), int(u(4)))).filter(ImageFilter.GaussianBlur(u(1.5)))
    lo = ImageChops.subtract(m, ImageChops.offset(m, -int(u(5)), -int(u(5)))).filter(ImageFilter.GaussianBlur(u(2)))
    im = Image.composite(Image.new('RGB', (Z, Z), (255, 246, 214)), im, hi.point(lambda p: int(p * 0.85)))
    im = Image.composite(Image.new('RGB', (Z, Z), (74, 52, 20)), im, lo.point(lambda p: int(p * 0.8)))
    return im


full = make(True)
mask = make(False)
for size, name, im in [(512, 'icon-512.png', full), (192, 'icon-192.png', full),
                       (180, 'apple-touch-icon.png', full), (512, 'icon-maskable.png', mask)]:
    im.resize((size, size), Image.LANCZOS).save('keyword/' + name)
