#!/usr/bin/env python3
"""
暗記クエスト用の かんたんサーバー

    python3 serve.py

→ http://localhost:8000 をひらく

ふつうの `python3 -m http.server` だと ブラウザが index.html を
キャッシュしてしまい、ファイルを直したのに 古い画面が出ることがある。
（古いJSと新しいHTMLが混ざると、ボタンを押しても無反応になる）
このサーバーは キャッシュを禁止するヘッダを付けるので、
リロードすれば つねに 最新が出る。

マイクを使うには localhost 経由で ひらくことが 必須。
127.0.0.1 にだけ bind しているので、同じLANの他の端末からは見えない。
"""
import http.server
import io
import os
import socketserver
import sys

# どこから起動しても、この serve.py がある場所（study-game）だけを配信する。
# これをしないと、起動したフォルダ（ホームなど）がまるごと見えてしまう。
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
HOST = "127.0.0.1"


# Claude の中の確認用ブラウザ（UAに "Claude/" が入る）で開いたときだけ、音を全部消す。
# 確認で開いたアプリのBGMや読み上げが、収録中などにいきなり鳴るのを防ぐため。
# 普通の Chrome / Safari では何もしない。音を確かめたいときは URL に ?sound=1 を付ける。
MUTE_SCRIPT = b"""<script>(function(){
if(!/\\bClaude\\//.test(navigator.userAgent)||/[?&]sound=1/.test(location.search))return;
var M=HTMLMediaElement.prototype,play=M.play;
M.play=function(){this.muted=true;this.volume=0;return play.apply(this,arguments)};
["AudioContext","webkitAudioContext"].forEach(function(n){var O=window[n];if(!O)return;
var dest=Object.getOwnPropertyDescriptor(O.prototype,"destination")||Object.getOwnPropertyDescriptor(BaseAudioContext.prototype,"destination");
var S=function(){var c=Reflect.construct(O,arguments,S);var g=c.createGain();g.gain.value=0;g.connect(dest.get.call(c));
Object.defineProperty(c,"destination",{get:function(){return g}});return c};
S.prototype=O.prototype;window[n]=S});
if(window.speechSynthesis){var sp=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=function(u){u.volume=0;sp(u)}}
var fix=function(v){v=String(v);if(/youtube(-nocookie)?\\.com\\/embed/.test(v)&&!/[?&]mute=1/.test(v))v+=(v.indexOf("?")<0?"?":"&")+"mute=1";
else if(/loom\\.com\\/embed/.test(v)&&!/[?&]muted=/.test(v))v+=(v.indexOf("?")<0?"?":"&")+"muted=true";return v};
var F=HTMLIFrameElement.prototype,src=Object.getOwnPropertyDescriptor(F,"src");
Object.defineProperty(F,"src",{get:src.get,set:function(v){src.set.call(this,fix(v))},configurable:true});
var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){
if(this instanceof HTMLIFrameElement&&String(n).toLowerCase()==="src")v=fix(v);return sa.call(this,n,v)};
})();</script>"""


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            if not self.path.split("?")[0].endswith("/"):
                return super().send_head()          # 末尾の / を付けるリダイレクトはおまかせ
            path = os.path.join(path, "index.html")
        if not (path.endswith(".html") and os.path.isfile(path)):
            return super().send_head()
        with open(path, "rb") as f:
            body = f.read()
        i = body.lower().find(b"<head>")
        body = body[:i + 6] + MUTE_SCRIPT + body[i + 6:] if i >= 0 else MUTE_SCRIPT + body
        self.send_response(200)
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        return io.BytesIO(body)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):        # アクセスログは静かに
        pass


class Server(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    try:
        with Server((HOST, PORT), NoCacheHandler) as httpd:
            print(f"\n  暗記クエスト を ひらいてください:\n")
            print(f"      http://localhost:{PORT}\n")
            print("  とめるときは Ctrl+C\n")
            httpd.serve_forever()
    except OSError as e:
        print(f"\n  ポート {PORT} が つかえません ({e})")
        print(f"  ほかの番号で ためす: python3 serve.py 8001\n")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n  とめました\n")
