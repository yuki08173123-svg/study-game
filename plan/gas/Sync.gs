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

   ▼ ランキング（2026-11 追加）
   「参加する」をオンにした人の、週ごとのTQC（T・Q・C）を「ランキング」タブに預かります。
   やり方は、このファイルのいちばん下「ランキング」のところに書いてあります。
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
    if (action === 'rank_put') return rankPut_(p);
    if (action === 'rank_list') return rankList_(p);
    if (action === 'rank_leave') return rankLeave_(p);
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


/* ===========================================================
   ランキング（週ごとのTQCスコア）

   アプリで「ランキングに参加する」をオンにした人だけ、
   週（月曜〜日曜）ごとに T・Q・C を「ランキング」タブに1行で預かります。
   やることの中身は来ません。来るのは 週・番号・名前・T（分）・Q・C だけです。
   「できた」が1つもない週は載りません（計画だけ入れた人が0点で並ばないように）。

   ▼ 「ランキング」タブの見方
     週（月曜）／番号／名前／T（分）／Q／C（％）／スコア／さいごに送った時刻／かくす
     ・「かくす」に何か（例：x）を入れた行は、アプリにもDiscordにも出ません。
       おかしな数字があったら、ここに印を入れてください。行を消してもOKです。
     ・スコアは T×Q×C÷1000（アプリと同じ式）。並び順は、スコア → Q → C の大きい順。

   ▼ Discordに週1回出すには（やらなければ、アプリの中だけで動きます）
     1. Discordで、出したい部屋の「連携サービス」→「ウェブフック」を作り、URLをコピー
     2. このスクリプトの「プロジェクトの設定」→「スクリプト プロパティ」に
          RANK_WEBHOOK      … 本番の部屋のURL
          RANK_WEBHOOK_TEST … テスト用の部屋のURL（あれば）
        を入れる（URLはここにだけ置く。アプリやGitHubには書かない）
     3. 上のメニューで rankPostTest をえらんで「実行」→ テスト用の部屋に出る文面をたしかめる
     4. rankTriggerOn をえらんで「実行」→ 毎週月曜の朝8時に、前の週の結果が出るようになる
        （やめるときは rankTriggerOff を実行）
   =========================================================== */

const RANK_SHEET = 'ランキング';
const RANK_TZ = 'Asia/Tokyo';
const RANK_HEAD = ['週（月曜）', '番号', '名前', 'T（分）', 'Q', 'C（％）', 'スコア', 'さいごに送った時刻', 'かくす'];
const RANK_NAME_MAX = 20;

/* ---------- 日づけ（日本時間でそろえる） ---------- */
function rankYmd_(d) { return Utilities.formatDate(d, RANK_TZ, 'yyyy-MM-dd'); }
/* 日本時間での「今週の月曜」。n=-1 なら先週の月曜 */
function rankMonday_(n) {
  var now = new Date();
  var idx = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[Utilities.formatDate(now, RANK_TZ, 'EEE')];
  if (typeof idx !== 'number') idx = 0;
  return rankYmd_(new Date(now.getTime() - idx * 86400000 + (n || 0) * 7 * 86400000));
}
/* セルが日付に変えられていても、同じ形（2026-11-23）で読む */
function rankWk_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return rankYmd_(v);
  return String(v).trim();
}
function rankOkWeek_(w) { return /^\d{4}-\d{2}-\d{2}$/.test(String(w || '')); }

/* ---------- 数字 ---------- */
function rankInt_(v, max) {
  var n = Math.floor(Number(v));
  if (!(n >= 0)) n = 0;
  return n > max ? max : n;
}
/* アプリの tqcOf() と同じ式（Tは0.1時間きざみ・小数点は切りすて） */
function rankScore_(tmin, q, c) {
  var T = Math.round(tmin / 60 * 10) / 10;
  return Math.floor(T * q * c / 1000);
}
function rankName_(v) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, RANK_NAME_MAX);
}

