#!/usr/bin/env python3
"""英検アプリ（5/4/3/準2/2/準1級）：例文の訳を「タップで見る」か「最初から見せる」かを設定で選べるように（塾生Yuuyの声 2026-10-11）。
はじめは訳を見て パッとつかみ、周回して力がついたら 自分で文脈から訳す、という使い分けのため。単語・熟語で共通（COMMON に ftOpen）。
使い方: python3 tools/eiken-ft-patch.py   （study-game で実行。すでに入っている級はとばす）"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
APPS = ['eiken-5', 'eiken-4', 'eiken-3', 'eiken-p2', 'eiken-2', 'eiken-p1']
R = []
def rep(old, new): R.append((old, new))

rep("""S.guideSeen = !!c.guideSeen; }""", """S.guideSeen = !!c.guideSeen; S.ftOpen = !!c.ftOpen; }""")
rep("""guideSeen:S.guideSeen })""", """guideSeen:S.guideSeen, ftOpen:!!S.ftOpen })""")
rep("""<span class="ftw${small ? ' sm' : ''}" role="button\"""", """<span class="ftw${small ? ' sm' : ''}${S.ftOpen ? ' open' : ''}" role="button\"""")
rep("""    <div class="card set"><label>発音</label>""", """    <div class="card set"><label>例文の訳</label>
      <div class="seg" id="sFt"><button class="${!S.ftOpen?'on':''}" data-v="0">タップで見る</button><button class="${S.ftOpen?'on':''}" data-v="1">最初から見せる</button></div>
      <p class="dim" style="margin:8px 0 0">はじめは「最初から見せる」で訳を見てパッとつかみ、周回して力がついたら「タップで見る」にして、自分で文脈から訳すのがおすすめです（単語・熟語で共通）。</p></div>
    <div class="card set"><label>発音</label>""")
rep("""  $$('#sAuto button').forEach(""", """  $$('#sFt button').forEach(b => b.onclick = () => { S.ftOpen = b.dataset.v === '1'; save(); renderSet(); });
  $$('#sAuto button').forEach(""")
rep("""'1分解説は、スライドと音声で1つを約30秒で解説。英語はネイティブの声、意味や覚え方は日本語の声です。'""",
    """'1分解説は、スライドと音声で1つを約30秒で解説。英語はネイティブの声、意味や覚え方は日本語の声です。','例文の訳は、はじめは「タップで見る」です。「設定」の<b>例文の訳</b>で「最初から見せる」にもできます。'""")

def bump(d, html):
    m = re.search(r"const VER = (\d+);", html)
    v = int(m.group(1)); nv = v + 1
    html = html.replace(m.group(0), f"const VER = {nv};", 1)
    sw = (d / 'sw.js').read_text()
    sw2, k = re.subn(r"('[a-z0-9]+-v)(\d+)(')", lambda mm: f"{mm.group(1)}{nv}{mm.group(3)}", sw, count=1)
    assert k == 1
    (d / 'sw.js').write_text(sw2)
    (d / 'version.json').write_text('{ "v": %d, "note": "例文の訳を最初から見せる設定" }\n' % nv)
    return html, v, nv

for app in APPS:
    d = ROOT / app; f = d / 'index.html'; html = f.read_text()
    if 'id="sFt"' in html: print(app, 'すでに入っています'); continue
    for old, new in R:
        c = html.count(old)
        if c != 1: sys.exit(f'{app}: {c}か所 → {old[:70]!r}')
        html = html.replace(old, new)
    html, v, nv = bump(d, html)
    f.write_text(html); print(app, f'v{v} → v{nv}')
