#!/usr/bin/env python3
"""英検アプリの words.js / idioms.js を、見直し用に200件（熟語は170件）ずつのファイルに分ける。
    python3 tools/eiken-review/split.py eiken-3
→ eiken-3/data/review/src/w0.jsonl … i0.jsonl …（n は1からの通し番号＝アプリの並び順）
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
app = os.path.join(HERE, '..', '..', sys.argv[1])
def load(name):
    return [json.loads(l.strip().rstrip(',')) for l in open(os.path.join(app, name), encoding='utf-8') if l.startswith('{')]
out = os.path.join(app, 'data', 'review', 'src'); os.makedirs(out, exist_ok=True)
for kind, name, size in (('w', 'words.js', 200), ('i', 'idioms.js', 170)):
    R = load(name)
    for k in range(0, len(R), size):
        with open(os.path.join(out, f'{kind}{k // size}.jsonl'), 'w', encoding='utf-8') as f:
            for n, r in enumerate(R[k:k + size], k + 1):
                f.write(json.dumps({'n': n, **r}, ensure_ascii=False) + '\n')
    print(name, len(R), '件 →', -(-len(R) // size), 'ファイル')
print('出力先', os.path.normpath(out))