/* ---------- 置き場所 ---------- */
function rankSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(RANK_SHEET);
  if (!sh) {
    sh = ss.insertSheet(RANK_SHEET);
    sh.getRange(1, 1, 1, RANK_HEAD.length).setValues([RANK_HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:C').setNumberFormat('@');          // 週・番号・名前を、日付や数字に勝手に変えさせない
    sh.getRange('H:H').setNumberFormat('m/d H:mm');
  }
  return sh;
}
function rankRead_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, RANK_HEAD.length).getValues().map(function (r, i) {
    return {
      row: i + 2, week: rankWk_(r[0]), id: String(r[1]).trim().toLowerCase(), name: String(r[2]),
      tmin: Number(r[3]) || 0, q: Number(r[4]) || 0, c: Number(r[5]) || 0, hide: String(r[8]).trim() !== ''
    };
  });
}

/* ---------- 順位をつける ---------- */
/* その週の、かくしていない行を、スコア → Q → C の大きい順にならべて順位をつける。
   3つとも同じなら同じ順位。番号（id）は外に出さない（出すと、ほかの人の行を書きかえられるため）。 */
function rankRows_(all, week, meId) {
  var rows = all.filter(function (r) { return r.week === week && !r.hide && r.id; }).map(function (r) {
    return { name: r.name, tmin: r.tmin, q: r.q, c: r.c, score: rankScore_(r.tmin, r.q, r.c), me: !!meId && r.id === meId, row: r.row };
  });
  rows.sort(function (a, b) { return (b.score - a.score) || (b.q - a.q) || (b.c - a.c) || (a.row - b.row); });
  var rank = 0;
  rows.forEach(function (r, i) {
    var p = rows[i - 1];
    if (!p || p.score !== r.score || p.q !== r.q || p.c !== r.c) rank = i + 1;
    r.rank = rank;
    delete r.row;
  });
  return rows;
}

/* ---------- 見る ---------- */
function rankList_(p) {
  var id = String(p.id || '').trim().toLowerCase();
  var week = String(p.week || '') || rankMonday_(0);
  if (!rankOkWeek_(week)) return { ok: false, err: '週の形がちがいます' };
  var rows = rankRows_(rankRead_(rankSheet_()), week, okCode_(id) ? id : '');
  return { ok: true, rank: 1, week: week, thisWeek: rankMonday_(0), rows: rows, n: rows.length };
}

/* ---------- 送る（1人・1週につき1行。同じ週は上書き） ---------- */
function rankPut_(p) {
  var id = String(p.id || '').trim().toLowerCase();
  if (!okCode_(id)) return { ok: false, err: '番号の形がちがいます' };
  var name = rankName_(p.name);
  if (!name) return { ok: false, err: '名前を入れてください' };
  var list = p.weeks;
  if (typeof list === 'string') { try { list = JSON.parse(list); } catch (e) { list = null; } }
  if (!list || !list.length) return { ok: false, err: 'データが空です' };
  var okW = [rankMonday_(0), rankMonday_(-1)];   // 送れるのは、今週と先週だけ

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = rankSheet_();
    var del = [];
    list.slice(0, 2).forEach(function (w) {
      var wk = String((w && w.week) || '');
      if (okW.indexOf(wk) < 0) return;
      var all = rankRead_(sh);
      var hit = null;
      for (var i = 0; i < all.length; i++) if (all[i].week === wk && all[i].id === id) { hit = all[i]; break; }
      if (!(Number(w.all) > 0) || !(Number(w.done) > 0)) {   // 「できた」が1つもない週は載せない（行があれば消す）
        if (hit) del.push(hit.row);
        return;
      }
      var tmin = rankInt_(w.tmin, 10080), q = rankInt_(w.q, 9999), c = rankInt_(w.c, 100);
      var vals = [wk, id, name, tmin, q, c, rankScore_(tmin, q, c), new Date()];
      if (hit) sh.getRange(hit.row, 1, 1, vals.length).setValues([vals]);   // 「かくす」の印はそのまま残す
      else {
        var row = sh.getLastRow() + 1;
        sh.getRange(row, 1, 1, 3).setNumberFormat('@');
        sh.getRange(row, 1, 1, vals.length).setValues([vals]);
      }
    });
    del.sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
  } finally {
    lock.releaseLock();
  }
  return rankList_({ id: id, week: rankOkWeek_(p.view) ? p.view : okW[0] });
}

