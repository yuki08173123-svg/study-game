#!/usr/bin/env python3
"""見直しの直し（data/review/w*.jsonl・i*.jsonl）を words.js / idioms.js に入れる。
    python3 tools/eiken-review/apply.py eiken-3          # 直しを入れる（何度やっても同じ結果）
    python3 tools/eiken-review/apply.py eiken-3 --check  # 入れずに検査だけ
もとの js は初回だけ data/review/backup_words.js・backup_idioms.js に控える。直しはいつも控えから当てる。
"""
import json, os, re, sys, glob, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
app = os.path.normpath(os.path.join(HERE, '..', '..', sys.argv[1]))
rv = os.path.join(app, 'data', 'review')
check = '--check' in sys.argv
LIM = {'w': {'m': 12}, 'i': {'m': 17}}
fixes = {'w': {}, 'i': {}}
for f in sorted(glob.glob(os.path.join(rv, '[wi]*.jsonl'))):
    kind = os.path.basename(f)[0]
    for l in open(f, encoding='utf-8'):
        if l.strip():
            r = json.loads(l); fixes[kind][r['n']] = r
probs = []; changed = {'w': 0, 'i': 0}
for kind, name in (('w', 'words.js'), ('i', 'idioms.js')):
    path = os.path.join(app, name); bk = os.path.join(rv, 'backup_' + name)
    if not os.path.exists(bk): shutil.copy(path, bk)
    lines = open(bk, encoding='utf-8').read().split('\n'); n = 0
    for k, l in enumerate(lines):
        if not l.startswith('{'): continue
        n += 1; x = fixes[kind].get(n)
        if not x: continue
        r = json.loads(l.rstrip().rstrip(','))
        if x.get('w') and x['w'] != r['w']:
            probs.append(f'{kind}{n} 見出しちがい {x["w"]}≠{r["w"]}（この直しは入れない）'); continue
        for key, v in x['fix'].items():
            if key not in ('n', 'w'): r[key] = v
        if not re.search(r'\[[^\]]+\]', r.get('ex', '')): probs.append(f'{kind}{n} {r["w"]} ex に [ ] がない')
        if len(re.findall(r'\[[^\]]+\]', r.get('ft', ''))) != 1: probs.append(f'{kind}{n} {r["w"]} ft の [ ] が1か所でない')
        if len(r.get('m', '')) > LIM[kind]['m']: probs.append(f'{kind}{n} {r["w"]} m が長い：{r["m"]}')
        lines[k] = json.dumps(r, ensure_ascii=False) + ','; changed[kind] += 1
    if not check: open(path, 'w', encoding='utf-8').write('\n'.join(lines))
print('直し 単語', changed['w'], '件・熟語', changed['i'], '件', '（検査だけ）' if check else '（js に入れた）')
print('問題', len(probs)); print('\n'.join(probs))
