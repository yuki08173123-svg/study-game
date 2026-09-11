/* ===========================================================
   計画マップ「同期」スクリプト

   アプリのデータ（1人分まるごと）を、同期コードごとに
   Googleドライブの中に預かります。
   スマホとパソコンで同じコードを入れると、同じデータになります。

   ▼ 準備
   1. 新しいスプレッドシートを作る（名前は「計画マップ 同期」など何でもOK）
   2. 拡張機能 → Apps Script → このファイルの中身をぜんぶ貼る → 保存
   3. 右上の「デプロイ」→「新しいデプロイ」
   4. 種類を選択（歯車マーク）→「ウェブアプリ」
   5. 次のユーザーとして実行 →「自分」
      アクセスできるユーザー →「全員」
   6. 「デプロイ」→ 権限をゆるす（「詳細」→「安全ではないページに移動」→ 許可）
   7. 出てきた「ウェブアプリのURL」をコピーしてヒラに渡す

   ※データ本体は、このスプレッドシートと同じドライブに自動で作られる
     フォルダ「計画マップ同期データ」の中に、コードごとに1ファイルずつ入ります。
     このシートの「同期」タブには、誰がいつ同期したかの一覧だけが出ます。

   ※あとでコードを直したときは、毎回
     「デプロイ」→「デプロイを管理」→ 鉛筆マーク →「新バージョン」→「デプロイ」
   =========================================================== */

const SECRET = 'hiramap-2026';          // あいことば。Qランキングと同じ
const FOLDER_NAME = '計画マップ同期データ';
const INDEX_SHEET = '同期';
const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';   // 0/o/1/l/i は使わない（読みまちがい防止）

/* ---------- 入口 ---------- */
function doGet(e) {
  return respond_(handle_(e.parameter || {}), e.parameter && e.parameter.callback);
}
function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents || '{}'); } catch (err) {}
  var q = e.parameter || {};
  Object.keys(q).forEach(function (k) { if (!(k in p)) p[k] = q[k]; });
  return respond_(handle_(p), null);
}
function respond_(obj, callback) {
  var s = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + s + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

function handle_(p) {
  try {
    if (p.secret !== SECRET) return { ok: false, err: 'あいことばがちがいます' };
    var action = String(p.action || '');
    if (action === 'new') return { ok: true, code: newCode_() };
    if (action === 'get') return get_(p);
    if (action === 'put') return put_(p);
    if (action === 'ping') return { ok: true, t: Date.now() };
    return { ok: false, err: 'action がちがいます' };
  } catch (err) {
    return { ok: false, err: 'エラー: ' + (err && err.message ? err.message : err) };
  }
}

/* ---------- 置き場所 ---------- */
function folder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('folderId');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var parent = null;
  try { parent = DriveApp.getFileById(ss.getId()).getParents().next(); } catch (e) {}
  var f = parent ? parent.createFolder(FOLDER_NAME) : DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('folderId', f.getId());
  return f;
}
function fileOf_(code) {
  var it = folder_().getFilesByName(code + '.json');
  return it.hasNext() ? it.next() : null;
}
function okCode_(code) {
  return /^[a-z0-9]{4}-[a-z0-9]{4}$/.test(String(code || ''));
}
function newCode_() {
  for (var tries = 0; tries < 20; tries++) {
    var s = '';
    for (var i = 0; i < 8; i++) {
      if (i === 4) s += '-';
      s += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    if (!fileOf_(s)) return s;
  }
  throw new Error('コードを作れませんでした');
}

/* ---------- 読む ---------- */
function get_(p) {
  var code = String(p.code || '').trim().toLowerCase();
  if (!okCode_(code)) return { ok: false, err: 'コードの形がちがいます' };
  var f = fileOf_(code);
  if (!f) return { ok: true, found: false };
  var rec = JSON.parse(f.getBlob().getDataAsString('UTF-8'));
  return { ok: true, found: true, mt: rec.mt || 0, name: rec.name || '', data: rec.data || '' };
}

/* ---------- 書く ---------- */
function put_(p) {
  var code = String(p.code || '').trim().toLowerCase();
  if (!okCode_(code)) return { ok: false, err: 'コードの形がちがいます' };
  var mt = Number(p.mt) || 0;
  var data = String(p.data || '');
  if (!data || data.length < 2) return { ok: false, err: 'データが空です' };
  if (data.length > 4000000) return { ok: false, err: 'データが大きすぎます' };
  try { JSON.parse(data); } catch (e) { return { ok: false, err: 'データの形がちがいます' }; }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var f = fileOf_(code);
    if (f) {
      var cur = JSON.parse(f.getBlob().getDataAsString('UTF-8'));
      if ((cur.mt || 0) > mt) {
        // 預かっているほうが新しい → 書かずに、そちらを返す（アプリ側で入れかえる）
        return { ok: true, stale: true, mt: cur.mt, name: cur.name || '', data: cur.data || '' };
      }
    }
    var rec = { mt: mt, name: String(p.name || ''), data: data, at: new Date().toISOString() };
    var body = JSON.stringify(rec);
    if (f) f.setContent(body);
    else folder_().createFile(code + '.json', body, 'application/json');
    index_(code, rec.name, mt, data.length);
    return { ok: true, mt: mt };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- 一覧タブ（誰がいつ同期したか） ---------- */
function index_(code, name, mt, size) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(INDEX_SHEET);
    if (!sh) {
      sh = ss.insertSheet(INDEX_SHEET);
      sh.getRange(1, 1, 1, 4).setValues([['コード', '名前', 'さいごの同期', 'サイズ']]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    var last = sh.getLastRow();
    var row = -1;
    if (last >= 2) {
      var codes = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < codes.length; i++) if (String(codes[i][0]) === code) { row = i + 2; break; }
    }
    if (row < 0) row = last + 1;
    sh.getRange(row, 1, 1, 4).setValues([[code, name, new Date(mt || Date.now()), size]]);
    sh.getRange(row, 3).setNumberFormat('m/d H:mm');
  } catch (e) {}
}
