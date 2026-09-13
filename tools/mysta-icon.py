# マイスタ のアイコン: 深い紫の背景 + 金の幾何学的な M(上にひし形)
from PIL import Image, ImageDraw, ImageFilter
import math, os

OUT = '/Users/hirayamayuuki/study-game/mysta'
SCR = '/private/tmp/claude-501/-Users-hirayamayuuki/48195ee0-b45d-4bd6-b3e5-c7b8be663f56/scratchpad'

def lerp(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(round(a[i] + (b[i]-a[i])*t)) for i in range(3))

def bg(S):
    small = 128
    im = Image.new('RGB', (small, small)); px = im.load()
    top = (0x3E, 0x1E, 0x7E); mid = (0x24, 0x10, 0x52); bot = (0x12, 0x08, 0x2A)
    for y in range(small):
        for x in range(small):
            t = (y*0.85 + x*0.15)/small
            col = lerp(top, mid, t/0.5) if t < 0.5 else lerp(mid, bot, (t-0.5)/0.5)
            dx = (x - small*0.5)/small; dy = (y - small*0.45)/small
            g = max(0.0, 1 - math.sqrt(dx*dx+dy*dy)*2.1)
            col = lerp(col, (0x6A, 0x42, 0xB4), g*0.4)
            px[x, y] = col
    return im.resize((S, S), Image.BICUBIC)

def gold(S):
    small = 64
    im = Image.new('RGB', (small, small)); px = im.load()
    g0 = (0xF6, 0xE2, 0xA8); g1 = (0xD9, 0xB6, 0x66); g2 = (0xA5, 0x7C, 0x36)
    for y in range(small):
        for x in range(small):
            t = (y/small)*0.8 + (x/small)*0.2
            px[x, y] = lerp(g0, g1, t/0.55) if t < 0.55 else lerp(g1, g2, (t-0.55)/0.45)
    return im.resize((S, S), Image.BICUBIC)

def m_masks(S):
    SS = 4; W = S*SS; k = S/1024*SS
    P = lambda x, y: (x*k, y*k)
    m = Image.new('L', (W, W), 0); d = ImageDraw.Draw(m)
    # M 本体
    d.polygon([P(190,330), P(300,330), P(512,590), P(724,330), P(834,330), P(834,790),
               P(724,790), P(724,500), P(512,760), P(300,500), P(300,790), P(190,790)], fill=255)
    # ひし形
    dm = Image.new('L', (W, W), 0); dd = ImageDraw.Draw(dm)
    dd.polygon([P(512,232), P(570,330), P(512,428), P(454,330)], fill=255)
    return m.resize((S, S), Image.LANCZOS), dm.resize((S, S), Image.LANCZOS)

def make(S, maskable=False):
    K = S/1024
    img = bg(S).convert('RGBA')
    gd = gold(S)
    m, dm = m_masks(S)
    both = Image.new('L', (S, S), 0); both.paste(m, (0, 0)); both.paste(255, (0, 0), dm)
    # 影
    sh = Image.new('RGBA', (S, S), (0x08, 0x03, 0x1C, 0)); sh.putalpha(both.filter(ImageFilter.GaussianBlur(int(12*K))).point(lambda v: int(v*0.7)))
    img.alpha_composite(sh, (0, int(12*K)))
    # 金
    img.paste(gd, (0, 0), both)
    # 上端のハイライト(細い光)
    hl = Image.new('RGBA', (S, S), (255, 248, 225, 0))
    edge = both.filter(ImageFilter.GaussianBlur(int(1.5*K)))
    shifted = Image.new('L', (S, S), 0); shifted.paste(both, (0, int(5*K)))
    top_edge = Image.eval(Image.composite(edge, Image.new('L', (S, S), 0), Image.new('L', (S, S), 255)), lambda v: v)
    from PIL import ImageChops
    top_edge = ImageChops.subtract(both, shifted)
    hl.putalpha(top_edge.point(lambda v: int(v*0.55)))
    img.alpha_composite(hl)
    if not maskable:
        mk = Image.new('L', (S, S), 0)
        ImageDraw.Draw(mk).rounded_rectangle([0, 0, S-1, S-1], radius=int(S*0.225), fill=255)
        img.putalpha(mk)
    return img

big = make(1024)
big.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'))
big.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'icon-192.png'))
sq = make(1024, maskable=True)
sq.resize((180, 180), Image.LANCZOS).convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'))
sq.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-maskable.png'))
big.save(os.path.join(SCR, 'mysta-icon-preview.png'))
print('ok')
