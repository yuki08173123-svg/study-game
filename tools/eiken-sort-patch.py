#!/usr/bin/env python3
"""英検アプリ（5/4/3/準2/2/準1級）に「仕分け」を入れる（古文単語350 v18 と同じ仕組み・塾生Yuuyの声）。
完璧に知っている単語・熟語を外す。「完璧に知ってる」を押したら意味を見せて、合っていたら外す。
使い方: python3 tools/eiken-sort-patch.py   （study-game で実行。すでに入っている級はとばす）"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
APPS = ['eiken-5', 'eiken-4', 'eiken-3', 'eiken-p2', 'eiken-2', 'eiken-p1']

R = []  # (old, new)
def rep(old, new): R.append((old, new))

# --- CSS ---
rep("""/* 印刷用カード */""", """/* 仕分け（古文単語 v18 と同じ・塾生の声） */
.srtb{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.srtb .btn{margin:0;padding:15px 8px;line-height:1.3}
.srtb .btn small{display:block;font-size:12px;font-weight:400;opacity:.9}
.btn.know{background:#fff;border:2px solid #9AA8BA;color:var(--ink)}
.btn.out{background:#5B6B80;color:#fff}
.srtq{text-align:center;margin:0 0 8px;font-weight:700}
.dot.ex{background:#9AA8BA}
.cell.exd{background:#9AA8BA!important;color:#fff}
.exlink{display:block;margin:6px auto 0;color:var(--muted);font-size:13px;text-decoration:underline;padding:4px}

/* 印刷用カード */""")

# --- 単位・仕分けの関数 ---
rep("""const BNAME = IDIOM ? '熟語' : '単語';""", """const BNAME = IDIOM ? '熟語' : '単語';
const UNIT = IDIOM ? '個' : '語';""")
rep("""function ws(i){ return S.w[i] || (S.w[i] = { c:0, x:0, sk:0, st:0, due:'' }); }
load();""", """function ws(i){ return S.w[i] || (S.w[i] = { c:0, x:0, sk:0, st:0, due:'' }); }
/* 仕分け（塾生の声）：完璧に知っているものは ex＝外した。外したものは Day のカード・一覧・解説・テスト・リマインドに出ない */
function isEx(i){ return !!(S.w[i] && S.w[i].ex); }
function isSorted(i){ return !!(S.w[i] && (S.w[i].srt || S.w[i].ex)); }
function exCount(){ let c = 0; for(let i=0;i<N;i++) if(isEx(i)) c++; return c; }
function unsortedIds(){ return W.filter(w => !isSorted(w.i)).map(w => w.i); }
load();""")
rep("""  return { n, lap, d, from, to, date: addDays(S.start, n), ids: range(from, to) };""",
    """  const ids = range(from, to).filter(i => !isEx(i));
  return { n, lap, d, from, to, date: addDays(S.start, n), ids, exN: to - from - ids.length };""")
rep("""function dueList(){ const t = today(); return W.filter(w => { const s = S.w[w.i]; return s && s.due && s.due <= t; }).map(w => w.i); }
function stateDot(i){
  const s = S.w[i];
""", """function dueList(){ const t = today(); return W.filter(w => { const s = S.w[w.i]; return s && !s.ex && s.due && s.due <= t; }).map(w => w.i); }
function cntText(p){ return p.ids.length + UNIT + (p.exN ? `・外した${p.exN}${UNIT}をのぞく` : ''); }
function stateDot(i){
  const s = S.w[i];
  if(s && s.ex) return 'ex';
""")
rep("""['テストで全問正解（10問以上）', 10],""", """['テストで全問正解（10問以上）', 10], ['仕分け 10' + UNIT + 'ごと', 2],""")

# --- 今日タブ ---
rep("""（${p.to - p.from}${IDIOM ? '個' : '語'}）　予定日""", """（${cntText(p)}）　予定日""")
rep("""テスト ${p.to - p.from}問<small>""", """テスト ${p.ids.length}問<small>""")
rep("""  el.innerHTML = order + hero + lvCardHTML() + remind""", """  const uns = unsortedIds().length, exn = exCount();
  const sortCard = uns ? `<div class="card remind"><div class="num" style="color:var(--ai);font-size:26px">${uns}<small>${UNIT}</small></div>
    <div style="flex:1"><h3>仕分け</h3><div class="dim">完璧に知っている${BNAME}を外して、覚えるものだけにします。${exn ? `<br>外した${BNAME} ${exn}${UNIT}` : ''}</div></div>
    <button class="btn" style="width:auto;padding:12px 16px" id="goSort">仕分け</button></div>` : '';
  el.innerHTML = order + hero + sortCard + lvCardHTML() + remind""")
rep("""  if($('#goRemind')) $('#goRemind').onclick = startRemind;
  if($('#goIdiom'))""", """  if($('#goRemind')) $('#goRemind').onclick = startRemind;
  if($('#goSort')) $('#goSort').onclick = () => startSort(unsortedIds().slice(0, SORTN), '仕分け');
  if($('#goIdiom'))""")

# --- 計画の表 ---
rep("""    if(r){ const rate = r.ok / r.n;""", """    if(r && !r.n) return `<button class="cell d exd" data-n="${n}">外</button>`;
    if(r){ const rate = r.ok / r.n;""")
rep("""<span>数字＝1回目の正答率</span></div>';
  return h;""", """<span>数字＝1回目の正答率</span>' + (Object.values(S.days).some(r => !r.n) ? '<span><i style="background:#9AA8BA"></i>外＝ぜんぶ外した日</span>' : '') + '</div>';
  return h;""")

# --- Day のシート ---
rep("""（${p.to-p.from}${IDIOM ? '個' : '語'}）　予定日""", """（${cntText(p)}）　予定日""")
rep("""    ${r ? `<div class="note">1回目：""", """    ${r && !r.n ? `<div class="note">この日の${BNAME}は、ぜんぶ外したので完了にしました。</div>` : r ? `<div class="note">1回目：""")
rep("""    <button class="btn sub" data-a="print">印刷用のカードを作る</button></div>`);
  bg.querySelector('[data-a=test]').onclick = () => { bg.remove(); testOrStudy(n); };""",
    """    <button class="btn sub" data-a="print">印刷用のカードを作る</button>
    <button class="btn sub" data-a="sort">この日の${BNAME}を仕分け（完璧なものを外す）</button></div>`);
  bg.querySelector('[data-a=test]').onclick = () => { bg.remove(); testOrStudy(n); };
  bg.querySelector('[data-a=sort]').onclick = () => { bg.remove(); startSort(range(p.from, p.to), `Day${p.d} の仕分け`); };""")

# --- 単語タブ ---
rep("""['new','まだ']].map(([k,t]) =>""", """['new','まだ'],['ex','外した']].map(([k,t]) =>""")
rep("""  $('#wCards').onclick = () => { const ids = filteredIds(); if""", """  $('#wCards').onclick = () => { const ids = filteredIds().filter(i => wf.st === 'ex' || !isEx(i)); if""")
rep("""    if(wf.st === 'ng' && !(S.w[w.i] && S.w[w.i].due)) return false;""",
    """    if(wf.st === 'ex' && !isEx(w.i)) return false;
    if(wf.st === 'ng' && !(S.w[w.i] && S.w[w.i].due && !isEx(w.i))) return false;""")

# --- 詳しい画面 ---
rep("""    <button class="btn" data-a="play">▶ 1分解説（読み上げ）</button>`);
  fitSlide(bg);
  bindSpk(bg);""", """    <button class="btn" data-a="play">▶ 1分解説（読み上げ）</button>
    <button class="btn sub" data-a="exb">${isEx(i) ? `外した${BNAME}を、もとにもどす` : `完璧なので、この${BNAME}を外す`}</button>`);
  fitSlide(bg);
  bindSpk(bg);
  bg.querySelector('[data-a=exb]').onclick = () => { const x = ws(i); if(x.ex){ delete x.ex; toast('もとにもどしました'); } else { x.ex = 1; x.srt = 1; toast('「' + w.w + '」を外しました'); } save(); bg.remove(); renderAll(); };""")

# --- カード ---
rep("""  C.q = h.q; C.flip = false;
  if(h.a === 'yes')""", """  C.q = h.q; C.flip = false;
  if(h.a === 'ex'){ const s = S.w[h.i]; if(s){ delete s.ex; if(!h.srt) delete s.srt; } C.total++; save(); }
  if(h.a === 'yes')""")
rep("""      <button class="btn line" data-a="lesson" style="margin-top:8px">▶ この${BNAME}の1分解説</button>
    </div>`;""", """      <button class="btn line" data-a="lesson" style="margin-top:8px">▶ この${BNAME}の1分解説</button>
      <button class="exlink" data-a="ex">完璧に知っているので、この${BNAME}を外す</button>
    </div>`;""")
rep("""gainXP(1, '覚えた'); drawCard(); };
  ov.querySelector('[data-a=lesson]')""", """gainXP(1, '覚えた'); drawCard(); };
  ov.querySelector('[data-a=ex]').onclick = () => { const s = ws(i); C.hist.push({ q: C.q.slice(), a:'ex', i, srt: s.srt }); s.ex = 1; s.srt = 1; save(); C.q = C.q.filter(x => x !== i); C.total = Math.max(1, C.total - 1); C.flip = false; toast('「' + w.w + '」を外しました'); drawCard(); };
  ov.querySelector('[data-a=lesson]')""")

# --- テスト ---
rep("""function startDayTest(n){
  const p = plan(n);
""", """function startDayTest(n){
  const p = plan(n);
  if(!p.ids.length){   // ぜんぶ外した日は、テストなしで完了
    if(!S.days[n]){ S.days[n] = { d: today(), n:0, ok:0, secs:0, best:0 }; save(); }
    toast('この日の' + BNAME + 'はぜんぶ外したので、完了にしました'); renderAll(); return;
  }
""")
rep("""  const weak = W.filter(w => isWeak(w.i)).map(w => w.i);""", """  const weak = W.filter(w => isWeak(w.i) && !isEx(w.i)).map(w => w.i);""")
rep("""${plan(cur).to - plan(cur).from}問 はじめる""", """${plan(cur).ids.length}問 はじめる""")
rep("""    else { ids = weak; lab = 'シャッフル（苦手）'; }
""", """    else { ids = weak; lab = 'シャッフル（苦手）'; }
    ids = ids.filter(i => !isEx(i));
""")

# --- 覚えた時間の記録・閉じる ---
rep("""const KIND = { cards:'カード', list:'一覧', lesson:'1分解説' };""", """const KIND = { cards:'カード', list:'一覧', lesson:'1分解説', sort:'仕分け' };""")
rep("""if(!silent){ L = null; C = null; if(T)""", """if(!silent){ L = null; C = null; Q = null; if(T)""")

# --- 仕分けの画面 ---
rep("""/* ===================== 使い方スライド""", """/* ===================== 仕分け（塾生の声「最初の仕分けがほしい」・古文単語 v18 と同じ） =====================
   完璧に知っているものを外す。「完璧に知ってる」を押したら意味を見せて、合っていたかを確かめる（思いこみで外さないように）。 */
const SORTN = Math.min(PER, 50);   // 今日タブからは50ずつ
let Q = null;
function startSort(ids, title){
  if(!ids.length){ toast('仕分けする' + BNAME + 'がありません'); return; }
  closeOv();
  makeOv();
  Q = { ids: ids.slice(), k: 0, title, out: 0, keep: 0, check: false, hist: [] };
  sessStart('sort', ids);
  drawSort();
}
function drawSort(){
  const ov = $('.ov');
  if(Q.k >= Q.ids.length){ finishSort(); return; }
  const i = Q.ids[Q.k], w = W[i];
  ov.innerHTML = `<div class="ovbar"><button class="x" data-a="x">×</button><div class="ttl">${esc(Q.title)}</div><button class="undo" data-a="undo" ${Q.hist.length || Q.check ? '' : 'disabled'}>↶ 戻る</button><div class="tm">${Q.k+1} / ${Q.ids.length}</div></div>
    <div class="pbar"><i style="width:${Q.k / Q.ids.length * 100}%"></i></div>
    <div class="dim" style="text-align:center">外した <b>${Q.out}</b>　・　覚える <b>${Q.keep}</b></div>
    <div class="ovbody">
      <div class="fc"><div class="fc-in ${Q.check ? 'flip' : ''}">
        <div class="fc-face front"><span class="no">No.${i+1}　${esc(pname(w.p))}</span><div class="w ${isLong(w) ? 'long' : ''}">${esc(w.w)}</div><div class="k ph">${esc(w.ph || '')}</div><div class="face-top">${spkBtn(i)}</div></div>
        <div class="fc-face back"><div class="bw" style="font-weight:600">${esc(w.w)} <span class="ph" style="font-size:13px">${esc(w.ph || '')}</span></div>
          <div class="bm">${esc(w.m)}</div>${w.s.length ? `<div class="bs">ほかに：${w.s.map(esc).join('／')}</div>` : ''}</div>
      </div></div>
      ${Q.check ? `<p class="srtq">思っていた意味と、合っていた？</p>
        <div class="srtb"><button class="btn" data-a="keep">ちがった<small>覚える${BNAME}にする</small></button><button class="btn out" data-a="out">合っていた<small>完璧なので外す</small></button></div>`
      : `<div class="srtb"><button class="btn" data-a="keep">あやしい・知らない<small>覚える${BNAME}にする</small></button><button class="btn know" data-a="know">完璧に知ってる<small>意味を確かめて外す</small></button></div>`}
    </div>`;
  bindSpk(ov);
  if(!Q.check && S.cfg.autoSpk) speakWord(i, ov.querySelector('.front [data-spk]'));
  ov.querySelector('[data-a=x]').onclick = closeOv;
  ov.querySelector('[data-a=undo]').onclick = () => {
    if(Q.check){ Q.check = false; drawSort(); return; }
    const h = Q.hist.pop(); if(!h) return;
    Q.k = h.k; Q.out = h.out; Q.keep = h.keep;
    if(h.prev) S.w[h.i] = h.prev; else delete S.w[h.i];
    save(); drawSort();
  };
  const decide = out => {
    Q.hist.push({ k: Q.k, out: Q.out, keep: Q.keep, i, prev: S.w[i] ? JSON.parse(JSON.stringify(S.w[i])) : null });
    const s = ws(i); s.srt = 1;
    if(out){ s.ex = 1; Q.out++; } else { delete s.ex; Q.keep++; }
    Q.k++; Q.check = false; save();
    if(Q.k % 10 === 0) gainXP(2, '仕分け');
    drawSort();
  };
  ov.querySelector('[data-a=keep]').onclick = () => decide(false);
  if(ov.querySelector('[data-a=out]')) ov.querySelector('[data-a=out]').onclick = () => decide(true);
  if(ov.querySelector('[data-a=know]')) ov.querySelector('[data-a=know]').onclick = () => { Q.check = true; drawSort(); };
}
function finishSort(){
  const ov = $('.ov'), q = Q, more = unsortedIds();
  stopSpk();
  ov.innerHTML = `<div class="ovbar"><button class="x" data-a="x">×</button><div class="ttl">${esc(q.title)}</div></div>
    <div class="ovbody"><div class="res"><div class="pct">✓</div><p><b>${q.ids.length}${UNIT}の仕分けが終わりました</b></p>
      <div class="meta"><span>外した ${q.out}${UNIT}</span><span>覚える ${q.keep}${UNIT}</span></div>
      <p class="dim">外した${BNAME}は「一覧」タブの「外した」で見られます。もとにもどすこともできます。</p></div>
      ${more.length ? `<button class="btn" data-a="more">つづけて次の${Math.min(SORTN, more.length)}${UNIT}を仕分け（のこり ${more.length}${UNIT}）</button>` : ''}
      <button class="btn sub" data-a="x2">閉じる</button></div>`;
  Q = null;
  ov.querySelector('[data-a=x]').onclick = closeOv; ov.querySelector('[data-a=x2]').onclick = closeOv;
  if(ov.querySelector('[data-a=more]')) ov.querySelector('[data-a=more]').onclick = () => startSort(unsortedIds().slice(0, SORTN), '仕分け');
  renderAll();
}

/* ===================== 使い方スライド""")

# --- 使い方スライド ---
rep("""    { t:'① 覚える時間',""", """    { t:'はじめに：仕分け', p:['「今日」の<b>仕分け</b>で、順番に見て<b>完璧に知っているものは外します</b>。','「完璧に知ってる」を押すと意味が出るので、<b>合っていたら外す</b>。外したものは、カード・一覧・テストに出なくなります（「一覧」タブの「外した」から、もとにもどせます）。'],
      v:`<div class="srtb"><span class="btn" style="font-size:14px">あやしい・知らない<small>覚える${BNAME}にする</small></span><span class="btn know" style="font-size:14px">完璧に知ってる<small>意味を確かめて外す</small></span></div>` },
    { t:'① 覚える時間',""")


def bump(d, html):
    m = re.search(r"const VER = (\d+);", html)
    v = int(m.group(1)); nv = v + 1
    html = html.replace(m.group(0), f"const VER = {nv};", 1)
    sw = (d / 'sw.js').read_text()
    sw2, k = re.subn(r"('[a-z0-9]+-v)(\d+)(')", lambda mm: f"{mm.group(1)}{nv}{mm.group(3)}", sw, count=1)
    assert k == 1, f'{d.name}: sw.js のキャッシュ名が見つからない'
    (d / 'sw.js').write_text(sw2)
    (d / 'version.json').write_text('{ "v": %d, "note": "仕分け（完璧に知っているものを外す・意味を確かめてから）" }\n' % nv)
    return html, v, nv


for app in APPS:
    d = ROOT / app
    f = d / 'index.html'
    html = f.read_text()
    if 'function startSort(' in html:
        print(app, 'すでに入っています'); continue
    for old, new in R:
        c = html.count(old)
        if c != 1:
            sys.exit(f'{app}: {c}か所 → {old[:70]!r}')
        html = html.replace(old, new)
    html, v, nv = bump(d, html)
    f.write_text(html)
    print(app, f'v{v} → v{nv}')
