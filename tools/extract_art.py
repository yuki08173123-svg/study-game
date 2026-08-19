#!/usr/bin/env python3
"""
キャラクターの げんが（4体ならび）から 1体ずつ 切りだして、
背景を とうめいにして art/ に ほぞんする。

    python3 tools/extract_art.py <ほのお.png> <みず.png> <でんき.png>

やっていること
  1. 四すみの 色を 背景色と みなす
  2. がぞうの ふちから ぬりつぶし（flood fill）で つながった 背景だけ とうめいに
     → キャラの 中の あかるい ところは 消えない
  3. ふちを すこし ぼかして なめらかに
  4. たての 空白で 4つに わける（4つに ならなければ しきい値を あげて さがす）
  5. 1体ずつ よぶんな 余白を きり、
     すすむほど 大きく なるように 高さを そろえて 正方形の キャンバスに おく
     （ぜんぶ 同じ 大きさに すると せいちょうした かんじが 出ないため）
"""
import sys, os
from collections import deque
from PIL import Image, ImageFilter

OUT_DIR  = os.path.join(os.path.dirname(__file__), "..", "art")
# 背景色と みなす いろの ちがい。でんきは 背景の 黄色と キャラの 金色が
# ちかいので 小さめに しないと からだが 消えてしまう。
TOLS     = {'fire': 46, 'aqua': 46, 'volt': 16}
TOL      = 46
CANVAS   = 420      # ほぞんする 正方形の 大きさ
# 1〜4だんかいの 大きさ（キャンバスに たいする わりあい）
SCALE_BY_STAGE = (0.60, 0.74, 0.88, 1.00)


def bg_alpha(im, tol=TOL):
    """ふちから つながった 背景を とうめいにした RGBA を かえす"""
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    corners = [px[1, 1], px[w - 2, 1], px[1, h - 2], px[w - 2, h - 2]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    def near(c):
        return (abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2])) < tol * 3

    mask = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not mask[y * w + x] and near(px[x, y]):
                mask[y * w + x] = 1; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not mask[y * w + x] and near(px[x, y]):
                mask[y * w + x] = 1; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not mask[ny * w + nx] and near(px[nx, ny]):
                mask[ny * w + nx] = 1
                q.append((nx, ny))

    alpha = Image.frombytes("L", (w, h), bytes(255 if not m else 0 for m in mask))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out


def column_weight(im):
    w, h = im.size
    a = im.getchannel("A").resize((w, 120))
    p = a.load()
    return [sum(p[x, y] for y in range(120)) for x in range(w)], w


def find_runs(col, w, pct):
    thr = max(col) * pct
    runs, st = [], None
    for x in range(w):
        if col[x] > thr:
            if st is None: st = x
        elif st is not None:
            if x - st > w * 0.02: runs.append((st, x))
            st = None
    if st is not None: runs.append((st, w))
    return runs


def split4(im):
    """4つの 切れめを かえす。しきい値を あげながら ちょうど4つに なるまで さがす"""
    col, w = column_weight(im)
    runs = None
    for pct in (0.01, 0.02, 0.03, 0.05, 0.08, 0.12, 0.15, 0.20, 0.25):
        r = find_runs(col, w, pct)
        if len(r) == 4:
            runs = r
            print(f"   （しきい値 {pct:.0%} で 4体を みつけた）")
            break
    if runs is None:                      # どうしても わからなければ 4とうぶん
        print("   （※ じどうで わけられず 4とうぶん）")
        return [(int(w * i / 4), int(w * (i + 1) / 4)) for i in range(4)]

    # となりあう かたまりの まん中で 切る（光を のこすため 端は 目いっぱい）
    cuts = [0]
    for i in range(3):
        cuts.append((runs[i][1] + runs[i + 1][0]) // 2)
    cuts.append(w)
    return [(cuts[i], cuts[i + 1]) for i in range(4)]


def place(part, stage):
    """1体を 正方形の キャンバスに、だんかいに おうじた 大きさで 下ぞろえで おく"""
    bb = part.getbbox()
    if bb: part = part.crop(bb)
    want_h = CANVAS * SCALE_BY_STAGE[stage]
    sc = want_h / part.size[1]
    if part.size[0] * sc > CANVAS:        # よこに はみ出すなら よこ基準
        sc = CANVAS / part.size[0]
    nw, nh = max(1, round(part.size[0] * sc)), max(1, round(part.size[1] * sc))
    part = part.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(part, ((CANVAS - nw) // 2, CANVAS - nh), part)   # 下ぞろえ
    return canvas


def main():
    if len(sys.argv) != 4:
        print(__doc__); sys.exit(1)
    os.makedirs(OUT_DIR, exist_ok=True)
    for src, key in zip(sys.argv[1:], ("fire", "aqua", "volt")):
        print(f"\n■ {key}  ← {os.path.basename(src)}")
        im = bg_alpha(Image.open(src), TOLS.get(key, TOL))
        for i, (x0, x1) in enumerate(split4(im)):
            out = os.path.join(OUT_DIR, f"{key}{i+1}.png")
            place(im.crop((x0, 0, x1, im.size[1])), i).save(out, optimize=True)
            print(f"   {key}{i+1}.png  {CANVAS}x{CANVAS}  {os.path.getsize(out)//1024}KB")


if __name__ == "__main__":
    main()
