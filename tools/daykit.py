#!/usr/bin/env python3
"""Helpers to write a study day (data/dayN.js) and register it in data/manifest.js.

    import sys; sys.path.insert(0, 'tools')
    from daykit import W, mc, gap, rfx, note, save_day
    ... build sections ...
    save_day(day, words, date='27.11.2026', short='Lesen 2 + 3')

save_day validates everything (minutes <= 90, answer indexes, tags, cloze gaps,
one write/speak/cards/review/wrap, no word taught before), writes data/dayN.js,
adds or replaces the manifest entry, sets current = dayN and bumps the file version.
"""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAN = os.path.join(ROOT, 'data', 'manifest.js')

def W(dom, de, info, en, tr, ex, exEn, exTr, pos=None):
    w = {'dom': dom, 'de': de, 'info': info, 'en': en, 'tr': tr, 'ex': ex, 'exEn': exEn, 'exTr': exTr}
    if pos: w['pos'] = pos  # n v adj adv kon kalip rm str (tools/wordpos.py); guessed in save_day if missing
    return w

def mc(id, dom, tag, q, qEn, tr, opts, optsEn, optTr, a, exp, expEn, **kw):
    b = {'type': 'mc', 'id': id, 'dom': dom, 'tag': tag, 'q': q, 'qEn': qEn, 'tr': tr, 'opts': opts, 'optsEn': optsEn, 'optTr': optTr, 'a': a, 'exp': exp, 'expEn': expEn}
    b.update(kw); return b

def gap(opts, optsEn, optTr, a, tag, exp, expEn):
    return {'opts': opts, 'optsEn': optsEn, 'optTr': optTr, 'a': a, 'tag': tag, 'exp': exp, 'expEn': expEn}

RFX = (['richtig', 'falsch', 'nicht im Text'], ['true', 'false', 'not in the text'], ['doğru', 'yanlış', 'metinde yok'])
def rfx(id, q, qEn, tr, a, exp, expEn, tag='lesen-detail'):
    return {'type': 'mc', 'id': id, 'fixed': True, 'row': True, 'tag': tag, 'dom': 'G', 'q': q, 'qEn': qEn, 'tr': tr,
            'opts': RFX[0], 'optsEn': RFX[1], 'optTr': RFX[2], 'a': a, 'exp': exp, 'expEn': expEn}

def note(title, de, en, tr, titleEn=None):
    n = {'type': 'note', 'title': title, 'de': de, 'en': en, 'tr': tr, 'pre': True}
    if titleEn: n['titleEn'] = titleEn
    return n

def load_manifest():
    t = open(MAN, encoding='utf-8').read()
    return json.loads(t[len('window.MANIFEST = '):].rstrip().rstrip(';'))

