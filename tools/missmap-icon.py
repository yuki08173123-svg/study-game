# Essence（旧ミスマップ）のアイコン
# 2026-10-01 からユーザー提供の画像（黒い板に金の「E」）を使う。元画像は missmap/src/icon-master.png。
# 以前の「金属の✕→✓を PIL で描く」版は git の履歴に残っている（v12〜v17）。
from PIL import Image, ImageDraw, ImageFilter
import sys

SRC = 'missmap/src/icon-master.png'
master = Image.open(SRC).convert('RGB')
W, H = master.size

# iPhone・ふつうのアイコン: 画像をそのまま縮める。
#   まわりの黒い余白ごと使うので、iPhone の角丸で切られても、金のふちは内側に残る。
for size, name in ((512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')):
    master.resize((size, size), Image.LANCZOS).save('missmap/' + name, optimize=True)

# Android の maskable: 丸や角丸で大きく切られるので、金のふちは使わず、
#   板の内側だけを切り出して小さめに置く（E の端が中心から 40% の安全な円に入るように）。
inner = master.crop((150, 150, W - 150, H - 150))
S = 512
edge = inner.resize((8, 8), Image.BOX).getpixel((0, 0))       # 板の地の色
canvas = Image.new('RGB', (S, S), edge)
side = int(S * 0.82)
piece = inner.resize((side, side), Image.LANCZOS)
mask = Image.new('L', (side, side), 0)
ImageDraw.Draw(mask).rounded_rectangle([18, 18, side - 18, side - 18], radius=60, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(14))              # つなぎ目が見えないように、ふちをぼかす
canvas.paste(piece, ((S - side) // 2, (S - side) // 2), mask)
canvas.save('missmap/icon-maskable.png', optimize=True)

# 確認用: 小さく並べる（明るい地と暗い地）
prev = Image.new('RGB', (620, 340), (238, 236, 232))
dark = Image.new('RGB', (620, 170), (20, 20, 22)); prev.paste(dark, (0, 170))
for row, y0 in ((0, 0), (1, 170)):
    for i, s in enumerate((160, 110, 72, 48)):
        ic = master.resize((s, s), Image.LANCZOS)
        m = Image.new('L', (s, s), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.224), fill=255)
        prev.paste(ic, (20 + i * 160 - (0 if i == 0 else (160 - s) // -2 * 0), y0 + (170 - s) // 2), m)
prev.save(sys.argv[1] if len(sys.argv) > 1 else '/tmp/missmap-icon-preview.png')
print('ok')
