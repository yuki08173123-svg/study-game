from PIL import Image, ImageDraw
import math, os

S = 1024
BLUE1 = (26, 92, 214)
BLUE2 = (92, 143, 240)
WHITE = (255, 255, 255)
SHEET = (255, 255, 255)
LINE  = (198, 212, 232)
GREEN = (18, 160, 106)
INK   = (26, 36, 50)
ACC   = (44, 111, 228)

def rrect(d, box, r, fill):
    d.rounded_rectangle(box, radius=r, fill=fill)

def gradient(size, c1, c2):
    img = Image.new('RGB', (size, size), c1)
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        # diagonal-ish gradient
        c = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
        d.line([(0, y), (size, y)], fill=c)
    return img

def check(d, cx, cy, r, color, done=True):
    if done:
        d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=color)
        w = int(r*0.30)
        p1 = (cx - r*0.42, cy + r*0.02)
        p2 = (cx - r*0.10, cy + r*0.36)
        p3 = (cx + r*0.46, cy - r*0.36)
        d.line([p1, p2], fill=WHITE, width=w, joint='curve')
        d.line([p2, p3], fill=WHITE, width=w, joint='curve')
        d.ellipse([p1[0]-w/2, p1[1]-w/2, p1[0]+w/2, p1[1]+w/2], fill=WHITE)
        d.ellipse([p3[0]-w/2, p3[1]-w/2, p3[0]+w/2, p3[1]+w/2], fill=WHITE)
    else:
        d.ellipse([cx-r, cy-r, cx+r, cy+r], outline=LINE, width=int(r*0.26))

def mic(d, cx, cy, h, color):
    """microphone glyph centred on (cx,cy), total height h"""
    bw = h * 0.40           # body width
    bh = h * 0.56           # body height
    top = cy - h*0.52
    d.rounded_rectangle([cx-bw/2, top, cx+bw/2, top+bh], radius=bw/2, fill=color)
    # arc (stand)
    aw = h * 0.72
    ay0 = cy - h*0.10
    lw = int(h*0.105)
    d.arc([cx-aw/2, ay0-aw/2, cx+aw/2, ay0+aw/2], start=0, end=180, fill=color, width=lw)
    # stem
    d.line([(cx, ay0+aw/2 - lw*0.2), (cx, cy + h*0.42)], fill=color, width=lw)
    # base
    d.line([(cx-h*0.24, cy+h*0.44), (cx+h*0.24, cy+h*0.44)], fill=color, width=lw)

def build(size=S, safe=1.0):
    img = gradient(size, BLUE1, BLUE2).convert('RGBA')
    layer = Image.new('RGBA', (size, size), (0,0,0,0))
    d = ImageDraw.Draw(layer)
    k = size / 1024.0 * safe
    ox = size/2 - 512*k
    oy = size/2 - 512*k
    def X(v): return ox + v*k
    def Y(v): return oy + v*k

    # 報告用紙
    rrect(d, [X(214), Y(150), X(810), Y(858)], int(52*k), SHEET)
    # 見出し帯
    rrect(d, [X(214), Y(150), X(810), Y(300)], int(52*k), (230, 238, 252))
    d.rectangle([X(214), Y(250), X(810), Y(300)], fill=(230, 238, 252))
    # 見出しのバー
    rrect(d, [X(272), Y(200), X(600), Y(250)], int(25*k), (150, 180, 232))

    # 行（チェック＋バー）
    rows = [(392, True), (532, True), (672, False)]
    for y, done in rows:
        check(d, X(310), Y(y), 46*k, GREEN, done)
        bar_col = (214, 224, 238) if not done else (176, 192, 214)
        w = 700 if done else 620
        rrect(d, [X(392), Y(y-24), X(w), Y(y+24)], int(24*k), bar_col)

    # マイク（右下・白い丸の上）
    mcx, mcy, mr = X(792), Y(786), 152*k
    d.ellipse([mcx-mr, mcy-mr, mcx+mr, mcy+mr], fill=WHITE)
    d.ellipse([mcx-mr, mcy-mr, mcx+mr, mcy+mr], outline=(226, 234, 246), width=int(8*k))
    mic(d, mcx, mcy - 4*k, 196*k, ACC)

    img.alpha_composite(layer)
    return img

def rounded_mask(size, r):
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0,0,size-1,size-1], radius=r, fill=255)
    return m

out = '/Users/hirayamayuuki/study-game/report'
big = build(S, 1.0)

# 通常アイコン（角丸）
for px, name in [(512,'icon-512-r1.png'), (192,'icon-192-r1.png'), (180,'apple-touch-icon-r1.png')]:
    im = big.resize((px, px), Image.LANCZOS)
    m = rounded_mask(px, int(px*0.225))
    o = Image.new('RGBA', (px, px), (0,0,0,0))
    o.paste(im, (0,0), m)
    o.save(os.path.join(out, name))

# maskable（全面・内容は安全域に縮小）
mk = build(S, 0.76).resize((512,512), Image.LANCZOS)
mk.convert('RGB').save(os.path.join(out, 'icon-maskable-r1.png'))
print('done')
