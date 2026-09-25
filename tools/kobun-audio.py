#!/usr/bin/env python3
"""古文単語350 の「1分解説」音声を作る（論文ラジオと同じ edge-tts・Nanami の声）。

    python3 tools/kobun-audio.py          # 変わった単語だけ作り直す
    python3 tools/kobun-audio.py --all    # 全部作り直す

kobun/words.js を読み、1語につき1本 kobun/audio/NNN.mp3 を書き出す。
解説は5つの区切り（見出し語・意味・覚え方・例文・もう一度）を別々に読み上げてつなぐ。
区切りの開始秒は kobun/audio/index.json に入れ、アプリはそれを見て
スライドの読んでいる所を光らせ、字幕を切りかえる。
アプリ側の lessonParts() と文言をそろえること。
"""
import asyncio, hashlib, json, os, re, sys
import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..', 'kobun')
OUT = os.path.join(APP, 'audio')
VOICE = 'ja-JP-NanamiNeural'
RATE = '+25%'
BYTES_PER_SEC = 6000          # edge-tts の出力は 24kHz・48kbps の固定ビットレート → 1秒 6000バイト
PNAME = {'名': '名詞', '動': '動詞', '形': '形容詞', '形動': '形容動詞', '副': '副詞', '連体': '連体詞', '接': '接続詞', '感': '感動詞', '連語': '連語'}


def load_words():
    src = open(os.path.join(APP, 'words.js'), encoding='utf-8').read()
    body = src[src.index('['):src.rindex(']') + 1]
    body = '\n'.join(l for l in body.split('\n') if not l.strip().startswith('//'))
    body = re.sub(r'([{,])\s*(w|k|p|m|s|ex|tr|tip|y|ey|ty):', r'\1"\2":', body)
    body = re.sub(r',\s*\]$', ']', body.strip())
    return json.loads(body)


def yomi(s):
    """歴史的仮名遣い → 読み（おおまか）。アプリの yomi() と同じ。"""
    r = ''
    for j, ch in enumerate(s):
        prev = s[j - 1] if j else ''
        if ch in 'はひふへほ' and re.match(r'[ぁ-ゖ]', prev):
            r += 'わいうえお'['はひふへほ'.index(ch)]
        else:
            r += ch
    for a, b in [('ゐ', 'い'), ('ゑ', 'え'), ('を', 'お'), ('ぢ', 'じ'), ('づ', 'ず'), ('くわ', 'か'), ('ぐわ', 'が')]:
        r = r.replace(a, b)
    A = dict(zip('かさたなまやらがざだば', 'こそとのもよろごぞどぼ'))
    r = re.sub(r'([かさたなまやらがざだば])う', lambda m: A[m.group(1)] + 'う', r)
    E = {'け': 'きょ', 'せ': 'しょ', 'て': 'ちょ', 'ね': 'にょ', 'め': 'みょ', 'れ': 'りょ', 'げ': 'ぎょ', 'ぜ': 'じょ', 'で': 'じょ'}
    r = re.sub(r'([けせてねめれげぜで])う', lambda m: E[m.group(1)] + 'う', r)
    I = {'き': 'きゅ', 'し': 'しゅ', 'ち': 'ちゅ', 'に': 'にゅ', 'り': 'りゅ', 'ぎ': 'ぎゅ', 'じ': 'じゅ'}
    r = re.sub(r'([きしちにりぎじ])う', lambda m: I[m.group(1)] + 'う', r)
    return r.replace('いう', 'ゆう').replace('えう', 'よう').replace('あう', 'おう')


def parts(w):
    say = w.get('y') or yomi(re.sub(r'（.*?）', '', w['w']))
    s = w.get('s') or []
    out = [
        say + '。' + PNAME.get(w['p'], w['p']) + 'です。',
        'いちばん大事な意味は、' + w['m'] + '。' + ('ほかに、' + '、'.join(s) + '、という意味もあります。' if s else ''),
        '覚え方。' + (w.get('ty') or w['tip']),
    ]
    if w.get('ex'):
        out.append('例文。' + (w.get('ey') or yomi(w['ex'])).replace('…', '、') + '。訳は、' + w['tr'] + '。')
    out.append('もう一度。' + say + '、' + w['m'] + '。')
    return out


async def speak(text, tries=4):
    for k in range(tries):
        try:
            buf = bytearray()
            async for c in edge_tts.Communicate(text, VOICE, rate=RATE).stream():
                if c['type'] == 'audio':
                    buf += c['data']
            if buf:
                return bytes(buf)
        except Exception as e:
            err = e
        await asyncio.sleep(2 + k * 3)
    raise RuntimeError(f'読み上げに失敗: {text[:20]}… {err!r}')


async def main():
    redo_all = '--all' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    W = load_words()
    idx_path = os.path.join(OUT, 'index.json')
    idx = {} if redo_all or not os.path.exists(idx_path) else json.load(open(idx_path))
    sem = asyncio.Semaphore(6)
    done = 0

    async def one(i, w):
        nonlocal done
        no = '%03d' % (i + 1)
        ps = parts(w)
        h = hashlib.sha1((VOICE + RATE + '|'.join(ps)).encode()).hexdigest()[:12]
        if idx.get(no, {}).get('h') == h and os.path.exists(os.path.join(OUT, no + '.mp3')):
            return
        async with sem:
            clips = [await speak(t) for t in ps]
        starts, t = [], 0.0
        for c in clips:
            starts.append(round(t, 2))
            t += len(c) / BYTES_PER_SEC
        open(os.path.join(OUT, no + '.mp3'), 'wb').write(b''.join(clips))
        idx[no] = {'t': starts, 'd': round(t, 2), 'h': h}
        done += 1
        if done % 25 == 0:
            print(f'{done}語 できました', flush=True)

    await asyncio.gather(*(one(i, w) for i, w in enumerate(W)))
    for no in list(idx):
        if int(no) > len(W):
            del idx[no]
    json.dump(dict(sorted(idx.items())), open(idx_path, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'おわり：作り直し {done}語 / 全{len(W)}語', flush=True)


if __name__ == '__main__':
    asyncio.run(main())
