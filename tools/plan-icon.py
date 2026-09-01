from PIL import Image, ImageDraw, ImageFilter
import math

# ---------- homography ----------
def solve(A, b):
    n = len(A)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        pv = M[c][c]
        for j in range(c, n+1): M[c][j] /= pv
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c]
                for j in range(c, n+1): M[r][j] -= f*M[c][j]
    return [M[i][n] for i in range(n)]

def homography(src, dst):
    """src の点を dst に移す係数 (a,b,c,d,e,f,g,h)"""
    A, b = [], []
    for (u, v), (x, y) in zip(src, dst):
        A.append([u, v, 1, 0, 0, 0, -u*x, -v*x]); b.append(x)
        A.append([0, 0, 0, u, v, 1, -u*y, -v*y]); b.append(y)
    return solve(A, b)

def apply_h(h, p):
    u, v = p
    d = h[6]*u + h[7]*v + 1
    return ((h[0]*u + h[1]*v + h[2])/d, (h[3]*u + h[4]*v + h[5])/d)

# ---------- colors ----------
BG1=(0x35,0x86,0xF7); BG2=(0x0B,0x40,0xAE)
BACK=(0x15,0x4E,0xC0)
GRID=(0xC5,0xD6,0xEF)
D1=(0x14,0x4F,0xBC); D2=(0x2A,0x79,0xEF); D3=(0x63,0xA6,0xF8); D4=(0xAF,0xD1,0xFA)
LINE=(0x1B,0x67,0xE6)
PEN_D=(0x18,0x30,0x6C); PEN_L=(0x33,0x5C,0xB2)
SIL_L=(0xE2,0xE8,0xF2); SIL_D=(0x93,0xA1,0xB8)
BADGE=(0x12,0x5F,0xDD)

def grad(size, c1, c2, diag=True):
    g = Image.new('RGB', (96, 96))
    px = g.load()
    for y in range(96):
        for x in range(96):
            t = ((x+y)/190) if diag else (y/95)
            px[x, y] = tuple(int(round(c1[i]+(c2[i]-c1[i])*t)) for i in range(3))
    return g.resize(size, Image.BILINEAR)

