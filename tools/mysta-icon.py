# マイスタ のアイコン: 黒の艶のある背景 + 細い金のリング + 金のセリフ体 M
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os

OUT = '/Users/hirayamayuuki/study-game/mysta'
FONT = '/System/Library/Fonts/Supplemental/Didot.ttc'

def lerp(a, b, t): return tuple(int(round(a[i] + (b[i]-a[i])*t)) for i in range(3))

def bg(S):
    # 中心がややチャコール、端が黒に落ちる放射グラデ + 左上からの淡い光
    small = 128
    im = Image.new('RGB', (small, small))
    px = im.load()
    c0 = (0x2A, 0x2C, 0x33); c1 = (0x0B, 0x0C, 0x10)
    for y in range(small):
        for x in range(small):
            dx = (x - small*0.42)/small; dy = (y - small*0.38)/small
            r = min(1.0, math.sqrt(dx*dx + dy*dy) * 1.55)
            col = lerp(c0, c1, r**1.2)
            # 斜めの薄いシーン(光沢)
            sheen = max(0.0, 1 - abs((x + y*0.6) - small*0.55)/ (small*0.28))
            col = lerp(col, (0x3A, 0x3C, 0x45), sheen*0.35)
            px[x, y] = col
    return im.resize((S, S), Image.BICUBIC)

def gold_grad(S):
    # 金のグラデ(上が明るく、下がやや深い)
    small = 64
    im = Image.new('RGB', (small, small))
    px = im.load()
    g0 = (0xF3, 0xDE, 0x9C); g1 = (0xC9, 0xA4, 0x5C); g2 = (0x9B, 0x76, 0x33)
    for y in range(small):
        for x in range(small):
            t = (y/small)*0.75 + (x/small)*0.25
            col = lerp(g0, g1, t*1.6) if t < 0.62 else lerp(g1, g2, (t-0.62)/0.38)
            px[x, y] = col
    return im.resize((S, S), Image.BICUBIC)

def ring_mask(S, r_out, width):
    m = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(m)
    c = S/2
    d.ellipse([c-r_out, c-r_out, c+r_out, c+r_out], fill=255)
    d.ellipse([c-r_out+width, c-r_out+width, c+r_out-width, c+r_out-width], fill=0)
    return m

def text_mask(S, text, size, dy=0):
    f = ImageFont.truetype(FONT, size, index=0)
    m = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(m)
    bb = d.textbbox((0, 0), text, font=f)
    w = bb[2]-bb[0]; h = bb[3]-bb[1]
    d.text(((S-w)/2 - bb[0], (S-h)/2 - bb[1] + dy), text, font=f, fill=255)
    return m

def star_mask(S, cx, cy, r):
    m = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(m)
    pts = []
    for i in range(8):
        a = -math.pi/2 + i*math.pi/4
        rr = r if i % 2 == 0 else r*0.36
        pts.append((cx + rr*math.cos(a), cy + rr*math.sin(a)))
    d.polygon(pts, fill=255)
    return m

def make(S, maskable=False):
    K = S/1024
    img = bg(S).convert('RGBA')
    gold = gold_grad(S)

    # 外側の細いリング(2本)
    for r, w in [(int(430*K), int(7*K)), (int(404*K), int(2.5*K))]:
        m = ring_mask(S, r, max(1, w))
        img.paste(gold, (0, 0), m)

    # M の影 → 本体
    M = text_mask(S, 'M', int(560*K), dy=int(-18*K))
    shadow = M.filter(ImageFilter.GaussianBlur(int(14*K)))
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0)); sh.putalpha(shadow.point(lambda v: int(v*0.7)))
    img.alpha_composite(sh, (int(0), int(10*K)))
    img.paste(gold, (0, 0), M)
    # M のハイライト(上端の細い光)
    hl = Image.new('RGBA', (S, S), (255, 245, 210, 0))
    hlm = M.filter(ImageFilter.GaussianBlur(int(2*K)))
    hl.putalpha(hlm.point(lambda v: int(v*0.18)))
    img.alpha_composite(hl, (0, int(-4*K)))

    # 小さな星(Mの右上)
    st = star_mask(S, int(736*K), int(300*K), int(30*K))
    img.paste(gold, (0, 0), st)

    # 角丸(通常アイコンのみ)
    if not maskable:
        m = Image.new('L', (S, S), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, S-1, S-1], radius=int(S*0.225), fill=255)
        img.putalpha(m)
    return img

big = make(1024)
big.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'))
big.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'icon-192.png'))
# apple-touch-icon は角丸なし(iOSが丸める)
sq = make(1024, maskable=True)
sq.resize((180, 180), Image.LANCZOS).convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'))
sq.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-maskable.png'))
big.save('/private/tmp/claude-501/-Users-hirayamayuuki/48195ee0-b45d-4bd6-b3e5-c7b8be663f56/scratchpad/mysta-icon-preview.png')
print('ok')
