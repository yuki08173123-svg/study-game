# 時切スライドのアイコン：紺色に、ずれて重なった白いスライド3枚。いちばん前のスライドにオレンジの残り時間の棒と、切れ目の点線。
# 実行: python3 tools/jigiri-icon.py （study-game から）。/tmp ではなく jigiri/ に書き出し、確認用に jigiri-icon-preview.png も作る。
from PIL import Image, ImageDraw

S = 1024
NAVY = (30, 42, 69)
NAVY_D = (18, 25, 42)
WHITE = (250, 250, 247)
GRAY = (200, 206, 218)
CUT = (228, 87, 46)


def make(full=True):
    im = Image.new('RGB', (S, S), NAVY)
    d = ImageDraw.Draw(im)
    for y in range(S):
        k = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(NAVY[i] * (1 - k) + NAVY_D[i] * k) for i in range(3)))
    sc = 1.0 if full else 0.8
    c = S / 2
    def R(x0, y0, x1, y1):
        return [c + (x0 - c) * sc, c + (y0 - c) * sc, c + (x1 - c) * sc, c + (y1 - c) * sc]
    r = int(44 * sc)
    # うしろの2枚
    d.rounded_rectangle(R(300, 200, 820, 530), r, fill=(70, 84, 116))
    d.rounded_rectangle(R(250, 270, 770, 600), r, fill=(120, 134, 164))
    # 前のスライド
    d.rounded_rectangle(R(200, 340, 720, 670), r, fill=WHITE)
    # 文字の代わりの線
    d.rounded_rectangle(R(270, 420, 560, 462), int(20 * sc), fill=GRAY)
    d.rounded_rectangle(R(270, 500, 480, 542), int(20 * sc), fill=GRAY)
    # 残り時間の棒（オレンジ）
    d.rounded_rectangle(R(250, 600, 670, 628), int(14 * sc), fill=(232, 228, 220))
    d.rounded_rectangle(R(250, 600, 560, 628), int(14 * sc), fill=CUT)
    # 切れ目（オレンジの円＝時間）
    cx, cy, rr = c + (720 - c) * sc, c + (700 - c) * sc, 130 * sc
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=CUT)
    w = int(26 * sc)
    d.line([(cx, cy), (cx, cy - rr * 0.62)], fill=WHITE, width=w)
    d.line([(cx, cy), (cx + rr * 0.48, cy + rr * 0.1)], fill=WHITE, width=w)
    d.ellipse([cx - w * .7, cy - w * .7, cx + w * .7, cy + w * .7], fill=WHITE)
    return im


full = make(True)
mask = make(False)
for size, name, im in [(512, 'icon-512.png', full), (192, 'icon-192.png', full),
                       (180, 'apple-touch-icon.png', full), (512, 'icon-maskable.png', mask)]:
    im.resize((size, size), Image.LANCZOS).save('jigiri/' + name)
pv = Image.new('RGB', (420, 180), (240, 240, 240))
x = 10
for sz in (160, 110, 72, 48):
    pv.paste(full.resize((sz, sz), Image.LANCZOS), (x, 10)); x += sz + 10
pv.save('/private/tmp/claude-501/-Users-hirayamayuuki/ce0bfa47-f9c6-48b8-aeda-defe1a2fe0da/scratchpad/jigiri-icon-preview.png')
