#!/usr/bin/env python3
"""英検アプリ（5/4/3/準2/2/準1級）に、塾生Yuuyの声（2026-10-10）の2つを入れる。
  1. 1日の数を「設定」で変えられる（単語 50/100/150/200、熟語 25/50/100 ＋ もとの数）。
     途中で変えても、いまの続きから進む（終えた日は表で「済」）。
  2. 少しずつ進める：その日の範囲を 10 か 20 ずつに分けて「覚える → すぐテスト」。
     全部の区切りをテストしたら、その日のテストも完了（1回目の正答率を合計して表に）。
使い方: python3 tools/eiken-per-patch.py   （study-game で実行。すでに入っている級はとばす）"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
APPS = ['eiken-5', 'eiken-4', 'eiken-3', 'eiken-p2', 'eiken-2', 'eiken-p1']

R = []  # (old, new) 文字列の置きかえ（1か所だけあること）
X = []  # (pattern, repl) 正規表現の置きかえ（級ごとに数がちがうところ）
def rep(old, new): R.append((old, new))
def rex(pat, repl): X.append((pat, repl))

# --- CSS ---
rep("""/* 印刷用カード */""", """/* 少しずつ進める（塾生の声：10〜20ずつ 覚える→すぐテスト） */
.parts{margin-top:12px;position:relative;z-index:1;background:rgba(255,255,255,.08);border-radius:14px;padding:10px 12px}
.parts .pt{font-size:14px;font-weight:700;margin-bottom:8px}
.parts .pt small{font-weight:400;font-size:12.5px;opacity:.85;margin-left:4px}
.pgr{display:grid;grid-template-columns:repeat(auto-fill,minmax(62px,1fr));gap:6px}
.pc{background:rgba(255,255,255,.14);color:#fff;border-radius:10px;padding:7px 0;font-size:11.5px;font-weight:700;line-height:1.25;text-align:center;white-space:nowrap;letter-spacing:-.02em}
.pc small{display:block;font-weight:400;font-size:11px;opacity:.9;min-height:1.25em}
.pc.next{background:#fff;color:var(--ai)}
.pc.next small{opacity:1;font-weight:700}
.cell.mvd{background:#AEB9C7!important;color:#fff}

/* 印刷用カード */""")

# --- 1日の数（設定で変えられる） ---
rex(r"const PER = IDIOM \? (\d+) : (\d+);[^\n]*\nconst DAYS = Math\.ceil\(N / PER\);[^\n]*",
    r"""const PERS0 = { w:\2, i:\1 };              // もとの1日の数（単語\2語・熟語\1個）
const PER0 = PERS0[BOOK];
const PER_OPTS = [...new Set([...(IDIOM ? [25, 50, 100] : [50, 100, 150, 200]), PER0])].sort((a, b) => a - b);
let PER = PER0, DAYS = Math.ceil(N / PER);  // 1日の数は設定で変えられる（塾生の声）。load で決める""")
rex(r"const KEY = '(\w+_)' \+ BOOK \+ '(_v\d+)' \+ SFX;",
    r"const keyOf = b => '\1' + b + '\2' + SFX;\nconst KEY = keyOf(BOOK);")
rep("""laps: 8, autoSpk:true }, w:{}, days:{},""", """laps: 8, autoSpk:true, chunk:20 }, w:{}, days:{}, parts:{},""")
rep("""  setLaps(S.cfg.laps);
}""", """  S.parts = S.parts || {};
  PER = PER_OPTS.includes(+S.cfg.per) ? +S.cfg.per : PER0; DAYS = Math.ceil(N / PER);
  setLaps(S.cfg.laps);
}
/* 単語・熟語それぞれの1日の数（もう一方の記録から読む） */
function perOf(b){ if(b === BOOK) return PER; try{ const c = (JSON.parse(localStorage.getItem(keyOf(b))) || {}).cfg || {}; return +c.per || PERS0[b]; }catch(e){ return PERS0[b]; } }""")
rex(r"const w = JSON\.parse\(localStorage\.getItem\('\w+_w_v\d+' \+ SFX\)\) \|\| \{\};\n    const total = \d+ \* \(\(w\.cfg && w\.cfg\.laps\) \|\| 8\);",
    "const w = JSON.parse(localStorage.getItem(keyOf('w'))) || {};\n    const total = Math.ceil((window.EIKEN_WORDS || []).length / perOf('w')) * ((w.cfg && w.cfg.laps) || 8);")
rex(r"'(<div class=\"steps\"><button class=\"step main\" id=\"goIdiom\"><span class=\"n\">→</span><span class=\"t\">熟語\d+に進む<small>)1日\d+個 × \d+日で1周(</small></span></button></div>)'",
    r"`\g<1>1日${perOf('i')}個 × ${Math.ceil((window.EIKEN_IDIOMS || []).length / perOf('i'))}日で1周\2`")

# --- 計画の表：1日の数を変える前に終えた日は「済」 ---
rep("""    if(r && !r.n) return `<button class="cell d exd" data-n="${n}">外</button>`;""",
    """    if(r && r.mv) return `<button class="cell d mvd" data-n="${n}">済</button>`;
    if(r && !r.n) return `<button class="cell d exd" data-n="${n}">外</button>`;""")
rep("""(Object.values(S.days).some(r => !r.n) ?""",
    """(Object.values(S.days).some(r => r.mv) ? '<span><i style="background:#AEB9C7"></i>済＝1日の数を変える前に終えた日</span>' : '') + (Object.values(S.days).some(r => !r.n && !r.mv) ?""")
rep("""    ${r && !r.n ? `<div class="note">""", """    ${r && r.mv ? `<div class="note">1日の数を変える前に終えた範囲です（済）。</div>` : r && !r.n ? `<div class="note">""")

# --- 今日タブ：少しずつ進める ---
rep("""<button id="stLessons">1分解説だけ</button></div></div>`;""",
    """<button id="stLessons">1分解説だけ</button></div>${partsHTML(n)}</div>`;""")
rep("""    $('#stTest').onclick = () => testOrStudy(n);
  }""", """    $('#stTest').onclick = () => testOrStudy(n);
    el.querySelectorAll('.pc').forEach(b => b.onclick = () => openPart(n, +b.dataset.k));
  }""")
rep("""function rateColor(r){""", """/* 少しずつ進める（塾生の声：200語ぜんぶ見てからでなく、10〜20ずつ覚えて すぐテスト）。
   S.parts[n].t[i] ＝ その語の1回目の答え（1＝正解・0＝まちがい）。全部そろったら その日のテストも完了。 */
function chunksOf(n){
  const p = plan(n), c = +S.cfg.chunk, r = [];
  if(!c) return r;
  for(let a = p.from; a < p.to; a += c){ const b = Math.min(p.to, a + c); r.push({ a, b, ids: range(a, b).filter(i => !isEx(i)) }); }
  return r;
}
function partInfo(n, ch){
  const t = (S.parts[n] || {}).t || {}, got = ch.ids.filter(i => i in t);
  return { done: got.length === ch.ids.length, n: got.length, ok: got.filter(i => t[i]).length };
}
function nextPart(n){ return chunksOf(n).findIndex(ch => ch.ids.length && !partInfo(n, ch).done); }
function partsHTML(n){
  const cs = chunksOf(n);
  if(cs.length < 2) return '';
  const nk = nextPart(n);
  return `<div class="parts"><div class="pt">少しずつ進める<small>${S.cfg.chunk}${UNIT}ずつ「覚える → すぐテスト」</small></div><div class="pgr">${cs.map((ch, k) => {
    const f = partInfo(n, ch), rate = f.n ? f.ok / f.n : 0, done = ch.ids.length && f.done;
    return `<button class="pc ${k === nk ? 'next' : ''}" data-k="${k}" style="${done ? 'background:' + rateColor(rate) : ''}">${ch.a+1}〜${ch.b}<small>${!ch.ids.length ? '外' : done ? Math.round(rate*100) + '%' : k === nk ? 'つぎ' : ''}</small></button>`;
  }).join('')}</div></div>`;
}
function partLabel(n, ch){ const p = plan(n); return `第${p.lap}周 Day${p.d}（${ch.a+1}〜${ch.b}）`; }
function partCards(n, k){
  const ch = chunksOf(n)[k]; if(!ch || !ch.ids.length) return;
  openCards(ch.ids, `Day${plan(n).d} の ${ch.a+1}〜${ch.b}`, null, () => startPartTest(n, k));
}
function startPartTest(n, k){
  const ch = chunksOf(n)[k]; if(!ch || !ch.ids.length) return;
  startTest({ ids: ch.ids, type:'part', plan:n, label: partLabel(n, ch) });
}
function openPart(n, k){
  const ch = chunksOf(n)[k]; if(!ch) return;
  if(!ch.ids.length){ toast('この範囲は、ぜんぶ外しています'); return; }
  const f = partInfo(n, ch), lab = `Day${plan(n).d} の ${ch.a+1}〜${ch.b}`;
  const bg = sheet(`<h2>${lab}</h2>
    <p>${ch.ids.length}${UNIT}を覚えて、<b>すぐテスト</b>します。${f.done ? `<br><span class="dim">1回目：${f.ok} / ${f.n}問 正解（${Math.round(f.ok / f.n * 100)}%）</span>` : ''}</p>
    <div style="margin-top:12px"><button class="btn" data-a="cards">カードで覚える → テスト</button>
    <button class="btn sub" data-a="list">一覧で覚える</button>
    <button class="btn sub" data-a="lesson">1分解説で覚える</button>
    <button class="btn line" data-a="test">覚えたので、テスト ${ch.ids.length}問</button></div>`);
  bg.querySelector('[data-a=cards]').onclick = () => { bg.remove(); partCards(n, k); };
  bg.querySelector('[data-a=list]').onclick = () => { bg.remove(); openList(ch.ids, lab + ' の一覧'); };
  bg.querySelector('[data-a=lesson]').onclick = () => { bg.remove(); openLessonPicker(ch.ids, lab + ' の1分解説'); };
  bg.querySelector('[data-a=test]').onclick = () => { bg.remove(); startPartTest(n, k); };
}
function rateColor(r){""")

# --- テストの結果 ---
rep("""    else r.best = Math.max(r.best ?? r.ok, T.ok);
  }""", """    else r.best = Math.max(r.best ?? r.ok, T.ok);
  }
  let partDay = false;
  if(T.type === 'part'){   // 少しずつ：1回目の答えだけ残す。その日の分がそろったら Day も完了
    const pr = S.parts[T.plan] || (S.parts[T.plan] = { t:{}, secs:0 });
    let fresh = false;
    T.ids.forEach(i => { if(!(i in pr.t)){ pr.t[i] = T.wrong.includes(i) ? 0 : 1; fresh = true; } });
    if(fresh) pr.secs += secs;
    const ids = plan(T.plan).ids;
    if(!S.days[T.plan] && ids.every(i => i in pr.t)){
      const ok = ids.filter(i => pr.t[i]).length;
      S.days[T.plan] = { d: today(), n: ids.length, ok, secs: pr.secs, best: ok, parts:1 };
      bonus.push(['Dayクリア', 20]); partDay = true;
    }
  }""")
rep("""  const ov = $('.ov'), wrong = [...new Set(T.wrong)], keep = T;""",
    """  const ov = $('.ov'), wrong = [...new Set(T.wrong)], keep = T;
  const nk = T.type === 'part' && !S.days[T.plan] ? nextPart(T.plan) : -1, nch = nk >= 0 ? chunksOf(T.plan)[nk] : null;""")
rep("""      <button class="btn line" data-a="copy" style="margin-top:10px">報告用にコピー</button>""",
    """      ${nch ? `<button class="btn" data-a="nextp" style="margin-top:10px">つぎの ${nch.a+1}〜${nch.b} へ（覚える → テスト）</button>` : ''}
      ${partDay ? `<div class="note" style="text-align:center;margin-top:10px">Day${plan(keep.plan).d} の分が、ぜんぶおわりました！</div>` : ''}
      <button class="btn line" data-a="copy" style="margin-top:10px">報告用にコピー</button>""")
rep("""  ov.querySelector('[data-a=copy]').onclick = () => copyText(report, 'コピーしました');""",
    """  ov.querySelector('[data-a=copy]').onclick = () => copyText(report, 'コピーしました');
  if(nch) ov.querySelector('[data-a=nextp]').onclick = () => partCards(keep.plan, nk);""")
rep("""const TYPE = { day:'Day', remind:'リマインド', shuffle:'シャッフル', retry:'やり直し' };""",
    """const TYPE = { day:'Day', part:'少しずつ', remind:'リマインド', shuffle:'シャッフル', retry:'やり直し' };""")

# --- 設定：1日の数・少しずつ ---
rex(r"\$\{IDIOM \? '熟語は、単語を完走してから始めるのがおすすめです。' : '[^']*'\}",
    "${IDIOM ? '熟語は、単語を完走してから始めるのがおすすめです。' : ''}")
rep("""      <p class="dim" style="margin:8px 0 0">1日${PER}${IDIOM ? '個' : '語'} × ${DAYS}日 = 1周。""",
    """      <label style="margin-top:12px">1日の数</label>
      <div class="seg" id="sPer">${PER_OPTS.map(n => `<button class="${PER===n?'on':''}" data-n="${n}">${n}${UNIT}</button>`).join('')}</div>
      <p class="dim" style="margin:8px 0 0">1日${PER}${IDIOM ? '個' : '語'} × ${DAYS}日 = 1周。""")
rep("""    <div class="card set"><label>発音</label>""",
    """    <div class="card set"><label>少しずつ進める（覚える → すぐテスト）</label>
      <div class="seg" id="sChunk">${[[10,'10ずつ'],[20,'20ずつ'],[0,'使わない']].map(([c,t]) => `<button class="${+S.cfg.chunk===c?'on':''}" data-c="${c}">${t}</button>`).join('')}</div>
      <p class="dim" style="margin:8px 0 0">「今日」で、その日の${BNAME}を${S.cfg.chunk || 20}${UNIT}ずつに分けて、覚えたらすぐテストできます。全部の区切りをテストすると、その日のテストも完了です。</p></div>
    <div class="card set"><label>発音</label>""")
rep("""  $$('#sLaps button').forEach(b => b.onclick = () => { S.cfg.laps = +b.dataset.n; setLaps(S.cfg.laps); save(); renderAll(); renderSet(); });""",
    """  $$('#sLaps button').forEach(b => b.onclick = () => { S.cfg.laps = +b.dataset.n; setLaps(S.cfg.laps); save(); renderAll(); renderSet(); });
  $$('#sPer button').forEach(b => b.onclick = () => askPer(+b.dataset.n));
  $$('#sChunk button').forEach(b => b.onclick = () => { S.cfg.chunk = +b.dataset.c; save(); renderAll(); renderSet(); });""")
rep("""function switchBook(b){""", """/* 1日の数を変える（塾生の声）。いまの続きの位置（第何周の No.いくつ）から、新しい区切りで進める。
   それまでに終えた日は「済」にする（テストの記録・1つずつの状態・リマインドはそのまま）。遅れ・先取りの日数も変えない。 */
function applyPer(np){
  const c = curN(), nd = Math.ceil(N / np);
  const c2 = c >= TOTAL ? LAPS * nd : Math.floor(c / DAYS) * nd + Math.floor(Math.min(N, (c % DAYS) * PER) / np);
  if(c > 0){ S.oldPlans = (S.oldPlans || []).concat([{ at: today(), per: PER, days: S.days }]); S.start = addDays(S.start, c - c2); S.startSet = true; }
  S.days = {}; for(let k = 0; k < c2; k++) S.days[k] = { d: today(), n:0, ok:0, secs:0, best:0, mv:1 };
  S.parts = {}; S.cfg.per = np; PER = np; DAYS = nd; setLaps(LAPS);
  save(); renderAll(); renderSet(); toast(`1日${np}${UNIT}にしました`);
}
function askPer(np){
  if(np === PER) return;
  const c = curN();
  if(c === 0 && !Object.keys(S.parts).length){ applyPer(np); return; }
  const p = c < TOTAL ? plan(c) : null;
  const bg = sheet(`<h2>1日 ${np}${UNIT} にしますか？</h2>
    <p>いまの続き（${p ? `第${p.lap}周 No.${p.from+1} から` : '完走'}）から、1日${np}${UNIT}で進みます。</p>
    <div class="note">表の区切りが変わるので、これまで終えた日は「済」になります。テストの記録・まちがえた${BNAME}のリマインドは、そのまま残ります。</div>
    <div style="margin-top:14px"><button class="btn" data-a="ok">1日 ${np}${UNIT} にする</button><button class="btn sub" data-a="no">やめる</button></div>`);
  bg.querySelector('[data-a=ok]').onclick = () => { bg.remove(); applyPer(np); };
  bg.querySelector('[data-a=no]').onclick = () => bg.remove();
}
function switchBook(b){""")

# --- 使い方スライド ---
rep("""'その日にやる範囲は「今日」タブに出ます。遅れても大丈夫。次にやる日から続きが出ます。'""",
    """'その日にやる範囲は「今日」タブに出ます。遅れても大丈夫。次にやる日から続きが出ます。','<b>1日の数は「設定」で変えられます</b>。多すぎるときは減らしてOK。'""")
rep("""'まちがえたものだけ、すぐにもう一度。「報告用にコピー」で、勉強報告にそのまま貼れます。',""",
    """'まちがえたものだけ、すぐにもう一度。「報告用にコピー」で、勉強報告にそのまま貼れます。','<b>少しずつ進める</b>：「今日」の <b>1〜20</b> などを押すと、その分だけ覚えて<b>すぐテスト</b>できます。全部おわると、その日のテストも完了です。',""")


def bump(d, html):
    m = re.search(r"const VER = (\d+);", html)
    v = int(m.group(1)); nv = v + 1
    html = html.replace(m.group(0), f"const VER = {nv};", 1)
    sw = (d / 'sw.js').read_text()
    sw2, k = re.subn(r"('[a-z0-9]+-v)(\d+)(')", lambda mm: f"{mm.group(1)}{nv}{mm.group(3)}", sw, count=1)
    assert k == 1, f'{d.name}: sw.js のキャッシュ名が見つからない'
    (d / 'sw.js').write_text(sw2)
    (d / 'version.json').write_text('{ "v": %d, "note": "1日の数を変えられる・少しずつ（10〜20ずつ）覚えてすぐテスト" }\n' % nv)
    return html, v, nv


for app in APPS:
    d = ROOT / app
    f = d / 'index.html'
    html = f.read_text()
    if 'function chunksOf(' in html:
        print(app, 'すでに入っています'); continue
    for pat, repl in X:
        html, c = re.subn(pat, repl, html)
        if c != 1:
            sys.exit(f'{app}: 正規表現 {c}か所 → {pat[:70]!r}')
    for old, new in R:
        c = html.count(old)
        if c != 1:
            sys.exit(f'{app}: {c}か所 → {old[:70]!r}')
        html = html.replace(old, new)
    html, v, nv = bump(d, html)
    f.write_text(html)
    print(app, f'v{v} → v{nv}')