def validate(day, words, man):
    err = []
    secs = day['sections']; ids = [s['id'] for s in secs]
    if len(ids) != len(set(ids)): err.append('duplicate section ids')
    kinds = [s['kind'] for s in secs]
    for k in ('write', 'speak', 'cards', 'review', 'wrap'):
        if kinds.count(k) > 1: err.append('more than one ' + k)
    tot = sum(s['min'] for s in secs)
    if tot > 90: err.append(f'{tot} minutes > 90')
    used = set()
    for s in secs:
        for k in ('title', 'titleEn', 'task', 'taskEn', 'taskTr', 'exam', 'dom', 'min'):
            if s.get(k) in (None, ''): err.append(f'{s["id"]}: missing {k}')
        if s['kind'] != 'quiz': continue
        if s.get('mock') and s.get('mode') != 'list': err.append(f'{s["id"]}: mock needs mode list')
        seen = set()
        for b in s['blocks']:
            if b['type'] == 'mc':
                if b['id'] in seen: err.append(f'{s["id"]}: duplicate block {b["id"]}')
                seen.add(b['id']); n = len(b['opts'])
                if not 0 <= b['a'] < n: err.append(f'{b["id"]}: bad answer index')
                if len(set(b['opts'])) != n: err.append(f'{b["id"]}: duplicate options')
                for k in ('optsEn', 'optTr'):
                    if k in b and len(b[k]) != n: err.append(f'{b["id"]}: {k} length')
                for k in ('q', 'qEn', 'tr', 'exp', 'expEn'):
                    if not b.get(k): err.append(f'{b["id"]}: missing {k}')
                used.add(b['tag'])
            elif b['type'] == 'cloze':
                ph = [int(x) for x in re.findall(r'\{(\d+)\}', b['text'])]
                if ph != list(range(1, len(b['gaps']) + 1)): err.append(f'{b["id"]}: placeholders {ph}')
                if 'sentences' in b:
                    for k in ('sentencesEn', 'sentencesTr'):
                        if len(b.get(k, [])) != len(b['sentences']): err.append(f'{b["id"]}: {k} length')
                    a = [g['a'] for g in b['gaps']]
                    if len(set(a)) != len(a): err.append(f'{b["id"]}: a sentence is used twice')
                for g in b['gaps']:
                    n = len(g['opts']) if 'opts' in g else len(b['sentences'])
                    if not 0 <= g['a'] < n: err.append(f'{b["id"]}: bad gap answer')
                    if 'opts' in g and len(set(g['opts'])) != n: err.append(f'{b["id"]}: duplicate gap options {g["opts"]}')
                    for k in ('optsEn', 'optTr'):
                        if k in g and len(g[k]) != n: err.append(f'{b["id"]}: gap {k} length')
                    if not g.get('exp') or not g.get('expEn'): err.append(f'{b["id"]}: gap without explanation')
                    used.add(g['tag'])
            elif b['type'] == 'listen':
                if not len(b['script']) == len(b['enScript']) == len(b['trScript']): err.append('listen: script lengths differ')
                for l in b['script']:
                    if l['who'] not in b['roles']: err.append('listen: unknown role ' + l['who'])
        if s.get('mode') == 'single' and any(b['type'] not in ('mc', 'note') for b in s['blocks']): err.append(f'{s["id"]}: single mode needs mc blocks')
    miss = used - set(day['tags'])
    if miss: err.append(f'undefined tags {sorted(miss)}')
    taught = {w['de'] for m in man['days'] if m['id'] != day['id'] for w in m.get('words', [])}
    rep = [w['de'] for w in words if w['de'] in taught]
    if rep: err.append(f'words taught before: {rep}')
    return err

def save_day(day, words, date, short, v=None):
    from wordpos import annotate
    bad = annotate(words)
    for s in day['sections']:
        if s.get('kind') == 'cards' and s.get('words'): bad += annotate(s['words'])
    for g in day.get('glossary', []): bad += annotate(g['items'], g.get('id', ''))
    if bad: raise SystemExit('NOT SAVED: word type unclear, pass pos=… for: ' + ', '.join(map(str, bad)))
    man = load_manifest()
    err = validate(day, words, man)
    if err: raise SystemExit('NOT SAVED:\n- ' + '\n- '.join(err))
    mw = [{k: w[k] for k in ('dom', 'pos', 'de', 'info', 'en', 'tr', 'ex', 'exEn', 'exTr') if w.get(k)} for w in words]
    for s in day['sections']:
        if s['kind'] == 'quiz' and s['id'] == 'wtest':
            for b in s['blocks']:
                if b.get('w') is not None: mw[b['w']].setdefault('q', []).append('wtest_' + b['id'])
    old = next((m for m in man['days'] if m['id'] == day['id']), None)
    ver = v or str(int(old['v']) + 1 if old and str(old.get('v', '0')).isdigit() else 1)
    entry = {'id': day['id'], 'no': day['no'], 'week': day['week'], 'date': date, 'title': day['title'], 'short': short,
             'focus': day['focus'], 'file': f'data/{day["id"]}.js', 'v': ver, 'words': mw}
    man['days'] = [m for m in man['days'] if m['id'] != day['id']] + [entry]
    man['days'].sort(key=lambda m: m['no'])
    man['current'] = day['id']
    open(MAN, 'w', encoding='utf-8').write('window.MANIFEST = ' + json.dumps(man, ensure_ascii=False, indent=1) + ';\n')
    open(os.path.join(ROOT, 'data', day['id'] + '.js'), 'w', encoding='utf-8').write('DAYS.' + day['id'] + ' = ' + json.dumps(day, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'saved {day["id"]}: {sum(s["min"] for s in day["sections"])} min, {len(words)} words, version {ver}; current = {day["id"]}')