def make(S, maskable=False):
    K = S/1000.0
    def k(v): return v*K
    img = Image.new('RGBA', (S, S), (0,0,0,0))
    img.paste(grad((S,S), BG1, BG2), (0,0))
    m = Image.new('L', (S,S), 0); md = ImageDraw.Draw(m)
    if maskable: md.rectangle([0,0,S,S], fill=255)
    else: md.rounded_rectangle([0,0,S-1,S-1], radius=int(k(225)), fill=255)
    img.putalpha(m)

    sc = 0.80 if maskable else 1.0
    def P(x, y):  # 1000空間 → 画面（maskableは中身を縮める）
        return (k(500 + (x-500)*sc), k(500 + (y-500)*sc))

    quad = [(206,250), (886,196), (916,800), (92,838)]   # 用紙の四隅（1000空間）
    Q = [P(*p) for p in quad]

    lay = Image.new('RGBA', (S,S), (0,0,0,0)); L = ImageDraw.Draw(lay)

    # --- 後ろの台紙 ---
    back = [ (x+34, y+46) for (x,y) in quad ]
    L.polygon([P(*p) for p in back], fill=BACK+(255,))

    # --- 影 ---
    sh = Image.new('L', (S,S), 0); ImageDraw.Draw(sh).polygon(
        [P(x+18, y+34) for (x,y) in quad], fill=95)
    sh = sh.filter(ImageFilter.GaussianBlur(k(26)))
    lay = Image.composite(Image.new('RGBA',(S,S),(6,26,72,255)), lay, sh)
    L = ImageDraw.Draw(lay)

    # --- リング（用紙の上辺にかかる） ---
    top_l, top_r = quad[0], quad[1]
    for i in range(5):
        t = 0.115 + i*0.192
        cx = top_l[0] + (top_r[0]-top_l[0])*t
        cy = top_l[1] + (top_r[1]-top_l[1])*t
        rx, ry = 46, 64
        x0,y0 = P(cx-rx, cy-ry*1.05); x1,y1 = P(cx+rx, cy+ry*0.95)
        L.ellipse([x0,y0,x1,y1], outline=(0x14,0x2C,0x66,255), width=max(2,int(k(19))))
        L.arc([x0,y0,x1,y1], 190, 320, fill=(0x4E,0x74,0xC4,255), width=max(2,int(k(9))))

    # --- 用紙（平面で描いてから台形に変形） ---
    FW, FH = 940, 800
    flat = Image.new('RGBA', (FW, FH), (0,0,0,0)); F = ImageDraw.Draw(flat)
    F.rectangle([0,0,FW,FH], fill=(0xF4,0xF8,0xFF,255))
    sheet_g = grad((FW,FH), (0xFA,0xFC,0xFF), (0xDD,0xE7,0xF7), diag=False)
    flat.paste(sheet_g, (0,0))

    COLS, ROWS = 5, 5
    ml, mr, mt, mb = 40, 40, 30, 40
    gw, gh = FW-ml-mr, FH-mt-mb
    hdr = 78
    cw = gw/COLS; ch = (gh-hdr)/ROWS
    # 見出しの帯
    hcols = [D1, D2, D2, D3, D3]
    for c in range(COLS):
        x = ml + c*cw
        F.rounded_rectangle([x+10, mt+14, x+cw-16, mt+52], radius=12, fill=hcols[c]+(255,))
    # 方眼
    for r in range(ROWS+1):
        y = mt+hdr + r*ch
        F.line([(ml, y), (ml+gw, y)], fill=GRID+(255,), width=3)
    for c in range(COLS+1):
        x = ml + c*cw
        F.line([(x, mt+hdr), (x, mt+hdr+ROWS*ch)], fill=GRID+(255,), width=3)
    # セルの中の帯
    cells = [(0,0,D4,0.42),(1,0,D2,0.62),(2,0,D2,0.55),(4,0,D3,0.66),
             (0,1,D4,0.42),(1,1,D1,0.58),(3,1,D3,0.60),
             (0,2,D4,0.42),
             (0,3,D4,0.42),(1,3,D3,0.55),(2,3,D2,0.58),(4,3,D4,0.52)]
    for (c, r, col, w) in cells:
        x = ml + c*cw + 14; y = mt+hdr + r*ch + ch*0.28
        F.rounded_rectangle([x, y, x+cw*w, y+ch*0.30], radius=10, fill=col+(255,))

    hp = homography(Q, [(0,0),(FW,0),(FW,FH),(0,FH)])   # 画面→平面
    warped = flat.transform((S,S), Image.PERSPECTIVE, hp, resample=Image.BICUBIC)
    lay = Image.alpha_composite(lay, warped); L = ImageDraw.Draw(lay)

    # --- 折れ線グラフ（平面の座標を画面へ） ---
    hf = homography([(0,0),(FW,0),(FW,FH),(0,FH)], Q)   # 平面→画面
    pts = [(78,668),(220,580),(392,450),(524,528),(656,414),(806,286)]
    sp = [apply_h(hf, p) for p in pts]
    L.line(sp, fill=LINE+(255,), width=max(2,int(k(15))), joint='curve')
    for p in sp:
        r = k(26)
        L.ellipse([p[0]-r,p[1]-r,p[0]+r,p[1]+r], fill=(255,255,255,255),
                  outline=LINE+(255,), width=max(2,int(k(8))))

    # --- ペン ---
    PL, PH = 470, 88
    pen = Image.new('RGBA', (PL, PH), (0,0,0,0)); PD = ImageDraw.Draw(pen)
    PD.polygon([(0,PH/2),(62,PH*0.24),(62,PH*0.76)], fill=SIL_D+(255,))
    PD.polygon([(6,PH/2),(62,PH*0.30),(62,PH*0.70)], fill=SIL_L+(255,))
    PD.rounded_rectangle([58,PH*0.20,86,PH*0.80], radius=8, fill=SIL_L+(255,))
    PD.rounded_rectangle([84,PH*0.14,PL-8,PH*0.86], radius=26, fill=PEN_D+(255,))
    PD.rounded_rectangle([100,PH*0.24,PL-40,PH*0.44], radius=12, fill=PEN_L+(255,))
    PD.rounded_rectangle([PL-96,PH*0.10,PL-30,PH*0.36], radius=12, fill=SIL_L+(255,))
    PD.rounded_rectangle([PL-40,PH*0.14,PL-8,PH*0.86], radius=14, fill=(0x10,0x22,0x50,255))
    ang = 56.0
    scale = K*sc
    pw, ph = PL*scale, PH*scale
    pen = pen.resize((max(1,int(pw)), max(1,int(ph))), Image.LANCZOS)
    pen = pen.rotate(ang, expand=True, resample=Image.BICUBIC)
    th = math.radians(ang)
    tx, ty = -pw/2.0, 0.0                      # 元画像の中心から見たペン先
    rx = tx*math.cos(th) + ty*math.sin(th)
    ry = -tx*math.sin(th) + ty*math.cos(th)
    tip = (pen.width/2.0 + rx, pen.height/2.0 + ry)
    px, py = P(655, 872)                        # ペン先を置きたい場所
    ox, oy = int(round(px - tip[0])), int(round(py - tip[1]))
    psh = pen.split()[3].filter(ImageFilter.GaussianBlur(k(10)))
    shl = Image.new('RGBA', (S,S), (0,0,0,0))
    shm = Image.new('L', (S,S), 0)
    shm.paste(psh, (ox+int(k(10)), oy+int(k(16))))
    lay = Image.composite(Image.new('RGBA',(S,S),(8,30,80,120)), lay, shm)
    L = ImageDraw.Draw(lay)
    lay.alpha_composite(pen, (ox, oy))

    # --- チェックのバッジ ---
    bx, by = P(838, 792); r = k(112)
    L.ellipse([bx-r,by-r,bx+r,by+r], fill=(255,255,255,255))
    r2 = r - k(16)
    L.ellipse([bx-r2,by-r2,bx+r2,by+r2], fill=BADGE+(255,))
    L.line([(bx-k(48), by+k(4)), (bx-k(12), by+k(42)), (bx+k(52), by-k(42))],
           fill=(255,255,255,255), width=max(3,int(k(26))), joint='curve')

    out = Image.alpha_composite(img, Image.composite(lay, Image.new('RGBA',(S,S),(0,0,0,0)), m))
    return out

W = 2048
for name, sz, mk in [('icon-192-v7.png',192,False), ('icon-512-v7.png',512,False),
                     ('icon-maskable-v7.png',512,True), ('apple-touch-icon-v7.png',180,False)]:
    im = make(W, mk).resize((sz, sz), Image.LANCZOS)
    if name.startswith('apple'):
        bg = Image.new('RGB',(sz,sz),BG2); bg.paste(im,(0,0),im); im = bg
    im.save(name)
print('ok')
