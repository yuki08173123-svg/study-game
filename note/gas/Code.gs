/*  学びメモ — 毎日メールの しくみ（Google Apps Script）
 *  つかいかた:
 *    1. script.new をひらいて この中身を ぜんぶ はりつける
 *    2. 下の SECRET を じぶんの あいことば に かえる
 *    3. デプロイ → 新しいデプロイ → ウェブアプリ（実行:自分／アクセス:全員）
 *    4. 出てきた URL を アプリの設定に はりつける
 *    5. 関数えらびで setup を えらんで 実行（毎朝のメールが はじまる）
 */

const SECRET   = 'kaeru2026';   // ← アプリに入れる あいことば（かならず かえる）
const MAIL_TO  = '';            // 空なら じぶんのGmailあて。別のアドレスに送るなら ここに書く
const MAIL_N   = 5;             // 1通に入れる件数
const MAIL_HOUR= 7;             // 何時台に とどけるか（0〜23）
const APP_URL  = 'https://yuki08173123-svg.github.io/study-game/note/';

const HEAD = ['id','created','updated','kind','src','url','title','body','tags',
              'star','arc','del','mailedAt','mailCount','revCount'];
const KIND_JA = { audio:'🎧 音声', youtube:'📺 動画', lecture:'🎓 講義', book:'📖 読書', other:'💭 その他' };

