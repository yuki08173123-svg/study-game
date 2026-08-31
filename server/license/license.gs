/**
 * Mindrest ライセンス発行・確認サーバー（Google Apps Script）
 *
 * やること
 *   1. Stripe の決済完了後のリダイレクトを受け取り、支払いを確認してライセンスコードを発行する
 *   2. アプリからのコード確認リクエストに答える
 *   3. 塾生用の無料コードをまとめて発行する
 *
 * 最初にやること（詳しい手順は SETUP.md）
 *   - スクリプトプロパティに STRIPE_KEY（Stripe の制限付きキー）を入れる
 *   - エディタで setup() を1回実行する（シートが自動で作られる）
 *   - ウェブアプリとしてデプロイする（アクセスできるユーザー：全員）
 */

// ===== 設定 =====================================================

/** 1つのコードで使える端末の上限（家族・機種変更・タブレット用に余裕を持たせる） */
var MAX_DEVICES = 5;

/** アプリの公開URL。発行画面と案内メールから案内する */
var APP_URL = 'https://yuki08173123-svg.github.io/study-game/meditation/';

/** 使い方ページ */
var GUIDE_URL = 'https://yuki08173123-svg.github.io/study-game/meditation/guide.html';

/** 問い合わせ先として案内するメールアドレス */
var SUPPORT_EMAIL = 'yuki08173123@gmail.com';

/** 商品名（メール・画面表示用） */
var PRODUCT_NAME = 'Mindrest';

/** 紛らわしい文字（0/O/1/I）を抜いた32文字。電話や手書きで伝えても間違えにくい */
var CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

var SHEET_LICENSES = 'licenses';
var SHEET_DEVICES = 'devices';
var SHEET_LOG = 'log';

// ===== 初期設定 =================================================

/**
 * 最初に1回だけ、エディタから手で実行する。
 * 必要なシートと見出し行を作る。すでにある場合は何もしない。
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(ss, SHEET_LICENSES, [
    'code', 'type', 'status', 'email', 'stripe_session_id',
    'issued_at', 'revoked_at', 'note'
  ]);
  ensureSheet_(ss, SHEET_DEVICES, [
    'code', 'device_id', 'first_seen', 'last_seen', 'user_agent'
  ]);
  ensureSheet_(ss, SHEET_LOG, [
    'timestamp', 'action', 'code', 'detail'
  ]);

  var key = PropertiesService.getScriptProperties().getProperty('STRIPE_KEY');
  if (!key) {
    Logger.log('【未設定】スクリプトプロパティ STRIPE_KEY がありません。設定しないと購入の確認ができません。');
  } else if (key.indexOf('rk_') !== 0) {
    Logger.log('【注意】STRIPE_KEY が制限付きキー（rk_ で始まる）ではありません。権限を絞ったキーの利用を強くすすめます。');
  } else {
    Logger.log('STRIPE_KEY は設定済みです。');
  }
  Logger.log('セットアップが終わりました。');
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

// ===== 入り口 ===================================================

function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || '';

  // Stripe の決済完了後のリダイレクト先。session_id が付いてくる
  if (action === 'success' || (!action && p.session_id)) {
    return handleSuccess_(p.session_id);
  }

  // アプリからのコード確認
  if (action === 'verify') {
    return jsonOut_(verifyLicense_(p.code, p.device, p.ua));
  }

  // 死活確認用
  if (action === 'ping') {
    return jsonOut_({ ok: true });
  }

  return htmlPage_('ページが見つかりません', '<p>お探しの内容は見つかりませんでした。</p>');
}

// ===== 購入 → コード発行 =========================================

/**
 * Stripe の Checkout セッションを確認し、支払い済みなら
 * ライセンスコードを発行して画面に出す。
 * 同じ session_id で何度開かれても、同じコードを返す（再読み込み対策）。
 */
