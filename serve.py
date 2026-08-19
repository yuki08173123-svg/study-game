#!/usr/bin/env python3
"""
まなびクエスト用の かんたんサーバー

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
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
HOST = "127.0.0.1"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
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
            print(f"\n  まなびクエスト を ひらいてください:\n")
            print(f"      http://localhost:{PORT}\n")
            print("  とめるときは Ctrl+C\n")
            httpd.serve_forever()
    except OSError as e:
        print(f"\n  ポート {PORT} が つかえません ({e})")
        print(f"  ほかの番号で ためす: python3 serve.py 8001\n")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n  とめました\n")
