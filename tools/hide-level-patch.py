#!/usr/bin/env python3
"""英検アプリ（5/4/3/準2/2/準1級）と古文単語：「レベルと XP」を表示しない設定（2026-10-15・保護者めいさんの声「レベルとXPはいらないと娘が言っている」）。
表示しないにしても XP は裏でたまり続ける（表示にもどせば、そのまま出る）。
英検は単語・熟語で共通（COMMON に hideLv）、古文は S.cfg.hideLv。
使い方: python3 tools/hide-level-patch.py   （study-game で実行。すでに入っているアプリはとばす）"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
EIKEN = ['eiken-5', 'eiken-4', 'eiken-3', 'eiken-p2', 'eiken-2', 'eiken-p1']

SET_NOTE = 'レベルと XP がいらないときは「表示しない」に。表示しなくても XP は裏でたまっていて、「表示する」にもどせば、そのまま出ます。'
COMMON = [
    ("""/* +XP の小さな表示 */""", """/* レベルと XP を表示しない設定（保護者の声） */
body.nolv #lvChip,body.nolv .lvcard,body.nolv .xpop,body.nolv .resxp,body.nolv .lvfx{display:none!important}
/* +XP の小さな表示 */"""),
    ("""  popXP(n, why); renderLv(true);""", """  if(!lvOff()) popXP(n, why);
  renderLv(true);"""),
    ("""function renderLv(anim){
  const x = lvInfo(S.xp), chip = $('#lvChip');""", """/* レベルと XP を表示しないか（設定）。表示しなくても XP は裏でたまる */
function lvOff(){ return !!LVOFF(); }
function renderLv(anim){
  document.body.classList.toggle('nolv', lvOff());
  const x = lvInfo(S.xp), chip = $('#lvChip');"""),
    ("""function celebrate(from, to){
""", """function celebrate(from, to){
  if(lvOff()) return;
"""),
]
E = COMMON + [
    ("""function lvOff(){ return !!LVOFF(); }""", """function lvOff(){ return !!S.hideLv; }"""),
    ("""S.exAud = c.exAud || 'btn'; }""", """S.exAud = c.exAud || 'btn'; S.hideLv = !!c.hideLv; }"""),
    ("""exAud:S.exAud })""", """exAud:S.exAud, hideLv:!!S.hideLv })"""),
    ("""    <div class="card set"><label>英語の例文の音声</label>""", """    <div class="card set"><label>レベルと XP</label>
      <div class="seg" id="sLv"><button class="${!S.hideLv?'on':''}" data-v="0">表示する</button><button class="${S.hideLv?'on':''}" data-v="1">表示しない</button></div>
      <p class="dim" style="margin:8px 0 0">""" + SET_NOTE + """（単語・熟語で共通）</p></div>
    <div class="card set"><label>英語の例文の音声</label>"""),
    ("""  $$('#sExAud button').forEach(""", """  $$('#sLv button').forEach(b => b.onclick = () => { S.hideLv = b.dataset.v === '1'; save(); renderAll(); renderSet(); });
  $$('#sExAud button').forEach("""),
]
K = COMMON + [
    ("""function lvOff(){ return !!LVOFF(); }""", """function lvOff(){ return !!S.cfg.hideLv; }"""),
    ("""    <div class="card set"><label>例文のふりがな</label>""", """    <div class="card set"><label>レベルと XP</label>
      <div class="seg" id="sLv"><button class="${!S.cfg.hideLv?'on':''}" data-v="0">表示する</button><button class="${S.cfg.hideLv?'on':''}" data-v="1">表示しない</button></div>
      <p class="dim" style="margin:8px 0 0">""" + SET_NOTE + """</p></div>
    <div class="card set"><label>例文のふりがな</label>"""),
    ("""  $$('#sRuby button').forEach(""", """  $$('#sLv button').forEach(b => b.onclick = () => { S.cfg.hideLv = b.dataset.v === '1'; save(); renderAll(); renderSet(); });
  $$('#sRuby button').forEach("""),
    # 報告文のレベルと XP も出さない
    ("""　Lv.${x0.lv}（${rankOf(x0.lv)}）` + (d === today() ? `　今日 +${todayXP()} XP` : '');""",
     """` + (lvOff() ? '' : `　Lv.${x0.lv}（${rankOf(x0.lv)}）` + (d === today() ? `　今日 +${todayXP()} XP` : ''));"""),
]


def bump(d, html):
    m = re.search(r"const VER = (\d+);", html); v = int(m.group(1)); nv = v + 1
    html = html.replace(m.group(0), f"const VER = {nv};", 1)
    sw = (d / 'sw.js').read_text()
    sw2, k = re.subn(r"('[a-z0-9]+-v)(\d+)(')", lambda mm: f"{mm.group(1)}{nv}{mm.group(3)}", sw, count=1)
    assert k == 1, d.name
    (d / 'sw.js').write_text(sw2)
    (d / 'version.json').write_text('{ "v": %d, "note": "レベルと XP を表示しない設定" }\n' % nv)
    return html, v, nv


for app, reps in [(a, E) for a in EIKEN] + [('kobun', K)]:
    d = ROOT / app; f = d / 'index.html'; html = f.read_text()
    if 'id="sLv"' in html: print(app, 'すでに入っています'); continue
    for old, new in reps:
        c = html.count(old)
        if c != 1: sys.exit(f'{app}: {c}か所 → {old[:60]!r}')
        html = html.replace(old, new)
    # 使い方スライドの「レベルアップ」に一言
    html, c = re.subn(r"(\{ t:'レベルアップ', p:\[[^\n]*?)'\]", r"\1','いらないときは、「設定」の<b>レベルと XP</b>で「表示しない」にできます。']", html, count=1)
    if c != 1: sys.exit(f'{app}: 使い方スライドが見つからない')
    html, v, nv = bump(d, html)
    f.write_text(html); print(app, f'v{v} → v{nv}')