function handleSuccess_(sessionId) {
  if (!sessionId) {
    return errorPage_('購入情報が確認できませんでした',
      'お手数ですが、購入時に届いたメールをご確認のうえ、' + SUPPORT_EMAIL + ' までご連絡ください。');
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return errorPage_('混み合っています', '30秒ほど待ってから、このページを再度読み込んでください。');
  }

  try {
    // すでに発行済みならそれを返す
    var existing = findBySessionId_(sessionId);
    if (existing) {
      return successPage_(existing.code, existing.email, true);
    }

    var session = fetchStripeSession_(sessionId);
    if (!session) {
      logRow_('error', '', 'Stripe への問い合わせに失敗: ' + sessionId);
      return errorPage_('確認に時間がかかっています',
        '決済は完了している可能性があります。二重にお支払いにならないよう、'
        + 'もう一度購入手続きをするのではなく、' + SUPPORT_EMAIL
        + ' までご連絡ください。すぐにコードをお送りします。');
    }

    if (session.payment_status !== 'paid') {
      logRow_('unpaid', '', sessionId + ' / payment_status=' + session.payment_status);
      return errorPage_('お支払いが確認できませんでした',
        'お支払いが完了していないようです。お心当たりのない場合は ' + SUPPORT_EMAIL + ' までご連絡ください。');
    }

    var email = '';
    if (session.customer_details && session.customer_details.email) {
      email = session.customer_details.email;
    } else if (session.customer_email) {
      email = session.customer_email;
    }

    var code = issueCode_('purchase', email, sessionId, '');
    logRow_('issue', code, 'purchase / ' + email);

    if (email) {
      try {
        sendLicenseMail_(email, code);
      } catch (mailErr) {
        // メールが送れなくても画面には出ているので、発行自体は成功として扱う
        logRow_('mail_error', code, String(mailErr));
      }
    }

    return successPage_(code, email, false);

  } catch (err) {
    logRow_('error', '', String(err));
    return errorPage_('エラーが発生しました',
      'お手数ですが ' + SUPPORT_EMAIL + ' までご連絡ください。決済が完了していればすぐにコードをお送りします。');
  } finally {
    lock.releaseLock();
  }
}

/** Stripe に Checkout セッションを問い合わせる。失敗したら null */
function fetchStripeSession_(sessionId) {
  var key = PropertiesService.getScriptProperties().getProperty('STRIPE_KEY');
  if (!key) {
    logRow_('error', '', 'STRIPE_KEY が未設定です');
    return null;
  }

  // 見た目が Checkout セッションIDでないものは Stripe に投げる前にはじく
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    logRow_('error', '', '不正な session_id 形式: ' + sessionId);
    return null;
  }

  var url = 'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId);
  var res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + key },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    logRow_('error', '', 'Stripe ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
    return null;
  }
  return JSON.parse(res.getContentText());
}

// ===== コードの発行・確認 =======================================

/** 重複しないコードを1つ作ってシートに書き込み、コード文字列を返す */
function issueCode_(type, email, sessionId, note) {
  var sh = sheet_(SHEET_LICENSES);
  var used = {};
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) used[values[i][0]] = true;

  var code = '';
  for (var t = 0; t < 50; t++) {
    var c = makeCode_();
    if (!used[c]) { code = c; break; }
  }
  if (!code) throw new Error('コードの生成に失敗しました');

  sh.appendRow([
    code, type, 'active', email || '', sessionId || '',
    new Date(), '', note || ''
  ]);
  return code;
}

function makeCode_() {
  var body = '';
  do {
    body = '';
    for (var i = 0; i < 8; i++) {
      body += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    // 本体が MR で始まると「MR-」の頭と見分けがつかなくなるので作り直す
  } while (body.indexOf('MR') === 0);

  return 'MR-' + body.slice(0, 4) + '-' + body.slice(4);
}

/**
 * コードを確認し、端末を登録する。
 * 返り値: { ok: true, type: 'purchase'|'juku' } または { ok: false, reason: ... }
 */
function verifyLicense_(rawCode, deviceId, ua) {
  var code = normalizeCode_(rawCode);
  if (!code) return { ok: false, reason: 'format' };
  if (!deviceId) return { ok: false, reason: 'nodevice' };

  var row = findByCode_(code);
  if (!row) return { ok: false, reason: 'notfound' };
  if (row.status !== 'active') return { ok: false, reason: 'revoked' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return { ok: false, reason: 'busy' }; }

  try {
    var sh = sheet_(SHEET_DEVICES);
    var vals = sh.getDataRange().getValues();
    var count = 0;
    var foundRow = -1;
    for (var i = 1; i < vals.length; i++) {
      if (vals[i][0] === code) {
        count++;
        if (vals[i][1] === deviceId) foundRow = i + 1;
      }
    }

    if (foundRow > 0) {
      sh.getRange(foundRow, 4).setValue(new Date());
      return { ok: true, type: row.type };
    }

    if (count >= MAX_DEVICES) {
      logRow_('device_limit', code, 'これ以上は登録できません（' + count + '台）');
      return { ok: false, reason: 'toomany', max: MAX_DEVICES };
    }

    sh.appendRow([code, deviceId, new Date(), new Date(), String(ua || '').slice(0, 200)]);
    logRow_('device_add', code, (count + 1) + '台目');
    return { ok: true, type: row.type };

  } finally {
    lock.releaseLock();
  }
}

/**
 * 入力ゆれを吸収する。
 * 小文字・全角・空白・ハイフン抜け・長音記号での代用などを直す。
 * 直せないものは '' を返す。
 */
function normalizeCode_(s) {
  if (!s) return '';

  var t = String(s)
    // 全角の英数と記号（！から～まで）をまとめて半角にする
    .replace(/[！-～]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
    })
    .toUpperCase()
    // 英数字以外はすべて捨てる。ハイフン・空白・長音記号などはここで消える
    .replace(/[^A-Z0-9]/g, '');

  // 頭の MR は、外して8文字になるときだけ外す。
  // （本体そのものが MR で始まる場合に消しすぎないようにするため）
  if (t.length === 10 && t.indexOf('MR') === 0) t = t.slice(2);

  if (t.length !== 8) return '';
  if (!isCodeBody_(t)) return '';
  return 'MR-' + t.slice(0, 4) + '-' + t.slice(4);
}

