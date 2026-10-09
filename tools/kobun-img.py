#!/usr/bin/env python3
"""古文単語350 のイメージ画像を取りこむ。

    python3 tools/kobun-img.py <画像のフォルダ>

ファイル名に3けたの番号（001〜350）が入っている画像を、
kobun/img/NNN.jpg（横幅最大800px・JPEG）に変換して入れ、kobun/img/index.json を作り直す。
ChatGPT で作った画像は、右下の小さな番号を見てから「001.png」のように名前を変えておく。
"""
import json, os, re, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'kobun', 'img')

def main(src):
    os.makedirs(OUT, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(src)):
        m = re.search(r'(\d{3})', f)
        if not m or not f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            continue
        no = m.group(1)
        if not 1 <= int(no) <= 350:
            continue
        im = Image.open(os.path.join(src, f)).convert('RGB')
        if im.width > 800:
            im = im.resize((800, round(im.height * 800 / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, no + '.jpg'), quality=82, optimize=True)
        n += 1
    have = sorted(f[:3] for f in os.listdir(OUT) if re.fullmatch(r'\d{3}\.jpg', f))
    json.dump(have, open(os.path.join(OUT, 'index.json'), 'w'))
    print(f'取りこみ {n}枚 / いま入っている画像 {len(have)}枚')

if __name__ == '__main__':
    main(sys.argv[1])
