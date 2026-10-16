"""英検アプリの見出し語の発音を直す（塾生セリナの声 2026-10-14：動詞 live が形容詞の live の発音になっている）。

つづりが同じで品詞によって読み方が変わる語は、見出し語だけを読ませると、読み上げはたいてい
名詞・形容詞の読み方を選ぶ（live→ライヴ、record・increase・export などは名詞のアクセント）。
2026-10-14 に全級の約80語を、単独の読みと文の中の読みで音を比べて確かめた。

そこで、こういう動詞は見出し語の音声（区切り0と5）を「to live.」のように to をつけて読ませる。
to のあとは必ず動詞として読まれる。※文から語だけを切り出す方法は、前の語が混ざってうまくいかなかった。
名詞・形容詞は単独の読みで合っていたので、そのまま。

各級の音声スクリプト（tools/eiken*-audio.py）の parts() から使う。読む文が変わると音声のハッシュが
変わるので、その語だけ作り直される。"""

# 品詞で読み方（母音・アクセント）が変わる動詞（全級の単語リストにあるもの）
HET_VERBS = set("""read live use close lead record increase upset graduate refuse produce permit progress
separate tear bow combine decrease import export reject present object suspect transfer transport update
overlook protest recall refund conduct estimate construct convert insult attribute contrast conflict
digest exploit insert associate extract abuse wound polish console advocate combat escort elaborate
relay invite excuse contract survey project subject desert
resume research affect coordinate designate delegate initiate articulate convict dictate discard""".split())
# 2026-10-16 追加：resume（塾生Yuki★の声：単独だと résumé の読みになる）ほか、-ate の動詞など

# 名詞・形容詞で、単独だと動詞の読み（-ate を「エイト」）になる語は、a / an をつけて読む
ARTICLE = {'alternate': 'an alternate.', 'subordinate': 'a subordinate.'}


def is_fixed(w):
    """見出し語の品詞（いちばん大事な意味の品詞＝p の先頭）が動詞で、読み方が変わる語か。"""
    return w['w'].lower() in HET_VERBS and (w.get('p') or '').split('・')[0] == '動'


def head_text(w, default):
    if is_fixed(w):
        return f"to {w['w']}."
    return ARTICLE.get(w['w'].lower(), default)
