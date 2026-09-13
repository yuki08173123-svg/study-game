# マイスタ のアイコン: 深い紫の背景 + 磨き上げた宝石(極めた方法) + 小さな光
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
    top = (0x4B, 0x24, 0x93); mid = (0x2B, 0x13, 0x60); bot = (0x14, 0x0A, 0x30)
    for y in range(small):
        for x in range(small):
            t = (y*0.85 + x*0.15)/small
            col = lerp(top, mid, t/0.5) if t < 0.5 else lerp(mid, bot, (t-0.5)/0.5)
            dx = (x - small*0.5)/small; dy = (y - small*0.5)/small
            g = max(0.0, 1 - math.sqrt(dx*dx+dy*dy)*2.2)
            col = lerp(col, (0x7C, 0x52, 0xC8), g*0.45)   # 中央のやわらかい光
            px[x, y] = col
    return im.resize((S, S), Image.BICUBIC)

# 宝石の頂点(1024基準)
def pts(K):
    P = lambda x, y: (x*K, y*K)
    T1, T2, T3, T4 = P(248, 318), P(372, 318), P(652, 318), P(776, 318)
    G1, G2, G3, G4, G5 = P(140, 470), P(330, 470), P(512, 470), P(694, 470), P(884, 470)
    TIP = P(512, 850)
    facets = [
        # 冠(上)
        ([T1, T2, G2, G1], (0xF4, 0xEE, 0xFF)),
        ([T2, T3, G4, G2], (0xFF, 0xFD, 0xF7)),
        ([T3, T4, G5, G4], (0xD3, 0xC1, 0xF6)),
        # 底(下)
        ([G1, G2, TIP], (0xB9, 0xA2, 0xEE)),
        ([G2, G3, TIP], (0xE2, 0xD6, 0xFB)),
        ([G3, G4, TIP], (0xC8, 0xB3, 0xF3)),
        ([G4, G5, TIP], (0x9E, 0x84, 0xE0)),
    ]
    outline = [T1, T4, G5, TIP, G1]
    return facets, outline, (T2, T3, G2, G4)

def star(d, cx, cy, r, fill):
    p = []
    for i in range(8):
        a = -math.pi/2 + i*math.pi/4
        rr = r if i % 2 == 0 else r*0.28
        p.append((cx + rr*math.cos(a), cy + rr*math.sin(a)))
    d.polygon(p, fill=fill)

def make(S, maskable=False):
    K = S/1024
    img = bg(S).convert('RGBA')
    SS = 4  # スーパーサンプリング
    W = S*SS; k = K*SS
    facets, outline, (T2, T3, G2, G4) = pts(k)

    # 宝石の後ろの発光と影
    gm = Image.new('L', (W, W), 0); ImageDraw.Draw(gm).polygon(outline, fill=255)
    gm_s = gm.resize((S, S), Image.LANCZOS)
    glow = Image.new('RGBA', (S, S), (0xC9, 0xB0, 0xFF, 0)); glow.putalpha(gm_s.filter(ImageFilter.GaussianBlur(int(40*K))).point(lambda v: int(v*0.7)))
    img.alpha_composite(glow)
    sh = Image.new('RGBA', (S, S), (0x0A, 0x04, 0x22, 0)); sh.putalpha(gm_s.filter(ImageFilter.GaussianBlur(int(10*K))).point(lambda v: int(v*0.55)))
    img.alpha_composite(sh, (0, int(14*K)))

    # 面
    gem = Image.new('RGBA', (W, W), (0, 0, 0, 0)); d = ImageDraw.Draw(gem)
    for poly, col in facets:
        d.polygon(poly, fill=col + (255,))
    # 面の境界線(細い深紫)
    line = (0x3A, 0x1E, 0x7A, 255); lw = max(1, int(3.2*k))
    edges = [
        (facets[0][0][1], facets[0][0][2]), (facets[1][0][1], facets[1][0][2]),  # T2-G2, T3-G4
        (G2, G4),  # 冠と底の境(中央部)
        (outline[4], outline[2]),  # G1-G5 ガードル
        (G2, facets[3][0][2]), (facets[4][0][1], facets[4][0][2]), (G4, facets[5][0][2]),  # 底の稜線
    ]
    for a, b in edges: d.line([a, b], fill=line, width=lw)
    d.line(outline + [outline[0]], fill=line, width=lw)
    gem = gem.resize((S, S), Image.LANCZOS)
    img.alpha_composite(gem)

    # 上面の光沢(テーブル面の左上に淡い白)
    hl = Image.new('RGBA', (S, S), (255, 255, 255, 0)); hd = ImageDraw.Draw(hl)
    hd.polygon([(T2[0]/SS, T2[1]/SS), ((T2[0]+ (T3[0]-T2[0])*0.55)/SS, T2[1]/SS), ((G2[0]+40*k)/SS, (G2[1]-6*k)/SS), (G2[0]/SS, (G2[1]-6*k)/SS)], fill=(255, 255, 255, 60))
    img.alpha_composite(hl)

    # きらめき
    sp = Image.new('RGBA', (S, S), (0, 0, 0, 0)); sd = ImageDraw.Draw(sp)
    star(sd, int(700*K), int(262*K), int(52*K), (255, 250, 236, 255))
    star(sd, int(300*K), int(560*K), int(22*K), (255, 250, 236, 220))
    spg = sp.split()[3].filter(ImageFilter.GaussianBlur(int(10*K)))
    g2 = Image.new('RGBA', (S, S), (255, 240, 210, 0)); g2.putalpha(spg.point(lambda v: int(v*0.9)))
    img.alpha_composite(g2); img.alpha_composite(sp)

    if not maskable:
        m = Image.new('L', (S, S), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, S-1, S-1], radius=int(S*0.225), fill=255)
        img.putalpha(m)
    return img

big = make(1024)
big.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'))
big.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'icon-192.png'))
sq = make(1024, maskable=True)
sq.resize((180, 180), Image.LANCZOS).convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'))
sq.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-maskable.png'))
big.save(os.path.join(SCR, 'mysta-icon-preview.png'))
big.resize((120, 120), Image.LANCZOS).save(os.path.join(SCR, 'mysta-icon-small.png'))
print('ok')
