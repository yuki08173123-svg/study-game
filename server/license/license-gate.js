/**
 * Mindrest ライセンス入力ゲート（アプリ側に貼るコード）
 *
 * 使い方
 *   meditation/index.html の <body> の中、いちばん最初に次の1行を入れる。
 *     <script src="license-gate.js"></script>
 *   （このファイルを meditation/ フォルダに置く場合）
 *
 * 設計の考え方
 *   ・確認は初回の1回だけ。通ったら端末に保存し、以後はオフラインでも起動する
 *   ・30日に1回だけ、裏でこっそり再確認する
 *   ・通信できないときは「何もしない」。サーバーが落ちても使えなくならない
 *   ・サーバーが「無効です」とはっきり答えたときだけロックする
 *   ・記録（med.log.v1 など）には一切触らない。ロック中でもデータは無傷
 */
(function () {
  'use strict';

  // ===== 設定 ===================================================

  /** ライセンス用GASのURL。デプロイ後の /exec のURLに差し替える */
  var LICENSE_URL = 'https://script.google.com/macros/s/【ここにライセンス用GASのURL】/exec';

  var KEY_LIC = 'med.lic.v1';   // ライセンス情報
  var KEY_DEV = 'med.dev.v1';   // この端末のID
  var RECHECK_DAYS = 30;        // 再確認の間隔
  var SUPPORT_EMAIL = 'yuki08173123@gmail.com';

  /** コードに使う32文字。0・O・1・I は読み間違えやすいので入れていない（サーバー側と必ず同じにする） */
  var CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  /** 打ち間違えやすく、かつコードには絶対に出てこない文字 */
  var CONFUSABLE = '0O1I';

  /** 「MR-XXXX-XXXX」の形で、8文字がすべて CODE_CHARS に入っているか */
  function isFullCode(s) {
    var m = /^MR-([A-Z0-9]{4})-([A-Z0-9]{4})$/.exec(s || '');
    if (!m) return false;
    var body = m[1] + m[2];
    for (var i = 0; i < body.length; i++) {
      if (CODE_CHARS.indexOf(body.charAt(i)) < 0) return false;
    }
    return true;
  }

  /** 読み間違えたときに、代わりの候補を出す */
  function hintFor(dropped) {
    var round = /[0O]/.test(dropped);
    var line = /[1I]/.test(dropped);
    if (round && line) return 'D・Q・G や J・L・7 ';
    if (round) return 'D・Q・G ';
    return 'J・L・7 ';
  }

  // ===== 保存まわり =============================================

  function readLic() {
    try { return JSON.parse(localStorage.getItem(KEY_LIC) || 'null'); }
    catch (e) { return null; }
  }

  function writeLic(obj) {
    try { localStorage.setItem(KEY_LIC, JSON.stringify(obj)); } catch (e) {}
  }

  function deviceId() {
    var id = null;
    try { id = localStorage.getItem(KEY_DEV); } catch (e) {}
    if (id) return id;

    if (window.crypto && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }
    try { localStorage.setItem(KEY_DEV, id); } catch (e) {}
    return id;
  }

  // ===== サーバーへの問い合わせ =================================

  function verify(code) {
    var url = LICENSE_URL
      + '?action=verify'
      + '&code=' + encodeURIComponent(code)
      + '&device=' + encodeURIComponent(deviceId())
      + '&ua=' + encodeURIComponent(navigator.userAgent.slice(0, 120))
      + '&t=' + Date.now();

    return fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  // ===== ゲート画面 =============================================

  function showGate(initialMessage) {
    // アプリ本体が動き出さないよう、スクロールを止めて上にかぶせる
    document.documentElement.style.overflow = 'hidden';

    var wrap = document.createElement('div');
    wrap.id = 'mr-gate';
    wrap.innerHTML = ''
      + '<style>'
      + '#mr-gate{position:fixed;inset:0;z-index:2147483647;background:#0a0e13;color:#e8eef5;'
      + 'font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif;'
      + 'display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto;'
      + '-webkit-text-size-adjust:100%}'
      + '#mr-gate .box{width:100%;max-width:360px;text-align:center}'
      + '#mr-gate h1{font-size:19px;font-weight:600;margin:0 0 6px;letter-spacing:.06em}'
      + '#mr-gate .sub{color:#93a3b6;font-size:13.5px;line-height:1.8;margin:0 0 26px}'
      + '#mr-gate input{width:100%;box-sizing:border-box;padding:15px 12px;font-size:19px;'
      + 'text-align:center;letter-spacing:.1em;border-radius:12px;border:1px solid #2a3646;'
      + 'background:#131a23;color:#e8eef5;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;'
      + 'outline:none}'
      + '#mr-gate input:focus{border-color:#8fd6c4}'
      + '#mr-gate button{width:100%;margin-top:12px;padding:15px;font-size:16px;font-weight:600;'
      + 'border:0;border-radius:12px;background:#8fd6c4;color:#0a0e13;cursor:pointer;'
      + 'font-family:inherit}'
      + '#mr-gate button:disabled{opacity:.5;cursor:default}'
      + '#mr-gate .msg{min-height:22px;margin-top:14px;font-size:13.5px;line-height:1.7;color:#e2a2a2}'
      + '#mr-gate .msg.ok{color:#8fd6c4}'
      + '#mr-gate .foot{margin-top:30px;font-size:12.5px;color:#6d7d90;line-height:1.9}'
      + '#mr-gate a{color:#93a3b6}'
      + '</style>'
      + '<div class="box">'
      + '<h1>Mindrest</h1>'
      + '<p class="sub">お手元のライセンスコードを<br>入力してください</p>'
      + '<input id="mr-code" type="text" inputmode="latin" autocapitalize="characters" '
      + 'autocomplete="off" autocorrect="off" spellcheck="false" placeholder="MR-XXXX-XXXX" maxlength="14">'
      + '<button id="mr-go">はじめる</button>'
      + '<div class="msg" id="mr-msg"></div>'
      + '<p class="foot">入力は最初の1回だけです。<br>'
      + 'コードが見つからないときは、購入時のメールをご確認ください。<br>'
      + '<a href="mailto:' + SUPPORT_EMAIL + '">' + SUPPORT_EMAIL + '</a></p>'
      + '</div>';

    document.body.appendChild(wrap);

    var input = wrap.querySelector('#mr-code');
    var btn = wrap.querySelector('#mr-go');
    var msg = wrap.querySelector('#mr-msg');

    if (initialMessage) msg.textContent = initialMessage;

    // 入力しながら自動でハイフンを入れる。
    // 全角で打たれても直し、コードに使っていない文字（0 O 1 I）はそっと落として理由を出す。
    input.addEventListener('input', function () {
      var raw = input.value
        .replace(/[！-～]/g, function (c) {
          return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
        })
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

      // 頭の「MR」を外す。コードの本体は MR で始まらないので取り違えない
      if (raw.indexOf('MR') === 0) raw = raw.slice(2);

      var v = '', dropped = '';
      for (var i = 0; i < raw.length && v.length < 8; i++) {
        var c = raw.charAt(i);
        if (CODE_CHARS.indexOf(c) >= 0) v += c;
        else if (CONFUSABLE.indexOf(c) >= 0 && dropped.indexOf(c) < 0) dropped += c;
      }

      var out = 'MR';
      if (v.length) out += '-' + v.slice(0, 4);
      if (v.length > 4) out += '-' + v.slice(4);
      input.value = v.length ? out : '';

      if (dropped) {
        msg.className = 'msg';
        msg.textContent = 'コードに ' + dropped.split('').join('・')
          + ' は使っていません。' + hintFor(dropped) + 'ではありませんか？';
      } else if (msg.textContent.indexOf('は使っていません') >= 0) {
        msg.textContent = '';
      }
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') btn.click();
    });

    btn.addEventListener('click', function () {
      var code = input.value.trim();
      if (!isFullCode(code)) {
        msg.className = 'msg';
        msg.textContent = 'コードをすべて入力してください。';
        return;
      }

      btn.disabled = true;
      msg.className = 'msg';
      msg.textContent = '確認しています…';

      verify(code).then(function (res) {
        if (res && res.ok) {
          writeLic({ code: code, type: res.type, at: Date.now() });
          msg.className = 'msg ok';
          msg.textContent = 'ありがとうございます。';
          setTimeout(function () { location.reload(); }, 700);
          return;
        }
        btn.disabled = false;
        msg.className = 'msg';
        msg.textContent = reasonText(res && res.reason);
      }).catch(function () {
        btn.disabled = false;
        msg.className = 'msg';
        msg.textContent = '通信できませんでした。電波のよい場所でもう一度お試しください。';
      });
    });

    setTimeout(function () { input.focus(); }, 200);
  }

  function reasonText(reason) {
    if (reason === 'notfound') return 'そのコードは見つかりませんでした。大文字・小文字は区別しません。もう一度ご確認ください。';
    if (reason === 'revoked') return 'このコードは現在ご利用いただけません。お手数ですが ' + SUPPORT_EMAIL + ' までご連絡ください。';
    if (reason === 'toomany') return 'このコードで使える台数の上限に達しています。買い替えなどの場合は ' + SUPPORT_EMAIL + ' までご連絡ください。';
    if (reason === 'busy') return '混み合っています。少し待ってからもう一度お試しください。';
    if (reason === 'format') return 'コードの形式が違うようです。MR- から始まる12文字をご確認ください。';
    return 'うまく確認できませんでした。もう一度お試しください。';
  }

  // ===== 定期の再確認 ===========================================

  function recheck(lic) {
    var elapsed = Date.now() - (lic.at || 0);
    if (elapsed < RECHECK_DAYS * 86400000) return;

    verify(lic.code).then(function (res) {
      if (res && res.ok) {
        // 確認できたので日付だけ更新
        lic.at = Date.now();
        writeLic(lic);
        return;
      }
      // 「無効」「台数超過」とはっきり言われたときだけロックする
      if (res && (res.reason === 'revoked' || res.reason === 'notfound')) {
        try { localStorage.removeItem(KEY_LIC); } catch (e) {}
        location.reload();
      }
      // それ以外（busy など）は何もしない
    }).catch(function () {
      // 通信できないときは何もしない。オフラインでも使えることを優先する
    });
  }

  // ===== 起動 ===================================================

  function start() {
    var lic = readLic();
    if (lic && lic.code) {
      recheck(lic);   // 裏で走らせる。結果は待たない
      return;         // アプリはそのまま起動
    }
    showGate('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
