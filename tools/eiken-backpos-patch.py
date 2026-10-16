#!/usr/bin/env python3
"""英検アプリ（5/4/3/準2/2/準1級）：カードのうらにも見出し語の品詞を出す（塾生Yuki★の声 2026-10-16）。
使い方: python3 tools/eiken-backpos-patch.py   （study-game で実行。すでに入っている級はとばす）"""
import re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
APPS = ['eiken-5', 'eiken-4', 'eiken-3', 'eiken-p2', 'eiken-2', 'eiken-p1']
R = [
    (""".fb{margin-top:12px;""", """.bpos{display:inline-block;margin-left:6px;font-family:'BIZ UDPGothic',sans-serif;font-size:12px;font-weight:700;color:var(--ai);background:var(--ai-soft);border-radius:999px;padding:1px 9px;vertical-align:3px}
.fb{margin-top:12px;""", 1),
    ("""<div class="bw" style="font-weight:600">${esc(w.w)} <span class="ph" style="font-size:13px">${esc(w.ph || '')}</span></div>""",
     """<div class="bw" style="font-weight:600">${esc(w.w)} <span class="ph" style="font-size:13px">${esc(w.ph || '')}</span><span class="bpos">${esc(pname(w.p))}</span></div>""", 2),
]
for app in APPS:
    d = ROOT / app; f = d / 'index.html'; html = f.read_text()
    if 'class="bpos"' in html: print(app, 'すでに入っています'); continue
    for old, new, n in R:
        c = html.count(old)
        if c != n: sys.exit(f'{app}: {c}か所 → {old[:60]!r}')
        html = html.replace(old, new)
    m = re.search(r"const VER = (\d+);", html); v = int(m.group(1)); nv = v + 1
    html = html.replace(m.group(0), f"const VER = {nv};", 1)
    sw = (d / 'sw.js').read_text()
    sw2, k = re.subn(r"('[a-z0-9]+-v)(\d+)(')", lambda mm: f"{mm.group(1)}{nv}{mm.group(3)}", sw, count=1); assert k == 1
    (d / 'sw.js').write_text(sw2)
    (d / 'version.json').write_text('{ "v": %d, "note": "カードのうらに品詞・resume などの発音を直した" }\n' % nv)
    f.write_text(html); print(app, f'v{v} → v{nv}')
