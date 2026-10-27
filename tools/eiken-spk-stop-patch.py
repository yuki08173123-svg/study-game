#!/usr/bin/env python3
"""英検アプリ（5/4/3/準2/2/準1級）：発音・例文の音声が止まらず、1分解説（意味・訳・覚え方）まで流れる不具合を直す
（塾生Kiyonoriの声 2026-10-27：単語を覚えている途中やテストの途中で、突然、解説や覚え方の読み上げが始まる）。

原因：発音は1分解説の音声ファイルの頭（見出し語）だけを鳴らし、止めるのをタイマーだけに頼っていた。
タイマーは音が鳴り始める前から数えるので、読みこみが遅いと「止める」が先に来て、あとから鳴り始めた音が最後まで流れていた。
直し：playSeg() で、①再生位置（timeupdate）でも止める ②鳴り始めた時（playing）にタイマーを始める
③もう止めた音・次の音に替わった音が、あとから鳴り始めても止める ④#t=始め,終わり（ブラウザも終わりで止める）。
使い方: python3 tools/eiken-spk-stop-patch.py   （study-game で実行。すでに入っている級はとばす）"""
import re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
APPS = ['eiken-5', 'eiken-4', 'eiken-3', 'eiken-p2', 'eiken-2', 'eiken-p1']

def between(html, start, end):
    a = html.index(start); b = html.index(end, a)
    return html[a:b]

NEW_STOP = """function stopSpk(){ if(SPK){ SPK.dead = true; try{ SPK.a && SPK.a.pause(); }catch(e){} clearTimeout(SPK.t); SPK = null; } $$('.spk.on').forEach(b => b.classList.remove('on')); }
/* 音声ファイルの一部（st〜en 秒）だけを鳴らす（見出し語・例文）。止めるのはタイマーだけに頼らず、再生位置でも止める。
   塾生の声：読みこみが遅いと「止める」が先に来て、あとから鳴った音が解説・覚え方まで流れていた（2026-10-27） */
function playSeg(i, rec, st, en, done, fallback){
  const a = new Audio(AUD + noOf(i) + '.mp3?h=' + (rec.h || VER) + '#t=' + st + ',' + en);
  const x = SPK = { a, t: 0, dead: false };
  const fin = () => { x.dead = true; clearTimeout(x.t); try{ a.pause(); }catch(e){} if(SPK === x){ SPK = null; done(); } };
  const alive = () => !x.dead && SPK === x;
  const seek = () => { if(a.currentTime < st - .3 || a.currentTime > en) try{ a.currentTime = st; }catch(e){} };
  if(st > 0) try{ a.currentTime = st; }catch(e){}   // #t が効かない端末でも、その位置から
  a.addEventListener('loadedmetadata', () => { if(alive()) seek(); });
  a.addEventListener('playing', () => {
    if(!alive()){ try{ a.pause(); }catch(e){} return; }   // もう止めた音・次の音に替わった音は鳴らさない
    seek(); clearTimeout(x.t); x.t = setTimeout(fin, (en - st) * 1000 + 400);
  });
  a.addEventListener('timeupdate', () => { if(!alive() || a.currentTime >= en + .05) fin(); });
  a.addEventListener('ended', fin);
  x.t = setTimeout(fin, 8000);   // 8秒たっても鳴り始めなければ、あきらめる（あとから鳴っても止まる）
  a.play().catch(() => { if(alive()){ x.dead = true; clearTimeout(x.t); SPK = null; fallback(); } });
}
"""

for app in APPS:
    d = ROOT / app; f = d / 'index.html'; html = f.read_text()
    if 'function playSeg(' in html: print(app, 'すでに入っています'); continue
    old_stop = between(html, 'function stopSpk(){', '\nfunction speakWord(') + '\n'
    html = html.replace(old_stop, NEW_STOP, 1)
    # speakWord：音声ファイルの頭（区切り0〜1）
    sw_old = between(html, '  const rec = audRec(i);\n  if(S.cfg.voice !== false && S.cfg.voiceMode !== \'device\' && rec){\n    const a = new Audio(', '  ttsWord(i, done);\n}')
    html = html.replace(sw_old, """  const rec = audRec(i);
  if(S.cfg.voice !== false && S.cfg.voiceMode !== 'device' && rec){
    playSeg(i, rec, 0, rec.t[1] || 2, done, () => ttsWord(i, done));
    return;
  }
""", 1)
    # speakEx：例文（区切り2〜3）
    ex_old = between(html, '  if(S.cfg.voice !== false && S.cfg.voiceMode !== \'device\' && rec && rec.t.length > 3){\n    const st = rec.t[2]', '  ttsEx(i, done);\n}')
    html = html.replace(ex_old, """  if(S.cfg.voice !== false && S.cfg.voiceMode !== 'device' && rec && rec.t.length > 3){
    playSeg(i, rec, rec.t[2], rec.t[3], done, () => ttsEx(i, done));
    return;
  }
""", 1)
    assert html.count('playSeg(') == 3, app
    m = re.search(r"const VER = (\d+);", html); v = int(m.group(1)); nv = v + 1
    html = html.replace(m.group(0), f"const VER = {nv};", 1)
    sw = (d / 'sw.js').read_text()
    sw2, k = re.subn(r"('[a-z0-9]+-v)(\d+)(')", lambda mm: f"{mm.group(1)}{nv}{mm.group(3)}", sw, count=1); assert k == 1
    (d / 'sw.js').write_text(sw2)
    (d / 'version.json').write_text('{ "v": %d, "note": "発音のあと解説まで流れてしまう不具合を直した" }\n' % nv)
    f.write_text(html); print(app, f'v{v} → v{nv}')