/* ---------- シート ---------- */
function sheet_(){
  const pr = PropertiesService.getScriptProperties();
  let id = pr.getProperty('SHEET_ID'), ss;
  if(id){ try{ ss = SpreadsheetApp.openById(id); }catch(e){ ss = null; } }
  if(!ss){
    ss = SpreadsheetApp.create('学びメモ データ');
    pr.setProperty('SHEET_ID', ss.getId());
  }
  let sh = ss.getSheetByName('notes');
  if(!sh){
    sh = ss.insertSheet('notes');
    sh.getRange(1,1,1,HEAD.length).setValues([HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function sheetUrl(){
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const url = id ? 'https://docs.google.com/spreadsheets/d/' + id : '(まだ ありません)';
  Logger.log(url); return url;
}
function mailAddr_(){ return MAIL_TO || Session.getEffectiveUser().getEmail(); }

function rows_(sh){
  const last = sh.getLastRow();
  if(last < 2) return [];
  const v = sh.getRange(2,1,last-1,HEAD.length).getValues();
  return v.map((r,i) => { const o = { _row: i+2 }; HEAD.forEach((h,j) => o[h] = r[j]); return o; });
}

/* ---------- 受け口 ---------- */
function doGet(){ return json_({ ok:true, msg:'学びメモ サーバーは 動いています' }); }

function doPost(e){
  try{
    const b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if(String(b.key || '') !== SECRET) return json_({ ok:false, error:'あいことばが ちがいます' });
    if(b.action === 'ping'){
      const sh = sheet_();
      return json_({ ok:true, mail: mailAddr_(), count: Math.max(0, sh.getLastRow()-1), sheet: sheetUrl() });
    }
    if(b.action === 'sync'){
      const n = upsert_(b.notes || []);
      return json_({ ok:true, n: n });
    }
    return json_({ ok:false, error:'action が ふめいです' });
  }catch(err){
    return json_({ ok:false, error:String(err) });
  }
}
function json_(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- 保存（id で 上書き） ---------- */
function upsert_(list){
  if(!list.length) return 0;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try{
    const sh = sheet_();
    const map = {};
    rows_(sh).forEach(r => map[String(r.id)] = r);
    const adds = [];
    list.forEach(n => {
      const line = [
        n.id, n.cre||'', n.upd||'', n.kind||'other', n.src||'', n.url||'',
        n.title||'', n.body||'', (n.tags||[]).join(' '),
        n.star?1:'', n.arc?1:'', n.del?1:'', '', '', n.rev||0
      ];
      const cur = map[String(n.id)];
      if(cur){
        line[12] = cur.mailedAt || '';   // メール履歴は のこす
        line[13] = cur.mailCount || '';
        sh.getRange(cur._row, 1, 1, HEAD.length).setValues([line]);
      }else{
        adds.push(line);
      }
    });
    if(adds.length) sh.getRange(sh.getLastRow()+1, 1, adds.length, HEAD.length).setValues(adds);
    return list.length;
  } finally { lock.releaseLock(); }
}

/* ---------- 毎朝のメール ---------- */
function sendDaily(){
  const sh = sheet_();
  const all = rows_(sh).filter(r => r.id && !r.del && !r.arc && (r.title || r.body));
  if(!all.length) return;

  // メールに出た回数が少なく、久しく出ていないものを 優先 → その中から ランダム
  all.sort((a,b) => (Number(a.mailCount||0) - Number(b.mailCount||0)) ||
                    (Number(a.mailedAt||0)  - Number(b.mailedAt||0)));
  const head = all.slice(0, Math.max(MAIL_N * 3, MAIL_N));
  for(let i = head.length-1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); const t=head[i]; head[i]=head[j]; head[j]=t; }
  const pick = head.slice(0, MAIL_N);

  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'M月d日(E)');
  MailApp.sendEmail({
    to: mailAddr_(),
    subject: `📚 きょうの学びメモ ${MAIL_N}件（${today}）`,
    htmlBody: html_(pick, all.length),
    body: text_(pick)
  });

  const t = Date.now();
  pick.forEach(r => {
    sh.getRange(r._row, 13).setValue(t);
    sh.getRange(r._row, 14).setValue(Number(r.mailCount||0) + 1);
  });
}

function html_(list, total){
  const C = { bg:'#f6f4ef', surf:'#ffffff', ink:'#1d2128', ink2:'#4a5261', dim:'#8a92a3', line:'#e5e1d8', pri:'#5b53d6' };
  const bar = { audio:'#8b5cf6', youtube:'#e5484d', lecture:'#3b82f6', book:'#1f9d63', other:'#8a92a3' };
  let s = `<div style="background:${C.bg};padding:22px 12px;font-family:-apple-system,'Hiragino Sans','Noto Sans JP',sans-serif">
  <div style="max-width:600px;margin:0 auto">
    <div style="font-size:19px;font-weight:800;color:${C.ink};letter-spacing:-.02em">📚 きょうの学びメモ</div>
    <div style="font-size:12px;color:${C.dim};margin:4px 0 18px">
      ${Utilities.formatDate(new Date(),'Asia/Tokyo','yyyy年M月d日')}　ぜんぶで ${total}件 の中から ${list.length}件</div>`;
  list.forEach((r,i) => {
    const k = KIND_JA[r.kind] || KIND_JA.other;
    const col = bar[r.kind] || bar.other;
    const body = String(r.body||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>');
    const ttl  = String(r.title||'（見出しなし）').replace(/&/g,'&amp;').replace(/</g,'&lt;');
    const tags = String(r.tags||'').split(' ').filter(String)
      .map(t => `<span style="display:inline-block;background:#eceafc;color:${C.pri};border-radius:99px;padding:2px 10px;font-size:11px;font-weight:700;margin-right:5px">#${t}</span>`).join('');
    s += `<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.surf};border:1px solid ${C.line};border-radius:14px;margin-bottom:12px;overflow:hidden">
      <tr><td width="5" style="background:${col}"></td>
      <td style="padding:15px 16px">
        <div style="font-size:11px;color:${C.dim};font-weight:700;margin-bottom:5px">${i+1}. ${k}${r.src ? '　'+String(r.src).replace(/</g,'&lt;') : ''}</div>
        <div style="font-size:16px;font-weight:800;color:${C.ink};line-height:1.5;margin-bottom:7px">${ttl}</div>
        <div style="font-size:14px;color:${C.ink2};line-height:1.85">${body}</div>
        ${tags ? `<div style="margin-top:10px">${tags}</div>` : ''}
        ${r.url ? `<div style="margin-top:9px;font-size:12px"><a href="${r.url}" style="color:${C.pri}">🔗 もとの場所をひらく</a></div>` : ''}
      </td></tr></table>`;
  });
  s += `<div style="text-align:center;margin-top:20px">
      <a href="${APP_URL}" style="display:inline-block;background:${C.pri};color:#fff;text-decoration:none;
        padding:12px 26px;border-radius:12px;font-weight:800;font-size:14px">学びメモを ひらく</a></div>
    <div style="text-align:center;font-size:11px;color:${C.dim};margin-top:14px">思い出せなかったものは、アプリの「ふりかえり」で もう一度</div>
  </div></div>`;
  return s;
}
function text_(list){
  return list.map((r,i) => `${i+1}. ${r.title||'（見出しなし）'}\n${r.body||''}\n`).join('\n----------\n') + '\n\n' + APP_URL;
}

/* ---------- 毎朝の予約を セット（1回だけ 実行する） ---------- */
function setup(){
  ScriptApp.getProjectTriggers().forEach(t => {
    if(t.getHandlerFunction() === 'sendDaily') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDaily').timeBased().atHour(MAIL_HOUR).everyDays(1)
    .inTimezone('Asia/Tokyo').create();
  sheet_();
  Logger.log('毎朝 ' + MAIL_HOUR + '時台に ' + mailAddr_() + ' へ とどきます');
  Logger.log('データの置き場所: ' + sheetUrl());
}

/* ---------- いますぐ 1通 ためす ---------- */
function testMail(){ sendDaily(); Logger.log('送りました → ' + mailAddr_()); }
