/* 兄弟で1台を使う「使う人」の切りかえ（全アプリ共通・2026-10-04）
   ─────────────────────────────────────────────
   使い方（各アプリ）：
     1) <head> の中、ほかのどの <script> よりも前に
          <script src="../common/users.js?v=1" data-app="アプリの名前"></script>
        （トップの暗記クエストだけ src="common/users.js?v=1"）
     2) 設定画面のどこかに  <div data-users-card></div>   （「使う人」の欄が自動で入る）
     3) 見出しのどこかに    <button data-users-tag></button>（2人以上のとき、いまの人の名前が出る）
   しくみ：
     ・1人目は、今までの保存場所のまま（入れる前の記録はそのまま1人目になる）。
     ・2人目からは、localStorage のキーと IndexedDB のデータベース名のうしろに「__u…」をつけて分ける
       （Storage.prototype と IDBFactory.prototype を包むので、アプリ側のコードは変えなくてよい）。
     ・切りかえたらページを読みなおす。消せるのは2人目から（1人目の記録は各アプリの「記録を消す」で）。 */
(function(){
  'use strict';
  var me = document.currentScript;
  var APP = (me && me.getAttribute('data-app')) || location.pathname.replace(/\/index\.html$/, '').split('/').filter(Boolean).pop() || 'root';
  var UKEY = 'sgusers_' + APP;
  var SP = Storage.prototype;
  var rawGet = SP.getItem, rawSet = SP.setItem, rawRem = SP.removeItem;
  function rget(k){ try{ return rawGet.call(localStorage, k); }catch(e){ return null; } }
  function rset(k, v){ try{ rawSet.call(localStorage, k, v); }catch(e){} }

  var reg = null;
  try{ reg = JSON.parse(rget(UKEY)); }catch(e){}
  if(!reg || !Array.isArray(reg.list) || !reg.list.length) reg = { list:[{ id:'', name:'' }], cur:'' };
  if(!reg.list.some(function(u){ return u.id === reg.cur; })) reg.cur = reg.list[0].id;
  var SFX = reg.cur ? '__' + reg.cur : '';
  var frozen = false;   // いまの人を消したあとは、閉じる前の自動保存をさせない

  /* ---- 保存場所を人ごとに分ける ---- */
  var IP = window.IDBFactory ? IDBFactory.prototype : null;
  var rawOpen = IP && IP.open, rawDel = IP && IP.deleteDatabase;   // 包む前の関数（消すときに使う）
  if(SFX){
    var map = function(store, k){ k = String(k); return (store === window.localStorage && k !== UKEY) ? k + SFX : k; };
    SP.getItem = function(k){ return rawGet.call(this, map(this, k)); };
    SP.setItem = function(k, v){ if(frozen && this === window.localStorage) return; return rawSet.call(this, map(this, k), v); };
    SP.removeItem = function(k){ return rawRem.call(this, map(this, k)); };
    if(IP){
      IP.open = function(name, ver){ return ver === undefined ? rawOpen.call(this, name + SFX) : rawOpen.call(this, name + SFX, ver); };
      IP.deleteDatabase = function(name){ return rawDel.call(this, name + SFX); };
    }
  }
  function delDBsOf(id){
    // その人の IndexedDB（名前が __id で終わるもの）を消す
    var end = '__' + id;
    try{
      if(rawDel && window.indexedDB && indexedDB.databases){
        return indexedDB.databases().then(function(list){
          (list || []).forEach(function(d){ if(d.name && d.name.slice(-end.length) === end){ try{ rawDel.call(indexedDB, d.name); }catch(e){} } });
        }).catch(function(){});
      }
    }catch(e){}
    return Promise.resolve();
  }

  /* ---- 名簿 ---- */
  function save(){ rset(UKEY, JSON.stringify(reg)); }
  function cur(){ for(var i = 0; i < reg.list.length; i++) if(reg.list[i].id === reg.cur) return reg.list[i]; return reg.list[0]; }
  function nameOf(u){ u = u || cur(); return (u.name || '').trim() || (reg.list.indexOf(u) + 1) + '人目'; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function go(id){ reg.cur = id; save(); location.reload(); }
  function add(){
    var name = '';
    try{ name = (prompt('ふやす人の名前（例：弟）') || '').trim().slice(0, 10); }catch(e){}
    var id = 'u' + Date.now().toString(36);
    reg.list.push({ id:id, name:name }); go(id);
  }
  function removeCur(){
    var u = cur();
    if(!u.id) return;
    if(!confirm('「' + nameOf(u) + '」の記録をすべて消します（元に戻せません）。よろしいですか？')) return;
    frozen = true;
    var ks = [];
    try{ for(var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if(k && k.slice(-('__' + u.id).length) === '__' + u.id) ks.push(k); } }catch(e){}
    ks.forEach(function(k){ try{ rawRem.call(localStorage, k); }catch(e){} });
    reg.list = reg.list.filter(function(x){ return x.id !== u.id; });
    reg.cur = reg.list[0].id; save();
    delDBsOf(u.id).then(function(){ location.reload(); });
  }

  /* ---- 画面 ---- */
  var css = '.sgu-tag{flex:none;max-width:6.5em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:999px;padding:5px 10px;font:700 13px/1.2 inherit;background:rgba(127,127,127,.18);color:inherit;border:0;cursor:pointer}'
    + '.sgu-tag[hidden]{display:none!important}'
    + '@media (max-width:480px){header:has(.sgu-tag:not([hidden])) h1{white-space:nowrap}header:has(.sgu-tag:not([hidden])) h1 small{display:none}header:has(.sgu-tag:not([hidden])) .lvchip i{display:none}}'
    + '.sgu-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:14px 16px;border-radius:14px;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;font:inherit;cursor:pointer;margin:0 0 12px}'
    + '.sgu-row b{font-weight:700}.sgu-row small{display:block;font-size:12.5px;opacity:.75;font-weight:400;margin-top:2px}.sgu-row .sgu-ar{margin-left:auto;opacity:.6;font-size:18px}'
    + '.sgu-bg{position:fixed;inset:0;z-index:2147483000;background:rgba(20,16,10,.45);display:flex;align-items:flex-end;justify-content:center}'
    + '.sgu-sh{background:#FBF8F2;color:#1F1A16;width:100%;max-width:560px;border-radius:22px 22px 0 0;padding:16px 18px calc(18px + env(safe-area-inset-bottom));font-family:"BIZ UDPGothic",system-ui,sans-serif;font-size:16px;line-height:1.6;max-height:88vh;overflow-y:auto}'
    + '.sgu-sh h2{margin:2px 0 10px;font-size:19px}.sgu-sh p{margin:8px 0;font-size:14px;color:#5A5046}'
    + '.sgu-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 12px}.sgu-chips button{padding:8px 14px;border-radius:999px;border:0;background:#EAE2D2;color:#5A5046;font:700 15px inherit;font-family:inherit;cursor:pointer}.sgu-chips button.on{background:#2B3A67;color:#fff}'
    + '.sgu-name{display:flex;gap:8px;align-items:center}.sgu-name span{white-space:nowrap;font-size:14px;color:#5A5046}.sgu-name input{flex:1;min-width:0;padding:10px 12px;border-radius:12px;border:1px solid #DCD2BF;background:#fff;font:16px inherit;font-family:inherit;color:#1F1A16}'
    + '.sgu-b{display:block;width:100%;padding:13px;border-radius:14px;border:0;font:700 16px inherit;font-family:inherit;cursor:pointer;margin-top:10px;background:#EAE2D2;color:#1F1A16}.sgu-b.del{background:transparent;border:1.5px solid #B63E2B;color:#B63E2B}';
  function addCSS(){ if(document.getElementById('sgu-css')) return; var s = document.createElement('style'); s.id = 'sgu-css'; s.textContent = css; (document.head || document.documentElement).appendChild(s); }

  function openSheet(){
    addCSS();
    var many = reg.list.length > 1, u = cur();
    var bg = document.createElement('div'); bg.className = 'sgu-bg';
    bg.innerHTML = '<div class="sgu-sh"><h2>使う人（兄弟で1台を使うとき）</h2>'
      + '<div class="sgu-chips">' + reg.list.map(function(x){ return '<button data-id="' + esc(x.id) + '" class="' + (x.id === reg.cur ? 'on' : '') + '">' + esc(nameOf(x)) + '</button>'; }).join('') + '<button data-add="1">＋ ふやす</button></div>'
      + '<div class="sgu-name"><span>いまの人の名前</span><input maxlength="10" value="' + esc(u.name || '') + '" placeholder="' + esc(nameOf(u)) + '"></div>'
      + '<p>記録・計画・レベルなどは、人ごとに分かれます。名前を押すと、その人に切りかわります。' + (many ? '' : '1人で使うときは、何もしなくてOKです。') + '</p>'
      + (u.id ? '<button class="sgu-b del" data-del="1">「' + esc(nameOf(u)) + '」を消す</button>' : '')
      + '<button class="sgu-b" data-close="1">閉じる</button></div>';
    document.body.appendChild(bg);
    var close = function(){ bg.remove(); };
    bg.addEventListener('click', function(e){ if(e.target === bg) close(); });
    bg.querySelector('[data-close]').onclick = close;
    Array.prototype.forEach.call(bg.querySelectorAll('[data-id]'), function(b){ b.onclick = function(){ var id = b.getAttribute('data-id'); if(id !== reg.cur) go(id); }; });
    bg.querySelector('[data-add]').onclick = add;
    var inp = bg.querySelector('input');
    inp.onchange = function(){ cur().name = inp.value.trim().slice(0, 10); save(); paint(); };
    var d = bg.querySelector('[data-del]'); if(d) d.onclick = removeCur;
  }

  function paint(){
    addCSS();
    var many = reg.list.length > 1;
    Array.prototype.forEach.call(document.querySelectorAll('[data-users-tag]'), function(t){
      if(!t.classList.contains('sgu-tag')){ t.classList.add('sgu-tag'); t.type = 'button'; t.setAttribute('aria-label', '使う人'); t.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); openSheet(); }); }
      if(many){ t.hidden = false; if(t.textContent !== nameOf()) t.textContent = nameOf(); } else t.hidden = true;
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-users-card]'), function(c){
      var html = '<button type="button" class="sgu-row"><span style="font-size:22px">👥</span><span><b>使う人：' + esc(nameOf()) + '</b><small>' + (many ? reg.list.length + '人で使っています。押すと切りかえ・ふやす' : '兄弟で1台を使うときは、ここで人をふやせます') + '</small></span><span class="sgu-ar">›</span></button>';
      if(c.getAttribute('data-sgu') !== html){ c.innerHTML = html; c.setAttribute('data-sgu', html); c.firstChild.onclick = openSheet; }
    });
  }
  // アプリが画面を描きなおしても、目印（data-users-card / data-users-tag）があれば入れなおす
  var pending = false;
  function schedule(){ if(pending) return; pending = true; setTimeout(function(){ pending = false; paint(); }, 0); }
  function start(){ paint(); try{ new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true }); }catch(e){} }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.SGUsers = { app: APP, list: function(){ return reg.list.slice(); }, current: cur, name: function(){ return nameOf(); }, many: function(){ return reg.list.length > 1; }, open: openSheet, suffix: SFX };
})();
