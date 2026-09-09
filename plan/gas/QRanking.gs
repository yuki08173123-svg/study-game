/* ===========================================================
   Qランキング 受け取りスクリプト（計画マップアプリ用）

   アプリから送られてきたその日のQスコアを、
   今月のタブの「自分の列 × 今日の行」に書きこみます。

   ▼ デプロイのしかた
   1. 右上の「デプロイ」→「新しいデプロイ」
   2. 種類を選択（歯車マーク）→「ウェブアプリ」
   3. 次のユーザーとして実行 →「自分」
      アクセスできるユーザー →「全員」
   4. 「デプロイ」→ 出てきた「ウェブアプリのURL」をコピーしてヒラに渡す

   ※あとでコードを直したときは、毎回
     「デプロイ」→「デプロイを管理」→ 鉛筆マーク →「新バージョン」→「デプロイ」
     をしてください。これをしないと直した内容が反映されません。
   =========================================================== */

const SECRET = 'hiramap-2026';   // あいことば。変えたらアプリ側にも同じものを入れます

/* 「9月」のような、今月の名前のタブをさがす。
   タブ名に空白が入っていても拾えるようにしている。 */
function monthSheets_() {
  const nm = (new Date().getMonth() + 1) + '月';
  return SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(function (s) {
    return s.getName().replace(/[\s　]/g, '') === nm;
  });
}

/* 名前の行（2行目）。B列から右に名前がならんでいる想定 */
function nameRow_(sh) {
  return sh.getRange(2, 1, 1, 80).getValues()[0].map(function (v) { return String(v); });
}

/* 表記のゆれを吸収するための形（空白・絵文字・記号をとる） */
function norm_(s) {
  return String(s)
    .replace(/[\s　]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, '')
    .toLowerCase();
}

/* 名前から列番号をさがす。完全一致 → ゆれを吸収して一致 の順 */
function findCol_(sh, name) {
  const row = nameRow_(sh);
  for (var i = 1; i < row.length; i++) if (row[i] === name) return i + 1;
  const n = norm_(name);
  if (!n) return -1;
  for (var j = 1; j < row.length; j++) if (row[j] && norm_(row[j]) === n) return j + 1;
  return -1;
}

/* 同じ月のタブが複数あっても、その名前がある方をえらぶ */
function pickSheet_(name) {
  const cands = monthSheets_();
  for (var i = 0; i < cands.length; i++) if (findCol_(cands[i], name) > 0) return cands[i];
  return cands[0] || null;
}

function names_(sh) {
  return nameRow_(sh).slice(1).filter(function (v) { return v.trim() !== ''; });
}

function put_(sh, p) {
  const col = findCol_(sh, p.name || '');
  if (col < 0) return { ok: false, err: '名前が見つかりません', names: names_(sh) };
  const day = Number(p.day);
  if (!(day >= 1 && day <= 31)) return { ok: false, err: '日づけがおかしいです' };
  const q = Number(p.q);
  if (!(q >= 0 && q <= 999)) return { ok: false, err: 'Qの数がおかしいです' };
  sh.getRange(2 + day, col).setValue(q);   // 3行目＝1日、4行目＝2日 …
  return { ok: true, month: sh.getName(), day: day, q: q, name: nameRow_(sh)[col - 1] };
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const cb = p.callback || 'cb';
  var res;
  try {
    if (p.secret !== SECRET) {
      res = { ok: false, err: 'あいことばがちがいます' };
    } else if (p.action === 'names') {
      const sh = monthSheets_()[0];
      res = sh ? { ok: true, month: sh.getName(), names: names_(sh) }
               : { ok: false, err: (new Date().getMonth() + 1) + '月のタブが見つかりません' };
    } else if (p.action === 'put') {
      const sh = pickSheet_(p.name || '');
      res = sh ? put_(sh, p)
               : { ok: false, err: (new Date().getMonth() + 1) + '月のタブが見つかりません' };
    } else {
      res = { ok: false, err: 'action がふめいです' };
    }
  } catch (err) {
    res = { ok: false, err: String(err) };
  }
  return ContentService
    .createTextOutput(cb + '(' + JSON.stringify(res) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