/** 8文字がすべて CODE_CHARS の中の文字か。0・O・1・I は使っていないので弾かれる */
function isCodeBody_(t) {
  for (var i = 0; i < t.length; i++) {
    if (CODE_CHARS.indexOf(t.charAt(i)) < 0) return false;
  }
  return true;
}

function findByCode_(code) {
  var vals = sheet_(SHEET_LICENSES).getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0] === code) {
      return { row: i + 1, code: vals[i][0], type: vals[i][1], status: vals[i][2], email: vals[i][3] };
    }
  }
  return null;
}

function findBySessionId_(sessionId) {
  var vals = sheet_(SHEET_LICENSES).getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][4] === sessionId) {
      return { row: i + 1, code: vals[i][0], type: vals[i][1], status: vals[i][2], email: vals[i][3] };
    }
  }
  return null;
}

// ===== 管理用（エディタから手で実行する） ========================

/**
 * 塾生用のコードをまとめて発行する。
 * 使い方: 下の count を人数に変えて、エディタでこの関数を実行する。
 * 発行されたコードはログと licenses シートに出る。
 */
function issueJukuCodes() {
  var count = 10;          // ←ここを人数に変える
  var note = '塾生特典';    // ←メモ（年度など）

  var codes = [];
  for (var i = 0; i < count; i++) {
    codes.push(issueCode_('juku', '', '', note));
  }
  logRow_('issue_juku', '', count + '件 / ' + note);
  Logger.log(codes.join('\n'));
  return codes;
}

/**
 * コードを無効にする。
 * 使い方: 下の target を止めたいコードに変えて実行する。
 * 無効にすると、次にアプリが確認したときに使えなくなる。
 */
function revokeCode() {
  var target = 'MR-XXXX-XXXX';   // ←止めたいコードに変える

  var code = normalizeCode_(target);
  var row = findByCode_(code);
  if (!row) { Logger.log('見つかりません: ' + target); return; }

  var sh = sheet_(SHEET_LICENSES);
  sh.getRange(row.row, 3).setValue('revoked');
  sh.getRange(row.row, 7).setValue(new Date());
  logRow_('revoke', code, '');
  Logger.log('無効にしました: ' + code);
}

/**
 * 流出している疑いのあるコードを探す。
 * 登録端末数が多い順に並べて出す。
 */
function findSuspiciousCodes() {
  var vals = sheet_(SHEET_DEVICES).getDataRange().getValues();
  var counts = {};
  for (var i = 1; i < vals.length; i++) {
    counts[vals[i][0]] = (counts[vals[i][0]] || 0) + 1;
  }
  var list = Object.keys(counts).map(function (c) { return { code: c, n: counts[c] }; });
  list.sort(function (a, b) { return b.n - a.n; });
  Logger.log(list.slice(0, 30).map(function (x) { return x.code + ' : ' + x.n + '台'; }).join('\n'));
  return list;
}

/**
 * 販売状況をざっと見る。
 */
function showStats() {
  var vals = sheet_(SHEET_LICENSES).getDataRange().getValues();
  var purchase = 0, juku = 0, revoked = 0;
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][2] === 'revoked') revoked++;
    if (vals[i][1] === 'purchase') purchase++;
    if (vals[i][1] === 'juku') juku++;
  }
  var msg = '購入: ' + purchase + '件\n塾生: ' + juku + '件\n無効: ' + revoked + '件';
  Logger.log(msg);
  return msg;
}

// ===== メール ===================================================

