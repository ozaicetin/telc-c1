#!/usr/bin/env python3
"""Build index.html from src/.

  python3 tools/build.py              writes ./index.html, ./sprechen/index.html (live site files) and
                                      ./artifact/sprechpartner.html (free claude.ai page; publish it with publish_files)
  python3 tools/build.py --test DIR   copies the whole site to DIR with a test hook
                                      (window.__t = {srsBuild, srsQueue, state, ui, render})
"""
import os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')

def build(test=False):
    rd = lambda n: open(os.path.join(SRC, n), encoding='utf-8').read()
    app = rd('app.js')
    if test:
        mark = '/* ---------- start ---------- */'
        assert app.count(mark) == 1
        app = app.replace(mark, "window.__t = { srsBuild: n => srsBuild(n), srsQueue: n => srsQueue(n), get state(){return state;}, ui, render };\n" + mark)
    css = rd('fonts.css') + '\n' + rd('base.css') + '\n' + rd('theme.css')
    return (rd('head.html') + '<style>' + css + '</style>\n</head>\n<body>\n<noscript>Bu site JavaScript gerektirir.</noscript>\n<div id="app"></div>\n'
            '<script>window.DAYS = window.DAYS || {};</script>\n<script src="data/seed.js?v=1"></script>\n<script>\n' + app + '\n</script>\n</body>\n</html>\n')

def _rd(n):
    return open(os.path.join(SRC, n), encoding='utf-8').read()

def build_sprechen():
    fonts = _rd('fonts.css').replace('url(fonts/', 'url(../fonts/')
    page = _rd('sprechen.html')
    assert page.count('/*FONTS*/') == 1 and page.count('/*GENERAL*/') == 1
    return page.replace('/*FONTS*/', fonts).replace('/*GENERAL*/', _rd('partner-tasks.js'))

def today_task():
    """The current day's speaking task (Teil 1A) from data/, for the free claude.ai page."""
    import json, re
    man = open(os.path.join(ROOT, 'data', 'manifest.js'), encoding='utf-8').read()
    man = json.loads(man[man.index('{'):man.rindex('}') + 1])
    cur = man['current']; m = next(d for d in man['days'] if d['id'] == cur)
    txt = open(os.path.join(ROOT, m['file']), encoding='utf-8').read()
    day = json.loads(txt[txt.index('{'):txt.rindex('}') + 1])
    sp = next((s for s in day['sections'] if s.get('kind') == 'speak'), None)
    if not sp: return None
    pts = [x['de'] for x in sp['structure']]
    fi = next((i for i, p in enumerate(pts) if re.match(r'(?i)^Anschlussfrage', p)), -1)
    return {'id': cur + '-1a', 'dayId': cur, 'day': day['no'], 'teil': 'Teil 1A', 'kind': 'present', 'title': sp['topic'],
            'target': sp.get('target', 210), 'points': [p for i, p in enumerate(pts) if i != fi],
            'follow': re.sub(r'(?i)^Anschlussfrage:\s*', '', pts[fi]) if fi >= 0 else ''}

def build_partner_artifact():
    import json
    page = _rd('partner-artifact.html')
    assert page.count('/*TODAY*/') == 1 and page.count('/*GENERAL*/') == 1
    t = today_task()
    js = 'const TODAY = ' + json.dumps(t, ensure_ascii=False).replace('<', '\\u003c') + ';'
    return page.replace('/*TODAY*/', js).replace('/*GENERAL*/', _rd('partner-tasks.js'))

def write_sprechen(root):
    os.makedirs(os.path.join(root, 'sprechen'), exist_ok=True)
    open(os.path.join(root, 'sprechen', 'index.html'), 'w', encoding='utf-8').write(build_sprechen())
    open(os.path.join(ROOT, 'artifact', 'sprechpartner.html'), 'w', encoding='utf-8').write(build_partner_artifact())

if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--test':
        out = sys.argv[2]
        if os.path.isdir(out): shutil.rmtree(out)
        shutil.copytree(ROOT, out, ignore=shutil.ignore_patterns('.git', 'src', 'tools', '*.md'))
        open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(build(True))
        write_sprechen(out)
        print('test site in', out)
    else:
        html = build()
        open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(html)
        write_sprechen(ROOT)
        print('index.html', len(html), 'bytes; sprechen/index.html and artifact/sprechpartner.html written')
