#!/usr/bin/env python3
"""Build index.html from src/.

  python3 tools/build.py              writes ./index.html (the live site file)
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

if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--test':
        out = sys.argv[2]
        if os.path.isdir(out): shutil.rmtree(out)
        shutil.copytree(ROOT, out, ignore=shutil.ignore_patterns('.git', 'src', 'tools', '*.md'))
        open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(build(True))
        print('test site in', out)
    else:
        html = build()
        open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(html)
        print('index.html', len(html), 'bytes')
