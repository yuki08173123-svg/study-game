#!/usr/bin/env python3
"""英検アプリ（5/4/3/準2/2/準1級）と古文単語：テストでまちがえたとき、「次へ」を画面の下に固定で出す
（塾生はるかの声 2026-10-14：まちがえると次へのボタンがスライドしないと押せない）。
解説が長くても、スクロールせずにすぐ次へ進める。
使い方: python3 tools/next-fixed-patch.py   （study-game で実行。すでに入っているアプリはとばす）"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
APPS = ['eiken-5', 'eiken-4', 'eiken-3', 'eiken-p2', 'eiken-2', 'eiken-p1', 'kobun']
R = [
    (""".fb{margin-top:12px;""", """/* まちがえたときの「次へ」は画面の下に固定（塾生の声：スクロールしないと押せない） */
.nextfix{position:fixed;left:0;right:0;bottom:0;z-index:60;padding:14px 16px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(rgba(0,0,0,0),var(--bg) 35%)}
.nextfix .btn{display:block;max-width:640px;margin:0 auto;box-shadow:0 4px 14px rgba(0,0,0,.18)}
.ov:has(.nextfix){padding-bottom:calc(92px + env(safe-area-inset-bottom))}
.fb{margin-top:12px;"""),
    ("""      <button class="btn" style="margin-top:10px" id="btnNext">次へ</button>`;""",
     """      <div class="nextfix"><button class="btn" id="btnNext">次へ ›</button></div>`;"""),
]

for app in APPS:
    d = ROOT / app; f = d / 'index.html'; html = f.read_text()
    if 'class="nextfix"' in html: print(app, 'すでに入っています'); continue
    for old, new in R:
        c = html.count(old)
        if c != 1: sys.exit(f'{app}: {c}か所 → {old[:60]!r}')
        html = html.replace(old, new)
    m = re.search(r"const VER = (\d+);", html); v = int(m.group(1)); nv = v + 1
    html = html.replace(m.group(0), f"const VER = {nv};", 1)
    sw = (d / 'sw.js').read_text()
    sw2, k = re.subn(r"('[a-z0-9]+-v)(\d+)(')", lambda mm: f"{mm.group(1)}{nv}{mm.group(3)}", sw, count=1)
    assert k == 1, app
    (d / 'sw.js').write_text(sw2)
    (d / 'version.json').write_text('{ "v": %d, "note": "まちがえたときの「次へ」を画面の下に固定" }\n' % nv)
    f.write_text(html); print(app, f'v{v} → v{nv}')
