/*  学びメモ — 毎日メール配信（Google Apps Script）
 *  設定手順:
 *    1. script.new を開き、この内容をすべて貼り付ける
 *    2. 下の SECRET を自分の合言葉に書き換える
 *    3. デプロイ → 新しいデプロイ → ウェブアプリ（実行: 自分／アクセス: 全員）
 *    4. 表示されたURLをアプリの設定に貼り付ける
 *    5. 関数 setup を一度だけ実行する（毎朝の配信が始まる）
 */

const SECRET   = 'kaeru2026';   // ← アプリに入力する合言葉（必ず変更する）
const MAIL_TO  = '';            // 空なら自分のGmail宛。別アドレスに送るならここに記入
const MAIL_N   = 5;             // 1通に含める件数
const MAIL_HOUR= 7;             // 配信する時刻（0〜23、その時間台に届く）
const APP_URL  = 'https://yuki08173123-svg.github.io/study-game/note/';

const HEAD = ['id','created','updated','body','star','del','mailedAt','mailCount','revCount'];

/* ---------- シート ---------- */
function sheet_(){
  const pr = PropertiesService.getScriptProperties();
  let id = pr.getProperty('SHEET_ID'), ss = null;
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
    sh.setColumnWidth(4, 520);
  }
  return sh;
}
function sheetUrl(){
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const url = id ? 'https://docs.google.com/spreadsheets/d/' + id : '(未作成)';
  Logger.log(url); return url;
}
function mailAddr_(){ return MAIL_TO || Session.getEffectiveUser().getEmail(); }

function rows_(sh){
  const last = sh.getLastRow();
  if(last < 2) return [];
  return sh.getRange(2,1,last-1,HEAD.length).getValues()
    .map((r,i) => { const o = { _row: i+2 }; HEAD.forEach((h,j) => o[h] = r[j]); return o; });
}

/* ---------- 受け口 ---------- */
function doGet(){ return json_({ ok:true, msg:'学びメモのサーバーは稼働しています' }); }

function doPost(e){
  try{
    const b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if(String(b.key || '') !== SECRET) return json_({ ok:false, error:'合言葉が違います' });
    if(b.action === 'ping'){
      const sh = sheet_();
      return json_({ ok:true, mail: mailAddr_(), count: Math.max(0, sh.getLastRow()-1), sheet: sheetUrl() });
    }
    if(b.action === 'sync') return json_({ ok:true, n: upsert_(b.notes || []) });
    return json_({ ok:false, error:'actionが不正です' });
  }catch(err){
    return json_({ ok:false, error:String(err) });
  }
}
function json_(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- 保存（idで上書き） ---------- */
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
      const line = [n.id, n.cre||'', n.upd||'', n.body||'', n.star?1:'', n.del?1:'', '', '', n.rev||0];
      const cur = map[String(n.id)];
      if(cur){
        line[6] = cur.mailedAt || '';    // 配信履歴は残す
        line[7] = cur.mailCount || '';
        sh.getRange(cur._row, 1, 1, HEAD.length).setValues([line]);
      }else{
        adds.push(line);
      }
    });
    if(adds.length) sh.getRange(sh.getLastRow()+1, 1, adds.length, HEAD.length).setValues(adds);
    return list.length;
  } finally { lock.releaseLock(); }
}

/* ---------- 毎朝の配信 ---------- */
function sendDaily(){
  const sh = sheet_();
  const all = rows_(sh).filter(r => r.id && !r.del && String(r.body||'').trim());
  if(!all.length) return;

  // 配信回数が少なく、久しく送っていないものを優先し、その中からランダムに選ぶ
  all.sort((a,b) => (Number(a.mailCount||0) - Number(b.mailCount||0)) ||
                    (Number(a.mailedAt||0)  - Number(b.mailedAt||0)));
  const head = all.slice(0, Math.max(MAIL_N * 3, MAIL_N));
  for(let i = head.length-1; i > 0; i--){
    const j = Math.floor(Math.random()*(i+1)); const t = head[i]; head[i] = head[j]; head[j] = t;
  }
  const pick = head.slice(0, MAIL_N);

  MailApp.sendEmail({
    to: mailAddr_(),
    subject: '学びメモ ' + pick.length + '件（' + Utilities.formatDate(new Date(),'Asia/Tokyo','M月d日(E)') + '）',
    htmlBody: html_(pick, all.length),
    body: text_(pick)
  });

  const t = Date.now();
  pick.forEach(r => {
    sh.getRange(r._row, 7).setValue(t);
    sh.getRange(r._row, 8).setValue(Number(r.mailCount||0) + 1);
  });
}

function html_(list, total){
  const C = { bg:'#f6f4ef', surf:'#ffffff', ink:'#1d2128', ink2:'#4a5261', dim:'#8a92a3', line:'#e5e1d8', pri:'#5b53d6' };
  let s = '<div style="background:' + C.bg + ';padding:24px 12px;font-family:-apple-system,\'Hiragino Sans\',\'Noto Sans JP\',sans-serif">'
        + '<div style="max-width:600px;margin:0 auto">'
        + '<div style="font-size:18px;font-weight:800;color:' + C.ink + ';letter-spacing:-.02em">学びメモ</div>'
        + '<div style="font-size:12px;color:' + C.dim + ';margin:4px 0 18px">'
        + Utilities.formatDate(new Date(),'Asia/Tokyo','yyyy年M月d日')
        + '　全' + total + '件から' + list.length + '件</div>';
  list.forEach(function(r, i){
    const body = String(r.body||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>');
    s += '<table width="100%" cellpadding="0" cellspacing="0" style="background:' + C.surf
       + ';border:1px solid ' + C.line + ';border-radius:14px;margin-bottom:12px">'
       + '<tr><td style="padding:16px 18px">'
       + '<div style="font-size:11px;color:' + C.dim + ';font-weight:700;margin-bottom:7px">'
       + (i+1) + '　' + Utilities.formatDate(new Date(Number(r.created)||Date.now()),'Asia/Tokyo','yyyy/M/d') + '</div>'
       + '<div style="font-size:15px;color:' + C.ink + ';line-height:1.9">' + body + '</div>'
       + '</td></tr></table>';
  });
  s += '<div style="text-align:center;margin-top:22px">'
     + '<a href="' + APP_URL + '" style="display:inline-block;background:' + C.pri
     + ';color:#fff;text-decoration:none;padding:12px 26px;border-radius:12px;font-weight:800;font-size:14px">学びメモを開く</a></div>'
     + '<div style="text-align:center;font-size:11px;color:' + C.dim + ';margin-top:14px">'
     + '思い出せなかったものは、アプリの「振り返り」で確認してください</div></div></div>';
  return s;
}
function text_(list){
  return list.map(function(r,i){ return (i+1) + '. ' + String(r.body||''); }).join('\n\n----------\n\n') + '\n\n' + APP_URL;
}

/* ---------- 毎朝の配信を登録（一度だけ実行する） ---------- */
function setup(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction() === 'sendDaily') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDaily').timeBased().atHour(MAIL_HOUR).everyDays(1)
    .inTimezone('Asia/Tokyo').create();
  sheet_();
  Logger.log('毎朝' + MAIL_HOUR + '時台に ' + mailAddr_() + ' へ配信します');
  Logger.log('データの保存先: ' + sheetUrl());
}

/* ---------- 今すぐ1通テスト送信 ---------- */
function testMail(){ sendDaily(); Logger.log('送信しました → ' + mailAddr_()); }