/* ---------- やめる（今週と先週の、自分の行を消す） ---------- */
function rankLeave_(p) {
  var id = String(p.id || '').trim().toLowerCase();
  if (!okCode_(id)) return { ok: false, err: '番号の形がちがいます' };
  var okW = [rankMonday_(0), rankMonday_(-1)];
  var n = 0;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = rankSheet_();
    rankRead_(sh).filter(function (r) { return r.id === id && okW.indexOf(r.week) >= 0; })
      .map(function (r) { return r.row; }).sort(function (a, b) { return b - a; })
      .forEach(function (r) { sh.deleteRow(r); n++; });
  } finally {
    lock.releaseLock();
  }
  return { ok: true, removed: n };
}

/* ---------- Discordに出す文面 ---------- */
function rankMd_(ymd, add) {
  var p = ymd.split('-').map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + (add || 0)));
  return (d.getUTCMonth() + 1) + '/' + d.getUTCDate();
}
function rankHours_(tmin) { return String(Math.round(tmin / 60 * 10) / 10); }
/* 名前の中の記号で、Discordの太字や打ち消しにならないようにする */
function rankEsc_(s) { return String(s).replace(/([\\*_~`|>#@\[\]()])/g, '\\$1'); }
function rankText_(week, rows, title) {
  var lines = [];
  lines.push('📊 ' + (title || '先週のTQCランキング') + '（' + rankMd_(week, 0) + '〜' + rankMd_(week, 6) + '）　参加 ' + rows.length + '人');
  lines.push('');
  rows.forEach(function (r) {
    lines.push(r.rank + '位　' + rankEsc_(r.name) + '　' + r.score + '点（T ' + rankHours_(r.tmin) + '時間・Q ' + r.q + '・C ' + r.c + '％）');
  });
  lines.push('');
  lines.push('TQCスコア＝T（勉強時間）×Q（極まった数）×C（達成率）÷1000');
  lines.push('参加のしかた：計画マップのアプリ → 設定 →「ランキングに参加する」');
  return lines;
}
/* Discordは1回2000字まで。行の切れ目で分ける */
function rankChunks_(lines) {
  var out = [], cur = '';
  lines.forEach(function (ln) {
    if (cur && (cur.length + 1 + ln.length) > 1800) { out.push(cur); cur = ln; }
    else cur = cur ? (cur + '\n' + ln) : ln;
  });
  if (cur) out.push(cur);
  return out;
}
function rankSend_(url, lines) {
  rankChunks_(lines).forEach(function (text) {
    var res = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ content: text, allowed_mentions: { parse: [] } })   // 名前に @everyone などがあっても通知しない
    });
    var code = res.getResponseCode();
    if (code < 200 || code >= 300) throw new Error('Discordに送れませんでした（' + code + '）');
    Utilities.sleep(600);
  });
}

/* 毎週月曜の朝に動く。前の週（月〜日）の結果を、本番の部屋に1回だけ出す */
function rankPostWeekly() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('RANK_WEBHOOK');
  if (!url) return;
  var week = rankMonday_(-1);
  if (props.getProperty('RANK_POSTED') === week) return;      // 同じ週を2回出さない
  var rows = rankRows_(rankRead_(rankSheet_()), week, '');
  if (!rows.length) return;                                   // 参加が0人の週は出さない
  rankSend_(url, rankText_(week, rows, ''));
  props.setProperty('RANK_POSTED', week);
}
/* 文面のたしかめ用。テスト用の部屋（RANK_WEBHOOK_TEST）に出す。先週が空なら今週のぶんで出す */
function rankPostTest() {
  var url = PropertiesService.getScriptProperties().getProperty('RANK_WEBHOOK_TEST');
  if (!url) throw new Error('スクリプト プロパティに RANK_WEBHOOK_TEST がありません');
  var all = rankRead_(rankSheet_());
  var week = rankMonday_(-1), rows = rankRows_(all, week, ''), title = '【テスト】先週のTQCランキング';
  if (!rows.length) { week = rankMonday_(0); rows = rankRows_(all, week, ''); title = '【テスト】今週のTQCランキング（とちゅう）'; }
  if (!rows.length) throw new Error('まだ誰も参加していません');
  rankSend_(url, rankText_(week, rows, title));
}
function rankTriggerOff() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'rankPostWeekly') ScriptApp.deleteTrigger(t);
  });
}
function rankTriggerOn() {
  rankTriggerOff();
  ScriptApp.newTrigger('rankPostWeekly').timeBased().inTimezone(RANK_TZ)
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
}
