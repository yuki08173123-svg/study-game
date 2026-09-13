# ミスマップのアイコン: 紙の表に赤い✕と、それを消す緑の○
from PIL import Image, ImageDraw, ImageFilter
BG1=(0x2E,0x4E,0xA8); BG2=(0x0C,0x17,0x3A)
PAPER=(0xFB,0xF9,0xF3); RULE=(0xDD,0xE1,0xEA); RED=(0xB9,0x46,0x3A); GREEN=(0xC9,0xA2,0x4E); INK=(0x14,0x1B,0x2D)
def grad(size):
    g=Image.new('RGB',(96,96)); px=g.load()
    for y in range(96):
        for x in range(96):
            t=(x+y)/190; px[x,y]=tuple(int(BG1[i]+(BG2[i]-BG1[i])*t) for i in range(3))
    return g.resize(size, Image.BILINEAR)
def make(S, maskable=False):
    K=S/1000; k=lambda v:v*K
    img=Image.new('RGBA',(S,S)); img.paste(grad((S,S)),(0,0))
    m=Image.new('L',(S,S),0); md=ImageDraw.Draw(m)
    if maskable: md.rectangle([0,0,S,S],fill=255)
    else: md.rounded_rectangle([0,0,S-1,S-1],radius=int(k(225)),fill=255)
    img.putalpha(m)
    sc=0.80 if maskable else 1.0
    P=lambda x,y:(k(500+(x-500)*sc),k(500+(y-500)*sc))
    lay=Image.new('RGBA',(S,S),(0,0,0,0)); L=ImageDraw.Draw(lay)
    # 影
    sh=Image.new('L',(S,S),0); ImageDraw.Draw(sh).rounded_rectangle([P(190,210),P(830,850)],radius=int(k(40)),fill=110)
    sh=sh.filter(ImageFilter.GaussianBlur(k(28)))
    lay=Image.composite(Image.new('RGBA',(S,S),(5,10,30,255)),lay,sh); L=ImageDraw.Draw(lay)
    # 紙
    L.rounded_rectangle([P(170,170),P(810,810)],radius=int(k(40)),fill=PAPER+(255,))
    # 表の線
    for y in (330,460,590,720): L.line([P(210,y),P(770,y)],fill=RULE+(255,),width=int(k(8)))
    L.line([P(330,300),P(330,780)],fill=RULE+(255,),width=int(k(8)))
    L.rectangle([P(210,215),P(770,300)],fill=(0xEA,0xEE,0xF5,255))
    # 1列目に ✕（赤）、2列目に改善の線
    def cross(cx,cy,r,col,w):
        L.line([P(cx-r,cy-r),P(cx+r,cy+r)],fill=col+(255,),width=int(k(w)))
        L.line([P(cx+r,cy-r),P(cx-r,cy+r)],fill=col+(255,),width=int(k(w)))
    cross(270,395,38,RED,26); cross(270,525,38,RED,26)
    for y,wd in ((395,360),(525,260),(655,320)):
        L.rounded_rectangle([P(370,y-16),P(370+wd,y+16)],radius=int(k(16)),fill=(0xB4,0xBC,0xCC,255))
    # 3行目は緑の○（極まった）
    L.ellipse([P(270-44,655-44),P(270+44,655+44)],outline=GREEN+(255,),width=int(k(26)))
    img=Image.alpha_composite(img,lay)
    return img
for S,name in ((512,'icon-512.png'),(192,'icon-192.png'),(180,'apple-touch-icon.png')):
    make(S).save('missmap/'+name)
make(512,True).save('missmap/icon-maskable.png')
print('ok')
