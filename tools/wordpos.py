"""Word type (part of speech) for the word list tab.

Keys: n Nomen · v Verb · adj Adjektiv/Partizip · adv Adverb · kon Konnektor/Präposition ·
kalip Ausdruck/Nomen-Verb-Verbindung · rm Redemittel/Prüfungssprache · str Prüfungsstrategie.
The same rules exist in src/app.js (posGuess) as a fallback; save_day() stores 'pos' in the data
so the app does not have to guess. Pass pos explicitly (W(..., pos='adj')) when the guess is wrong.
"""
import re

POS = ('n', 'v', 'adj', 'adv', 'kon', 'kalip', 'rm', 'str')
PREP = {'auf', 'mit', 'zu', 'für', 'von', 'an', 'über', 'um', 'in', 'aus', 'bei', 'nach', 'vor', 'gegen', 'unter', 'zwischen'}
OVERRIDES = {'die Garantie läuft ab': 'kalip', 'benommen': 'adj'}
STRATEGY_GROUPS = ('strateg',)


def guess_pos(de, info='', group=''):
    s = (de or '').strip(); inf = (info or '').strip().lower()
    if s in OVERRIDES: return OVERRIDES[s]
    if any(k in (group or '').lower() for k in STRATEGY_GROUPS): return 'str'
    if inf.startswith('nomen-verb'): return 'kalip'
    if re.search(r'[.!?:…]$', s) or '…' in s: return 'rm'
    for pre, p in (('nomen', 'n'), ('verb', 'v'), ('adverb', 'adv'), ('adjektiv', 'adj'), ('partizip', 'adj'),
                   ('konnektor', 'kon'), ('präposition', 'kon'), ('ausdruck', 'kalip'), ('redemittel', 'rm')):
        if inf.startswith(pre): return p
    core = re.sub(r'\([^)]*\)', ' ', s)
    core = re.sub(r'(?<!\S)(sich|etw\.|jdm\./etw\.|jdm\.|jdn\.|jds\.)(?=\s|$)', ' ', core)
    toks = [t for t in core.split() if t not in ('/',)]
    while toks and toks[0] in PREP: toks = toks[1:]
    if not toks: return None
    verbish = lambda t: t[:1].islower() and re.search(r'(en|ern|eln)$', t)
    if toks[0] in ('der', 'die', 'das'):
        rest = [t for t in toks[1:] if t not in ('der', 'die', 'das')]
        return 'kalip' if any(verbish(t) for t in rest) else 'n'
    if len(toks) == 1:
        t = toks[0]
        if t[:1].isupper(): return 'n'
        return 'v' if verbish(t) else 'adj'
    if toks[-1] == 'sein': return 'kalip'
    if verbish(toks[-1]): return 'kalip'
    if len(toks) == 2 and toks[1] in PREP: return 'adj'
    return None


def annotate(items, group=''):
    """Add 'pos' to dicts that lack it; return the list of items that could not be classified."""
    bad = []
    for it in items:
        if it.get('pos') in POS: continue
        p = guess_pos(it.get('de', ''), it.get('info', ''), group)
        if p: it['pos'] = p
        else: bad.append(it.get('de'))
    return bad
