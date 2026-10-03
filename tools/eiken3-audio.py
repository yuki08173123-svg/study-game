#!/usr/bin/env python3
"""英検3級（単語1400・熟語400）の「1分解説」音声を作る。

    python3 tools/eiken3-audio.py            # 変わった項目だけ作り直す
    python3 tools/eiken3-audio.py --all      # 全部作り直す
    python3 tools/eiken3-audio.py --only w   # 単語だけ（i で熟語だけ）

eiken-3/words.js・idioms.js を読み、1項目につき1本
eiken-3/audio/w/NNNN.mp3（単語）・audio/i/NNN.mp3（熟語）を書き出す。
英語は英語の声（Ava）、日本語は古文単語と同じ Nanami で読み、区切りごとにつなぐ。
区切りの開始秒は audio/w/index.json・audio/i/index.json に入れる（アプリが光る所・字幕・発音ボタンに使う）。
アプリ側の lessonParts() と区切りの順番をそろえること：
  0 見出し語（英）／1 品詞と意味（日）／2 例文（英）／3 訳（日）／4 覚え方（日）／5 もう一度見出し語（英）
"""
import asyncio, hashlib, json, os, re, subprocess, sys, tempfile
import edge_tts
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..', 'eiken-3')
EN, JA = 'en-US-AvaNeural', 'ja-JP-NanamiNeural'
RATE = {EN: '-5%', JA: '+25%'}
BYTES_PER_SEC = 6000          # edge-tts の出力は 24kHz・48kbps 固定 → 1秒 6000バイト
BITRATE = '24k'               # 保存するときはこのビットレートに落とす（声には十分・容量は半分）
FF = imageio_ffmpeg.get_ffmpeg_exe()
PNAME = {'名': '名詞', '動': '動詞', '形': '形容詞', '副': '副詞', '前': '前置詞', '接': '接続詞', '代': '代名詞', '助': '助動詞'}


def load(name):
    src = open(os.path.join(APP, name), encoding='utf-8').read()
    return [json.loads(l.rstrip().rstrip(',')) for l in src.split('\n') if l.startswith('{')]


def pos_ja(p):
    return '・'.join(PNAME.get(x, x) for x in (p or '').split('・'))


def ja(s):
    """日本語の読み上げ用に記号を整える。"""
    s = re.sub(r'[〜～~]', 'なになに', s)
    s = s.replace('[', '').replace(']', '').replace('→', '、').replace('／', '、').replace('/', '、')
    s = s.replace('（', '、').replace('）', '、').replace('(', '、').replace(')', '、')
    return re.sub(r'、+', '、', s)


def en_head(w):
    """見出し語・熟語を英語で読める形に（~ は something、~ing は doing）。"""
    s = w.replace('~ing', 'doing').replace('…', 'something')
    s = re.sub(r'\s*~\s*$', '', s)
    s = re.sub(r'~', 'something', s)
    return s.strip()


def sub_mean(x):
    m = re.match(r'^(名|動|形|副|前|接|代|助)\s+(.*)$', x)
    return (PNAME[m.group(1)] + 'で、' + m.group(2)) if m else x


def parts(w, idiom):
    head = en_head(w['w'])
    s = w.get('s') or []
    mean = ('熟語。' if idiom else pos_ja(w.get('p')) + '。') + 'いちばん大事な意味は、' + w['m'] + '。'
    if s:
        mean += 'ほかに、' + '、'.join(sub_mean(x) for x in s) + '。'
    return [
        (EN, head + '.'),
        (JA, ja(mean)),
        (EN, w['ex'].replace('[', '').replace(']', '')),
        (JA, ja('訳。' + w['ft'])),
        (JA, ja('覚え方。' + w['tip'])),
        (EN, head + '.'),
    ]


async def speak(voice, text, tries=5):
    err = None
    for k in range(tries):
        try:
            buf = bytearray()
            async for c in edge_tts.Communicate(text, voice, rate=RATE[voice]).stream():
                if c['type'] == 'audio':
                    buf += c['data']
            if buf:
                return bytes(buf)
        except Exception as e:
            err = e
        await asyncio.sleep(2 + k * 3)
    raise RuntimeError(f'読み上げに失敗: {text[:20]}… {err!r}')


def shrink(raw, dst):
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
        f.write(raw)
        tmp = f.name
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', '24000', '-b:a', BITRATE, dst], check=True)
    os.remove(tmp)


async def build(kind, items, redo_all):
    out = os.path.join(APP, 'audio', kind)
    os.makedirs(out, exist_ok=True)
    idx_path = os.path.join(out, 'index.json')
    idx = {} if redo_all or not os.path.exists(idx_path) else json.load(open(idx_path))
    width = 4 if kind == 'w' else 3
    sem = asyncio.Semaphore(8)
    done = 0

    async def one(i, w):
        nonlocal done
        no = str(i + 1).zfill(width)
        ps = parts(w, kind == 'i')
        h = hashlib.sha1((BITRATE + json.dumps(ps, ensure_ascii=False) + json.dumps(RATE)).encode()).hexdigest()[:12]
        dst = os.path.join(out, no + '.mp3')
        if idx.get(no, {}).get('h') == h and os.path.exists(dst):
            return
        async with sem:
            clips = [await speak(v, t) for v, t in ps]
        starts, t = [], 0.0
        for c in clips:
            starts.append(round(t, 2))
            t += len(c) / BYTES_PER_SEC
        await asyncio.to_thread(shrink, b''.join(clips), dst)
        idx[no] = {'t': starts, 'd': round(t, 2), 'h': h}
        done += 1
        if done % 50 == 0:
            print(f'{kind}: {done}件 できました', flush=True)
            json.dump(dict(sorted(idx.items())), open(idx_path, 'w'), separators=(',', ':'))

    await asyncio.gather(*(one(i, w) for i, w in enumerate(items)))
    for no in list(idx):
        if int(no) > len(items):
            del idx[no]
    json.dump(dict(sorted(idx.items())), open(idx_path, 'w'), separators=(',', ':'))
    print(f'{kind} おわり：作り直し {done}件 / 全{len(items)}件', flush=True)


async def main():
    redo_all = '--all' in sys.argv
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else ''
    lim = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
    if only in ('', 'i'):
        await build('i', load('idioms.js')[:lim], redo_all)
    if only in ('', 'w'):
        await build('w', load('words.js')[:lim], redo_all)


if __name__ == '__main__':
    asyncio.run(main())
