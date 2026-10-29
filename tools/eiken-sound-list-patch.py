#!/usr/bin/env python3
"""英検アプリ（5/4/3/準2/2/準1級）：塾生はるかの声（2026-10-28）の2つ。
  1. カード・テスト・仕分けの画面の上に、音のオン／オフのボタン（設定の「発音：自動で鳴らす／押したときだけ」と同じ）。
     オフのときは、カードの自動の発音・うら返したときの例文の自動の音も鳴らさない（押せば鳴る。「聞いて意味」のテストは鳴る）。
  2. 一覧で、長い単語が「意味をかくす」の灰色に重なって見えない → 長い単語は字を小さく、それでも長ければ折り返す。
  3. （同じ日に追加・手で当てた）カード・テストの見出し語も、11文字以上は30px・16文字以上は24px（isLong を >10 に・isXL）。
使い方: python3 tools/eiken-sound-list-patch.py   （study-game で実行。すでに入っている級はとばす）"""
import re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
APPS = ['eiken-5', 'eiken-4', 'eiken-3', 'eiken-p2', 'eiken-2', 'eiken-p1']
R = [
    # CSS
    (""".wrow .mn{""", """.wrow .wd{overflow-wrap:normal}
.wlist .lrow .mn.hide{min-width:56px}
.wrow .wd.l1{font-size:15px}
.wrow .wd.l2{font-size:13px}
.sndb{flex:none;height:32px;padding:0 10px;border-radius:999px;background:var(--ai-soft);color:var(--ai);display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700}
.sndb svg{width:16px;height:16px}
.sndb.off{background:var(--chip);color:var(--muted)}
.wrow .mn{""", 1),
    # 長い単語は字を小さく（一覧・単語タブ・解説の一覧・まちがえた一覧）
    ("""<span class="wd">${esc(W[i].w)}""", """<span class="wd${wdCls(W[i].w)}">${esc(W[i].w)}""", None),
    ("""<span class="wd">${esc(w.w)}""", """<span class="wd${wdCls(w.w)}">${esc(w.w)}""", None),
    # 音のボタン（カード・テスト・仕分け）
    ("""<div class="ttl">${esc(C.title)}</div><button class="undo" data-a="undo\"""", """<div class="ttl">${esc(C.title)}</div>${sndBtn()}<button class="undo" data-a="undo\"""", 1),
    ("""<div class="ttl">${esc(T.label)}　${T.k+1} / ${T.order.length}</div>""", """<div class="ttl">${esc(T.label)}　${T.k+1} / ${T.order.length}</div>${sndBtn()}""", 1),
    ("""<div class="ttl">${esc(Q.title)}</div><button class="undo" data-a="undo\"""", """<div class="ttl">${esc(Q.title)}</div>${sndBtn()}<button class="undo" data-a="undo\"""", 1),
    # 音オフのときは、うら返したときの例文も自動では鳴らさない
    ("""if(C.flip && S.exAud === 'auto') speakEx(""", """if(C.flip && S.exAud === 'auto' && S.cfg.autoSpk) speakEx(""", 1),
    # 関数
    ("""function bindSpk(root){""", """/* 音のオン／オフ（カード・テスト・仕分けの画面の上。設定の「発音」と同じ cfg.autoSpk） */
const MUTE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6"/></svg>';
function sndBtn(){ return `<button class="sndb ${S.cfg.autoSpk ? '' : 'off'}" data-a="snd" aria-label="音のオン・オフ">${S.cfg.autoSpk ? SPK_SVG + '音あり' : MUTE_SVG + '音なし'}</button>`; }
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-a=snd]');
  if(!b) return;
  e.stopPropagation();
  S.cfg.autoSpk = !S.cfg.autoSpk; save();
  if(!S.cfg.autoSpk) stopSpk();
  b.outerHTML = sndBtn();
  toast(S.cfg.autoSpk ? '音あり：単語の発音を自動で鳴らします' : '音なし：押したときだけ鳴らします');
}, true);
/* 長い単語は一覧で字を小さく（「意味をかくす」の灰色に重ならないように） */
function wdCls(s){ const n = String(s).length; return n > 15 ? ' l2' : n > 11 ? ' l1' : ''; }
function bindSpk(root){""", 1),
]
for app in APPS:
    d = ROOT / app; f = d / 'index.html'; html = f.read_text()
    if 'function sndBtn(' in html: print(app, 'すでに入っています'); continue
    for old, new, n in R:
        c = html.count(old)
        if n is None:
            if c < 1: sys.exit(f'{app}: 0か所 → {old[:60]!r}')
        elif c != n: sys.exit(f'{app}: {c}か所 → {old[:60]!r}')
        html = html.replace(old, new)
    # 使い方スライド（発音と1分解説）に一言
    html, c = re.subn(r"(\{ t:'発音と1分解説', p:\[[^\n]*?)'\]", r"\1','カード・テストの画面の上の<b>音あり／音なし</b>で、自動の発音をすぐ切りかえられます。']", html, count=1)
    if c != 1: sys.exit(f'{app}: 使い方スライドが見つからない')
    m = re.search(r"const VER = (\d+);", html); v = int(m.group(1)); nv = v + 1
    html = html.replace(m.group(0), f"const VER = {nv};", 1)
    sw = (d / 'sw.js').read_text()
    sw2, k = re.subn(r"('[a-z0-9]+-v)(\d+)(')", lambda mm: f"{mm.group(1)}{nv}{mm.group(3)}", sw, count=1); assert k == 1
    (d / 'sw.js').write_text(sw2)
    (d / 'version.json').write_text('{ "v": %d, "note": "カード・テストに音のオン／オフ・一覧の長い単語を小さく" }\n' % nv)
    f.write_text(html); print(app, f'v{v} → v{nv}', html.count('wdCls('))
