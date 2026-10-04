# study-game（塾のアプリ集）共通ルール

- **すべてのアプリに「兄弟で1台を使う（使う人の切りかえ）」を入れる。新しく作るアプリにも、最初から必ず入れる。**
  入れ方は `common/README.md`（`common/users.js` を読みこんで、目印を2つ置くだけ）。
- 更新したら、そのアプリの版（index.html の VER・sw.js のキャッシュ名・version.json）を1つ上げ、`git push origin main main:gh-pages` で両方に出す。
- **Claude のブラウザ画面でアプリを確認するときは、音を出さない。** `serve.py` で開いたページは、Claude の画面（UAに `Claude/`）では BGM・効果音・読み上げ・YouTube/Loom が自動で消音になる（ユーザーの収録の邪魔になるため）。音そのものを確かめたいときだけ URL に `?sound=1` を付ける。確認が終わったらタブを閉じ、`preview_stop` で止める。
