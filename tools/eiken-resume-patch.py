#!/usr/bin/env python3
"""英検アプリ（5/4/3/準2/2/準1級）：利用者の声（2026-11-09・LINE）の3つ。
  1. 単語を読み上げたあとに関係のない音が入る → 発音・例文は区切りの 0.28 秒手前で止める
     （止めるのが区切りより 0.4 秒ほど遅く、次の日本語の頭が聞こえていた。区切りの前の無音は見出し語0.6秒以上・例文0.33秒以上）。
  2. 200語テストを途中でやめると最初から → 1問ごとに途中を保存。中断しても、次に同じテストを始めると「続きから」を選べる。
     「今日」にも「中断したテスト」のカードを出す。
  3. 予定より先に進んだら、この先の予定日と完走予定を前に詰める（設定で選ぶ・はじめは「そのまま」）。
使い方: python3 tools/eiken-resume-patch.py   （study-game で実行。すでに入っている級はとばす）"""
import re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
APPS = ['eiken-5', 'eiken-4', 'eiken-3', 'eiken-p2', 'eiken-2', 'eiken-p1']
R = [
    # --- 1. 音を区切りの少し手前で止める ---
    ("""function playSeg(i, rec, st, en, done, fallback){
  const a = new Audio(""", """function playSeg(i, rec, st, en0, done, fallback){
  const en = +Math.max(st + .3, en0 - .28).toFixed(2);   // 区切りの少し手前で止める（次の日本語の頭が聞こえないように・区切りの前は無音）
  const a = new Audio("""),
    ("""x.t = setTimeout(fin, (en - st) * 1000 + 400);""", """x.t = setTimeout(fin, Math.max(.1, en - a.currentTime) * 1000);"""),
    ("""a.addEventListener('timeupdate', () => { if(!alive() || a.currentTime >= en + .05) fin(); });""",
     """a.addEventListener('timeupdate', () => { if(!alive() || a.currentTime >= en) fin(); });"""),
    # --- 2. テストの途中を保存して、続きから ---
    ("""function startTest(o){
  if(S.timer) endStudy(true);
  closeOv();
  const dir = S.cfg.dir === 'mix' ? null : S.cfg.dir;
  T = { ...o, order: shuffle(o.ids), k:0, ok:0, wrong:[], t0: Date.now(), dir, answered:false, timer:null, xp:0, xp0: S.xp };""",
     """/* テストの途中を保存（利用者の声：200語テストを途中でやめると最初からになる）。1問ごとに S.resume に残し、
   次に同じテストを始めるとき「続きから」を選べる。やり直し（retry）は残さない。 */
function saveResume(){
  if(!T || T.type === 'retry') return;
  const k = T.k + (T.answered ? 1 : 0);
  if(k <= 0 || k >= T.order.length) return;
  S.resume = { type: T.type, plan: T.plan ?? null, label: T.label, ids: T.ids, order: T.order, k, ok: T.ok, wrong: T.wrong.slice(), secs: Math.round((Date.now() - T.t0) / 1000), at: today() };
  save();
}
function resumeCardHTML(){
  const r = S.resume; if(!r) return '';
  return `<div class="card remind"><div class="num" style="font-size:22px">${r.k}<small>/${r.order.length}</small></div>
    <div style="flex:1"><h3>中断したテスト</h3><div class="dim">${esc(r.label)}　${r.k}問まで解いています（${r.ok}問正解）</div></div>
    <button class="btn" style="width:auto;padding:12px 16px" id="goResume">続きから</button></div>`;
}
function resumeTest(){
  const r = S.resume; if(!r) return;
  startTest({ ids: r.ids, type: r.type, plan: r.plan ?? undefined, label: r.label, resume: r });
}
function startTest(o){
  const r = S.resume;
  if(!o.resume && r && r.type === o.type && r.label === o.label && r.k > 0 && r.k < r.order.length){
    const bg = sheet(`<h2>続きからにしますか？</h2>
      <p>${esc(r.label)}　<b>${r.k} / ${r.order.length}問</b>まで解いています（${r.ok}問正解）。</p>
      <div style="margin-top:14px"><button class="btn" data-a="go">続きから（${r.k + 1}問目から）</button><button class="btn sub" data-a="new">最初から</button></div>`);
    bg.querySelector('[data-a=go]').onclick = () => { bg.remove(); startTest({ ...o, resume: r }); };
    bg.querySelector('[data-a=new]').onclick = () => { bg.remove(); S.resume = null; save(); startTest({ ...o, resume: true }); };
    return;
  }
  if(S.timer) endStudy(true);
  closeOv();
  const dir = S.cfg.dir === 'mix' ? null : S.cfg.dir;
  const rs = o.resume && o.resume.order ? o.resume : null;
  T = { ...o, order: rs ? rs.order.slice() : shuffle(o.ids), k: rs ? rs.k : 0, ok: rs ? rs.ok : 0, wrong: rs ? rs.wrong.slice() : [], t0: Date.now() - (rs ? rs.secs * 1000 : 0), dir, answered:false, timer:null, xp:0, xp0: S.xp };
  delete T.resume;"""),
    ("""    if(!confirm('テストを中断しますか？（ここまでの結果は記録されません）')) return;
    clearInterval(T.timer); T = null; closeOv();""",
     """    if(!confirm('テストを中断しますか？\\nここまでの答えは保存されます。次にこのテストを始めると、続きからできます。')) return;
    saveResume(); clearInterval(T.timer); T = null; closeOv(); renderAll();"""),
    ("""  T.k++;
  if(T.k < T.order.length) drawQ(); else finishTest();""", """  T.k++;
  if(T.k < T.order.length){ saveResume(); drawQ(); } else finishTest();"""),
    ("""function finishTest(){
  clearInterval(T.timer);""", """function finishTest(){
  clearInterval(T.timer);
  if(S.resume && S.resume.type === T.type && S.resume.label === T.label) S.resume = null;"""),
    ("""  el.innerHTML = order + hero + sortCard""", """  el.innerHTML = order + resumeCardHTML() + hero + sortCard"""),
    ("""  if($('#goRemind')) $('#goRemind').onclick = startRemind;""", """  if($('#goRemind')) $('#goRemind').onclick = startRemind;
  if($('#goResume')) $('#goResume').onclick = resumeTest;"""),
    # --- 3. 先に進んだら予定を前に詰める ---
    ("""function renderToday(){
  const el = $('#tab-today');""", """/* 予定より先に進んだら、この先の予定日（と完走予定）を前に詰める（設定 cfg.pull・利用者の声）。遅れたときは動かさない */
function pullAhead(){
  if(!S.cfg.pull) return;
  const c = curN(); if(c <= 0 || c >= TOTAL) return;
  const t = today(), doneToday = Object.values(S.days).some(r => r.d === t && !r.mv);
  const cd = doneToday ? addDays(t, 1) : t;
  if(cd < plan(c).date){ S.start = addDays(cd, -c); S.startSet = true; save(); }
}
function renderToday(){
  pullAhead();
  const el = $('#tab-today');"""),
    ("""      <label style="margin-top:12px">1日の数</label>""", """      <label style="margin-top:12px">予定より先に進んだら</label>
      <div class="seg" id="sPull"><button class="${S.cfg.pull?'on':''}" data-v="1">予定日を前に詰める</button><button class="${!S.cfg.pull?'on':''}" data-v="0">そのまま</button></div>
      <p class="dim" style="margin:8px 0 0">「前に詰める」にすると、先に進んだ日数だけ、この先の予定日と完走予定が早くなります。</p>
      <label style="margin-top:12px">1日の数</label>"""),
    ("""  $$('#sPer button').forEach(""", """  $$('#sPull button').forEach(b => b.onclick = () => { S.cfg.pull = b.dataset.v === '1'; pullAhead(); save(); renderAll(); renderSet(); });
  $$('#sPer button').forEach("""),
]
for app in APPS:
    d = ROOT / app; f = d / 'index.html'; html = f.read_text()
    if 'function saveResume(' in html: print(app, 'すでに入っています'); continue
    for old, new in R:
        c = html.count(old)
        if c != 1: sys.exit(f'{app}: {c}か所 → {old[:70]!r}')
        html = html.replace(old, new)
    # 使い方スライド（② テスト）に一言
    html, c = re.subn(r"(\{ t:'② テスト', p:\[[^\n]*?)'\]", r"\1','途中でやめても、答えは保存されます。次に同じテストを始めると<b>続きから</b>できます。']", html, count=1)
    if c != 1: sys.exit(f'{app}: 使い方スライドが見つからない')
    m = re.search(r"const VER = (\d+);", html); v = int(m.group(1)); nv = v + 1
    html = html.replace(m.group(0), f"const VER = {nv};", 1)
    sw = (d / 'sw.js').read_text()
    sw2, k = re.subn(r"('[a-z0-9]+-v)(\d+)(')", lambda mm: f"{mm.group(1)}{nv}{mm.group(3)}", sw, count=1); assert k == 1
    (d / 'sw.js').write_text(sw2)
    (d / 'version.json').write_text('{ "v": %d, "note": "テストの続きから・発音のあとの余計な音・先に進んだら予定を詰める" }\n' % nv)
    f.write_text(html); print(app, f'v{v} → v{nv}')