function sendLicenseMail_(email, code) {
  var subject = '【' + PRODUCT_NAME + '】ライセンスコードのお知らせ';
  var body = [
    'このたびは ' + PRODUCT_NAME + ' をお求めいただきありがとうございます。',
    '',
    'あなたのライセンスコードは次のとおりです。',
    '',
    '　　' + code,
    '',
    '── はじめかた ─────────────',
    '',
    '1. スマホで次のURLを開きます',
    '   ' + APP_URL,
    '',
    '2. コードの入力欄に、上のコードを入力します',
    '',
    '3. ホーム画面に追加すると、次からアプリのように開けます',
    '   （やり方は使い方ページに図で説明しています）',
    '   ' + GUIDE_URL,
    '',
    '── 大切なお願い ───────────',
    '',
    '・このコードはあなた専用です。他の方への転送や共有はご遠慮ください',
    '・ご家族や機種変更のため、' + MAX_DEVICES + '台までお使いいただけます',
    '・このメールは大切に保管してください（機種変更のときに必要です）',
    '',
    'ご不明な点は、このメールにそのままご返信ください。',
    '',
    SUPPORT_EMAIL
  ].join('\n');

  MailApp.sendEmail({ to: email, subject: subject, body: body, name: PRODUCT_NAME });
}

// ===== 画面 =====================================================

function successPage_(code, email, again) {
  var note = again
    ? '<p class="muted">このコードはすでに発行済みです。同じコードをお使いください。</p>'
    : (email
      ? '<p class="muted">同じ内容を ' + escapeHtml_(email) + ' にもお送りしました。</p>'
      : '');

  var body = ''
    + '<p>お手続きありがとうございました。<br>あなたのライセンスコードです。</p>'
    + '<div class="code">' + escapeHtml_(code) + '</div>'
    + '<p class="warn">このコードは、いますぐスクリーンショットを撮るか、メモに控えてください。</p>'
    + note
    + '<hr>'
    + '<h2>はじめかた</h2>'
    + '<ol>'
    + '<li>スマホで <a href="' + APP_URL + '">' + PRODUCT_NAME + 'を開く</a></li>'
    + '<li>入力欄に上のコードを入れる</li>'
    + '<li>ホーム画面に追加する（<a href="' + GUIDE_URL + '">やり方はこちら</a>）</li>'
    + '</ol>'
    + '<p class="muted">ご家族や機種変更のため、' + MAX_DEVICES + '台までお使いいただけます。<br>'
    + 'お困りのときは ' + escapeHtml_(SUPPORT_EMAIL) + ' までご連絡ください。</p>';

  return htmlPage_('ライセンスコード', body);
}

function errorPage_(title, message) {
  return htmlPage_(title, '<p>' + escapeHtml_(message) + '</p>');
}

function htmlPage_(title, bodyHtml) {
  var html = ''
    + '<!doctype html><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + escapeHtml_(title) + ' - ' + PRODUCT_NAME + '</title>'
    + '<style>'
    + 'body{margin:0;padding:24px 20px 48px;background:#0a0e13;color:#e8eef5;'
    + 'font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif;'
    + 'line-height:1.9;max-width:560px;margin-inline:auto;-webkit-text-size-adjust:100%}'
    + 'h1{font-size:20px;font-weight:600;margin:0 0 20px;letter-spacing:.04em}'
    + 'h2{font-size:16px;font-weight:600;margin:28px 0 8px}'
    + 'p{margin:12px 0}'
    + '.code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:28px;'
    + 'letter-spacing:.12em;text-align:center;padding:22px 12px;margin:20px 0;'
    + 'background:#131a23;border:1px solid #2a3646;border-radius:14px;'
    + 'color:#8fd6c4;word-break:break-all}'
    + '.warn{background:#1d1a12;border-left:3px solid #d2a94e;padding:12px 14px;border-radius:0 8px 8px 0;font-size:14px}'
    + '.muted{color:#93a3b6;font-size:14px}'
    + 'a{color:#8fd6c4}'
    + 'hr{border:0;border-top:1px solid #222d3a;margin:28px 0}'
    + 'ol{padding-left:1.3em}li{margin:8px 0}'
    + '</style>'
    + '<h1>' + escapeHtml_(title) + '</h1>'
    + bodyHtml;

  return HtmlService.createHtmlOutput(html)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle(title + ' - ' + PRODUCT_NAME);
}

// ===== 小物 =====================================================

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('シート「' + name + '」がありません。setup() を実行してください。');
  return sh;
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function logRow_(action, code, detail) {
  try {
    sheet_(SHEET_LOG).appendRow([new Date(), action, code || '', String(detail || '').slice(0, 500)]);
  } catch (e) {
    Logger.log('ログ書き込み失敗: ' + e);
  }
}

function escapeHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
