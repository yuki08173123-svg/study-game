#!/usr/bin/env python3
"""英検アプリ（5/4/3/準2/2/準1級）：英語の例文の音声（塾生ゆきの声 2026-10-12）。
1分解説の音声（見出し語・意味・例文・訳・覚え方・見出し語）から、例文の区切り（t[2]〜t[3]）だけを鳴らす。
「設定」の「例文の音声」で 使わない／ボタンで聞く／自動で鳴らす を選ぶ（単語・熟語で共通・COMMON に exAud）。
使い方: python3 tools/eiken-exaud-patch.py   （study-game で実行。すでに入っている級はとばす）"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
APPS = ['eiken-5', 'eiken-4', 'eiken-3', 'eiken-p2', 'eiken-2', 'eiken-p1']
R = []
def rep(old, new): R.append((old, new))

# --- 保存（単語・熟語で共通） ---
rep("""S.ftOpen = !!c.ftOpen; }""", """S.ftOpen = !!c.ftOpen; S.exAud = c.exAud || 'btn'; }
  if(!S.exAud) S.exAud = 'btn';""")
rep("""ftOpen:!!S.ftOpen })""", """ftOpen:!!S.ftOpen, exAud:S.exAud })""")

# --- CSS ---
rep(""".spk.on{background:var(--ai);color:#fff}""", """.spk.on{background:var(--ai);color:#fff}
.spk.ex{width:30px;height:30px;margin-left:6px;vertical-align:-6px}
.spk.ex svg{width:16px;height:16px}""")

# --- 鳴らす ---
rep("""function ttsWord(i, done){""", """/* 例文（英語）だけを鳴らす。音声ファイルの区切り2（例文）〜3（訳）のあいだ */
function speakEx(i, btn){
  stopSpk(); stopSpeech();
  if(btn) btn.classList.add('on');
  const done = () => { if(btn) btn.classList.remove('on'); };
  const rec = audRec(i);
  if(S.cfg.voice !== false && S.cfg.voiceMode !== 'device' && rec && rec.t.length > 3){
    const st = rec.t[2], en = rec.t[3];
    const a = new Audio(AUD + noOf(i) + '.mp3?h=' + (rec.h || VER) + '#t=' + st);
    const x = SPK = { a, t: 0 };
    const fin = () => { if(SPK !== x) return; clearTimeout(x.t); try{ a.pause(); }catch(e){} done(); SPK = null; };
    const seek = () => { if(a.currentTime < st - .3 || a.currentTime > en) a.currentTime = st; };
    try{ a.currentTime = st; }catch(e){}   // #t が効かない端末でも例文の位置から
    a.addEventListener('loadedmetadata', seek);
    a.addEventListener('playing', () => { if(SPK !== x) return; seek(); clearTimeout(x.t); x.t = setTimeout(fin, (en - st) * 1000 + 400); });
    a.addEventListener('timeupdate', () => { if(a.currentTime >= en + .05) fin(); });
    a.addEventListener('ended', fin);
    a.play().catch(() => { if(SPK === x){ stopSpk(); ttsEx(i, done); } });
    return;
  }
  ttsEx(i, done);
}
function ttsEx(i, done){
  if(!('speechSynthesis' in window)){ done && done(); return; }
  const u = sayUtter(exText(W[i]), 'en'); u.onend = u.onerror = () => done && done(); speechSynthesis.speak(u);
}
function exSpk(i){ return S.exAud === 'off' ? '' : `<span class="spk ex" role="button" aria-label="例文を聞く" data-exspk="${i}">${SPK_SVG}</span>`; }
function ttsWord(i, done){""")
rep("""function bindSpk(root){ root.querySelectorAll('[data-spk]').forEach(b => b.onclick = e => { e.stopPropagation(); speakWord(+b.dataset.spk, b); }); }""",
    """function bindSpk(root){
  root.querySelectorAll('[data-spk]').forEach(b => b.onclick = e => { e.stopPropagation(); speakWord(+b.dataset.spk, b); });
  root.querySelectorAll('[data-exspk]').forEach(b => b.onclick = e => { e.stopPropagation(); speakEx(+b.dataset.exspk, b); });
}""")

# --- 例文のとなりにボタン（カードのうら・詳しい画面） ---
rep("""<div class="bx"><span class="ex" style="font-weight:500">${exHTML(w)}</span><br>${ftBox(w)}</div>""",
    """<div class="bx"><span class="ex" style="font-weight:500">${exHTML(w)}</span>${exSpk(i)}<br>${ftBox(w)}</div>""")
rep("""<p style="margin:10px 0 0"><span style="font-family:var(--mincho)">${exHTML(w)}</span><br>${ftBox(w)}</p>""",
    """<p style="margin:10px 0 0"><span style="font-family:var(--mincho)">${exHTML(w)}</span>${exSpk(i)}<br>${ftBox(w)}</p>""")
# 自動：カードをうら返したら例文を鳴らす
rep("""  ov.querySelector('[data-a=flip]').onclick = () => { C.flip = !C.flip; ov.querySelector('.fc-in').classList.toggle('flip', C.flip); };""",
    """  ov.querySelector('[data-a=flip]').onclick = () => { C.flip = !C.flip; ov.querySelector('.fc-in').classList.toggle('flip', C.flip); if(C.flip && S.exAud === 'auto') speakEx(i, ov.querySelector('.back [data-exspk]')); else if(!C.flip) stopSpk(); };""")

# --- 設定 ---
rep("""    <div class="card set"><label>発音</label>""", """    <div class="card set"><label>英語の例文の音声</label>
      <div class="seg" id="sExAud">${[['off','使わない'],['btn','ボタンで聞く'],['auto','自動で鳴らす']].map(([k,t]) => `<button class="${S.exAud===k?'on':''}" data-k="${k}">${t}</button>`).join('')}</div>
      <p class="dim" style="margin:8px 0 0">「ボタンで聞く」は、例文の横のスピーカーを押すと例文を読みます。「自動で鳴らす」は、カードをうら返したときに例文を読みます（単語・熟語で共通）。</p></div>
    <div class="card set"><label>発音</label>""")
rep("""  $$('#sFt button').forEach(""", """  $$('#sExAud button').forEach(b => b.onclick = () => { S.exAud = b.dataset.k; save(); renderSet(); });
  $$('#sFt button').forEach(""")

# --- 使い方スライド ---
rep("""'1分解説は、スライドと音声で1つを約30秒で解説。英語はネイティブの声、意味や覚え方は日本語の声です。',""",
    """'1分解説は、スライドと音声で1つを約30秒で解説。英語はネイティブの声、意味や覚え方は日本語の声です。','<b>例文の音声</b>：例文の横のスピーカーで、英語の例文だけを聞けます（「設定」で 使わない／自動で鳴らす にもできます）。',""")


def bump(d, html):
    m = re.search(r"const VER = (\d+);", html)
    v = int(m.group(1)); nv = v + 1
    html = html.replace(m.group(0), f"const VER = {nv};", 1)
    sw = (d / 'sw.js').read_text()
    sw2, k = re.subn(r"('[a-z0-9]+-v)(\d+)(')", lambda mm: f"{mm.group(1)}{nv}{mm.group(3)}", sw, count=1)
    assert k == 1
    (d / 'sw.js').write_text(sw2)
    (d / 'version.json').write_text('{ "v": %d, "note": "英語の例文の音声（使わない／ボタン／自動）" }\n' % nv)
    return html, v, nv

for app in APPS:
    d = ROOT / app; f = d / 'index.html'; html = f.read_text()
    if 'function speakEx(' in html: print(app, 'すでに入っています'); continue
    for old, new in R:
        c = html.count(old)
        if c != 1: sys.exit(f'{app}: {c}か所 → {old[:70]!r}')
        html = html.replace(old, new)
    html, v, nv = bump(d, html)
    f.write_text(html); print(app, f'v{v} → v{nv}')
