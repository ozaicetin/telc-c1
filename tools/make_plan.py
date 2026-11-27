"""Rebuild data/plan.js for telc Deutsch C1 Hochschule, June 2027 (21 stages x 5 study days, 4 days a week)."""
import json, re, sys

import os
SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'plan.js')
raw = open(SRC, encoding='utf-8').read()
P = json.loads(re.sub(r'^window\.PLAN\s*=\s*', '', raw.strip()).rstrip(';'))
old_w1 = P['weeks'][0]

P['v'] = 5
P['examDate'] = '2027-06-19'
P['examShort'] = '19.06.2027'
P['intro'] = ('Hedef: telc Deutsch C1 Hochschule, Haziran 2027 (Berlin; kesin tarih ve merkez Mart’ta seçilir). Bu sertifika Almanya’daki üniversitelere başvuruda DSH-2 ve TestDaF yerine geçer; vatandaşlık ve iş için de yeterlidir. '
              'Sınavın yapısı telc Deutsch C1 ile aynı (bölümler, süreler, 214 puan); fark içerikte: metinler, dinlemeler ve konuşma konuları üniversite ve bilim dünyasından. '
              'Plan 21 etap × 5 çalışma günü = 105 gün; haftada 4 gün, günde en fazla 90 dakika. Sınavdan önceki iki hafta tampondur: kaçırdığın günler orada yetişir. '
              'Bir günü kaçırırsan bir sonraki çalışma gününde kaldığın Tag’den devam edersin; hiçbir gün kaybolmaz, yalnızca ileri kayar. '
              'Dört faz var ve her fazın sonunda dört güne bölünmüş büyük bir deneme sınavı var. Bütün görevler resmî telc Deutsch C1 Hochschule Übungstest 1’in metin uzunluğu, soru tipi ve süresine göre yazılır; büyük denemelerde resmî ve yayınlanmış deneme sınavları kullanılır. '
              'Her “günü bitirdim”den sonra raporu yazar, ertesi günü hatalarına göre hazırlarım.')

P['phases'] = [
    {'n': 1, 't': 'Temel', 'de': 'Fundament', 'from': 1, 'to': 6, 'dates': '09.11.2026 – 26.01.2027',
     'goal': 'Sprachbausteine’nin dilbilgisi (edatlı fiiller, bağlaçlar, kelime sırası, edilgen), okuma ve dinleme stratejileri. Her sınav bölümünde sürenin tamamını kullanmak.',
     'target': '1. büyük deneme: yazılı bölümde %50'},
    {'n': 2, 't': 'Yapı', 'de': 'Aufbau', 'from': 7, 'to': 10, 'dates': '28.01. – 08.03.2027',
     'goal': 'Bütün bölümler tam uzunlukta. Her etapta bir argümantatif metin ve düzeltilmiş cümleler, haftada iki Sprechpartner konuşması. Bilim dili: Nominalstil, Passiv, Partizipialattribute; sıfat ekleri, Nomen-Verb-Verbindungen, Konjunktiv.',
     'target': '2. büyük deneme: yazılı %55–60, ardından sınava kayıt'},
    {'n': 3, 't': 'Sınav antrenmanı', 'de': 'Prüfungstraining', 'from': 11, 'to': 14, 'dates': '09.03. – 16.04.2027',
     'goal': 'Gerçek sürelerle çalışma: 70 dakikada tam metin, tam sözlü sınav, okuma bölümü tek oturumda. Zayıf iki bölüme çift çalışma.',
     'target': '3. büyük deneme: yazılı %60, sözlü 29/48'},
    {'n': 4, 't': 'Son düzlük', 'de': 'Endspurt', 'from': 15, 'to': 18, 'dates': '19.04. – 26.05.2027',
     'goal': 'Kişisel hata listesini kapatmak, genel prova (4. büyük deneme), sınav günü planı.',
     'target': 'Genel prova: yazılı %65 (yedekli), sözlü 32/48'},
]
P['buffer'] = {'dates': '27.05. – 18.06.2027', 't': 'Tampon ve hafif tekrar',
               'd': 'Kaçırdığın günler burada yetişir. Kalan zamanda kelime tekrarı, Sprechpartner ve haftada bir kısa okuma/dinleme. Sınavdan önceki hafta yeni konu yok.'}
P['milestones'] = [
    {'d': '26.11.2026', 't': 'Lesen 2 ve 3 ilk kez tam format (Tag 5)'},
    {'d': '18.–26.01.2027', 't': '1. büyük deneme (Etap 6): resmî telc Übungstest 1', 'big': True},
    {'d': '26.02.–08.03.2027', 't': '2. büyük deneme (Etap 10)', 'big': True},
    {'d': 'Mart 2027', 't': 'Sınava kayıt: tarih ve merkez seç. Kayıt genelde sınavdan yaklaşık 4 hafta önce kapanır, yerler daha önce dolabilir.', 'reg': True},
    {'d': '08.–16.04.2027', 't': '3. büyük deneme (Etap 14)', 'big': True},
    {'d': '07.–17.05.2027', 't': '4. büyük deneme: genel prova (Etap 17)', 'big': True},
    {'d': '19.06.2027', 't': 'Prüfung (hedef)', 'exam': True},
]

P['rules'][0] = {'t': 'Haftada 4 gün, günde en fazla 90 dakika',
                 'd': 'Hangi günlerde çalışacağın sana kalmış; hedef haftada 4 çalışma günü. Adımların dakika toplamı 90’ı geçmez; süre sayacı planlanan ve gerçekleşen süreyi karşılaştırır. Zincir haftalık sayılır: haftada 4 çalışma günü = zincire bir halka.'}
for _r in P['rules']:
    if _r['t'].startswith('Odak'):
        _r['t'] = 'Odak: telc Deutsch C1 Hochschule (Tag 6’dan)'
        _r['d'] = ('Tag 4’ten itibaren sektör/lojistik çalışmaları bırakıldı; Tag 6’dan (30.11.2026) hedef telc Deutsch C1 Hochschule. Sınavın yapısı telc C1 ile aynı; '
                   'metinler, dinlemeler ve konuşma konuları üniversite ve bilim dünyasından (Studium, Forschung, Studien, Vorlesung). Kelimelerde bilim dili de var (Studie, Stichprobe, belegen). '
                   'İş dünyası ve lojistik ancak bir sınav konusu olarak arada geçer.')
P['method'] = ['Haftada 4 gün çalışırsın; her gün aynı yerde başlarsın: kelime kartları, 1-3-7-14 tekrarı, kelime testi ve Fehler-Comeback, sonra günün sınav bölümü.'] + P['method'][1:]
P['weekdays'] = [
    {'d': '1. gün', 'f': 'Leseverstehen + Sprachbausteine', 'n': 'Isınma ~30 dk (20 kelime, tekrar, Comeback) + gerçek boyutta iki ya da üç görev (40–60 dk): L1 + SB, L2 + L3 ya da L1 + L2 + SB.'},
    {'d': '2. gün', 'f': 'Hörverstehen', 'n': 'Isınma ~30 dk + Hören 1–3 gerçek uzunlukta (~45 dk, okuma süreleriyle); sınav modunda her ses bir kez. Hören 3’te (Gastvortrag) notları kendin yazarsın.'},
    {'d': '3. gün', 'f': 'Schriftlicher Ausdruck', 'n': 'Kısa ısınma ~15 dk (kartlar, tekrar) + iki konudan biri (her konuda iki alıntı), kendi görüşünü argümanlarla anlatan en az 350 kelimelik metin (Faz 1’de 40–50 dk, Etap 7’den itibaren her seferinde tam 70 dk); metnin düzeltilmiş cümleleri ertesi günün Comeback’ine girer.'},
    {'d': '4. gün', 'f': 'Mündlicher Ausdruck', 'n': 'Isınma ~25 dk + 20 dk hazırlık + 1A (iki akademik konudan biri), 1B (özet + soru), 2 (bir alıntı üzerine tartışma), ~16 dk Sprechpartner ile + telc ölçütlerine göre değerlendirme.'},
    {'d': '5. gün', 'f': 'Boss: Probeprüfung', 'n': 'Isınma ~20 dk + etabın en zayıf iki bölümü gerçek boyutta ve sınav modunda (~60 dk) + etap raporu.'},
]
ours = {
    'Lesen 1': 'Tag 4’te ilk deneme; etapların 1. gününde dönüşümlü; büyük denemelerde (Etap 6, 11, 16, 20) tam',
    'Lesen 2': 'Tag 5’te ilk kez tam format; etapların 1. gününde dönüşümlü',
    'Lesen 3': 'Tag 5’ten itibaren tam format; etapların 1. gününde dönüşümlü',
    'Sprachbausteine': 'Tag 4’ten itibaren tam uzunlukta; her etapta en az bir kez',
    'Hören 1': 'Etapların 2. günü',
    'Hören 2': 'Tag 4’te ilk deneme; etapların 2. günü',
    'Hören 3': 'Etapların 2. günü; notları kendin yazarsın (Tag 7’den); Etap 5’ten itibaren üç bölüm birlikte',
    'Schriftlicher': 'Etapların 3. günü; Faz 1’de 40–50 dk, Etap 7’den itibaren her seferinde tam 70 dk ve ~350 kelime',
    'Mündlicher': 'Etapların 4. günü, Sprechpartner ile; büyük denemelerde tam sözlü sınav',
}
fmt = {
    'Lesen 1': 'Bilgi metni (400–500 kelime), 6 boşluk + örnek (0), 8 cümle (a–h), 2 cümle uymuyor; önerilen ~15 dk',
    'Lesen 2': 'Tek metin, 5 bölüm (a–e, 650–850 kelime); 6 soru „In welchem Abschnitt …“, çoğu yazarın tutumu ya da niyeti; bir bölüm birden fazla kez cevap olabilir; ~15 dk',
    'Lesen 3': 'Bilgi metni (1.000–1.200 kelime); 11 ifade richtig / falsch / nicht im Text (metin sırasıyla) + 3 seçenekli başlık; ~30 dk',
    'Sprachbausteine': 'Popüler bilim metni (~400–500 kelime), 22 boşluk, 4 şık (a–d): bağlaç, edat ve hâl, fiil biçimi, kelime ve kalıp, kelime sırası',
    'Hören 1': '8 kişi (her biri ~70–130 kelime, çoğu zaman üniversite hayatından), 10 ifade (a–j), 2 ifade uymuyor; 1 dk okuma; bir kez dinlenir',
    'Hören 2': 'Radyo röportajı (çoğu zaman bir bilim insanıyla); 10 yarım cümle, 3 bitiş (a–c); 3 dk okuma; bir kez dinlenir',
    'Hören 3': 'Gastvortrag / Vorlesung; Handzettel’de 10 not, her biri 1–3 kelime, kendin yazarsın (tam doğru 2, kısmen 1 puan); 1 dk okuma + 5 dk aktarma; bir kez dinlenir',
    'Schriftlicher': 'İki konudan biri, her konuda iki alıntı; kendi görüşünü argümanlarla anlatan metin (giriş, gelişme, sonuç, örnekler), en az 350 kelime, 70 dk; 4 ölçüt × 12 puan',
    'Mündlicher': '20 dk hazırlık; 1A iki akademik konudan biri (~3 dk), 1B partnerin sunumunu özetleme + en az bir soru (~2 dk), 2 bir alıntı üzerine tartışma (~6 dk, 4 yönlendirme sorusu); içerik 16 + dil 32 puan',
}
for r in P['exam']:
    for k, v in fmt.items():
        if r['part'].startswith(k):
            r['fmt'] = v
    for k, v in ours.items():
        if r['part'].startswith(k):
            r['ours'] = v
P['examNote'] = ('Sertifika için toplam 214 puandan en az 128 gerekir; ayrıca yazılı (166 üzerinden 99) ve sözlü (48 üzerinden 29) bölümün her birinde en az %60 şart. '
                 'Yalnızca bir bölüm kalırsa o bölüm ertesi takvim yılının sonuna kadar tek başına tekrarlanabilir. '
                 'Bilgi: resmî telc Deutsch C1 Hochschule Übungstest 1. Hedef: Haziran 2027 (Berlin); kayıt Mart’ta, büyük denemeler Ocak, Mart, Nisan ve Mayıs’ta.')


def reg(focus1, s1, d1, focus2, s2, d2, s3, d3, s4, d4, s5, d5, topic):
    return [
        {'focus': focus1, 's': s1, 'g': topic, 'detail': d1},
        {'focus': focus2, 's': s2, 'g': topic, 'detail': d2},
        {'focus': 'Schriftlicher Ausdruck', 's': s3, 'g': topic, 'detail': d3},
        {'focus': 'Mündlicher Ausdruck', 's': s4, 'g': topic, 'detail': d4},
        {'focus': 'Boss: Probeprüfung', 's': s5, 'g': topic, 'detail': d5, 'boss': True},
    ]


SRC_BIG = {1: 'Malzeme: resmî telc Deutsch C1 Hochschule Übungstest 1 (telc.net, ücretsiz PDF + ses). Kâğıtta çözersin, cevaplarını sohbete yazarsın, ben puanlarım. ',
           2: 'Malzeme: Klett „Mit Erfolg zu telc C1 Hochschule – Testbuch“, Modelltest 1 (gerçek ses kayıtlarıyla); kitap yoksa resmî ölçülerde hazırladığım tam deneme. ',
           3: 'Malzeme: Klett Testbuch, Modelltest 2; kitap yoksa resmî ölçülerde hazırladığım tam deneme. ',
           4: 'Malzeme: Klett Testbuch, Modelltest 3 (ya da Hueber „Prüfung Express“, Modellprüfung 2); kitap yoksa resmî ölçülerde hazırladığım tam deneme. '}


def big(n, extra=''):
    t = 'Karma Hochschul-Themen'
    return [
        {'focus': f'Große Probeprüfung {n} · Leseverstehen + Sprachbausteine', 's': 'Lesen 1–3 ve Sprachbausteine: 70 puan, 90 dakika, tek oturum, ara yok', 'g': t,
         'detail': SRC_BIG.get(n, 'Malzeme: resmî ölçülerde hazırladığım yeni bir tam deneme (sitede, sınav modunda). ') + 'Gerçek sınav gibi. Bu gün kelime kartı ve tekrar yok, yalnızca sınav.', 'big': True},
        {'focus': f'Große Probeprüfung {n} · Hörverstehen', 's': 'Hören 1–3: 48 puan, yaklaşık 40 dakika; ardından kelime tekrarı', 'g': t,
         'detail': 'Her ses yalnızca bir kez. Dinlerken not al, transkript yalnızca teslimden sonra. Kalan sürede tekrar ve Comeback.', 'big': True},
        {'focus': f'Große Probeprüfung {n} · Schriftlicher Ausdruck', 's': 'İki konudan biri (her konuda iki alıntı), kendi görüşünü anlatan argümantatif metin, en az 350 kelime: 48 puan, 70 dakika', 'g': t,
         'detail': 'Metnini sohbette paylaş: telc ölçütleriyle puan ve düzeltilmiş cümleler.', 'big': True},
        {'focus': f'Große Probeprüfung {n} · Mündlicher Ausdruck', 's': '20 dakika hazırlık + 1A (akademik konu), 1B, 2 (alıntı tartışması), yaklaşık 16 dakika; Sprechpartner partner rolünde', 'g': t,
         'detail': 'Sprechpartner sonunda telc ölçütlerine göre değerlendirir; sonuç Karne’ye girer.', 'big': True},
        {'focus': 'Bilanz: Auswertung + Fehlerliste', 's': 'Dört günün puanları 214 üzerinden; %60 eşikleriyle karşılaştırma', 'g': 'Senin hata listen',
         'detail': 'Hangi bölüm %60’ın altında? Sonraki fazın ağırlığı buna göre değişir. Geride kaldıysan planı burada kısaltırım; büyük denemeler hiç çıkarılmaz.' + extra, 'bil': True},
    ]


W = []
w1 = dict(old_w1)
w1.update({'title': 'Arbeitswelt & erste Probeprüfung', 'phase': 1, 'dates': '09.11. – 26.11.2026'})
w1['days'] = [dict(d) for d in old_w1['days']]
w1['days'][3]['boss'] = True
w1['days'][4].update({'focus': 'Leseverstehen 2 + 3 (Originalformat)', 's': 'Lesen 2 (yaklaşık 800 kelime, 6 soru, 12 P) ve Lesen 3 (13 paragraf, yaklaşık 1.150 kelime, 11 + 1, 24 P), resmî sınav uzunluğunda', 'g': 'Wohnen und Stadtleben', 'detail': 'İlk gerçek ölçülü gün. Tag 4 sonuçlarına göre: deneme sınavındaki bütün dilbilgisi hataları yeni bir metinde (Fehler-Comeback), Lesen 1 için strateji antrenmanı ve süre kuralı. Hören 1 Tag 7’ye taşındı.'})
W.append(w1)


def stage(w, phase, title, dates, sector, general, grammar, writing, speaking, days, outcome, note=None):
    w = w or len(W) + 1
    x = {'w': w, 'phase': phase, 'title': title, 'dates': dates, 'sector': sector, 'general': general, 'grammar': grammar,
         'writing': writing, 'speaking': speaking, 'days': days, 'outcome': outcome}
    if note:
        x['note'] = note
    W.append(x)


LS = 'Leseverstehen 1 · Sprachbausteine'
L23 = 'Leseverstehen 2 · 3'
L3S = 'Leseverstehen 3 · Sprachbausteine'
HALL = 'Hörverstehen 1–3'
TOP = 'Soziale Medien und Algorithmen, digitale Lehre, Studien und Umfragen lesen, Fake News, Datenschutz'
stage(None, 1, 'Medien, Digitalisierung & Wissenschaft', '30.11. – 07.12.2026',
      'Sprachbausteine’de süreyi kullanmak (en az 15 dk); Lesen 1 bağlantı kelimeleriyle', TOP,
      'Verben mit Präpositionen · Präpositionaladverbien (darüber, darauf, damit) und Fragewörter (worüber, worauf) · es kommt zu',
      'Argumentativer Text: Aufbau (Einleitung – Standpunkt – Argumente – Gegenargument – Schluss)', 'Präsentation 1A: Gliederung ankündigen, Beispiel geben',
      reg(LS, 'Lesen 1 (6 boşluk, 12 P) ve Sprachbausteine (22 boşluk, 22 P) tam uzunlukta, sınav modunda',
          'Sprachbausteine’de her boşlukta önceki ve sonraki cümleyi oku; edatlı fiiller en sık tuzak. Fiilin edatını sor: nachdenken über → darüber.',
          'Hörverstehen 1 · 2', 'Hören 1 (8 öğrenci ve öğretim üyesi, kampüste dijital hayat) ve Hören 2 (bir bilim insanıyla radyo röportajı, 10 yarım cümle, a–c); gerçek sınav gibi her ses yalnızca bir kez',
          'Dinlerken aynı kelimeyi değil aynı anlamı ara (Umschreibung). Hören 1 için 1, Hören 2 için 3 dakika okuma süresi; anahtar kelimeleri işaretle.',
          'Argümantatif metin: plan (10 dk) + yazma (35 dk) + model metin',
          'Beş bölümlü yapı ve 8 sabit Redemittel. Metnini sohbette paylaşırsan düzeltilmiş cümleler ertesi günün Comeback’ine girer.',
          '1A Präsentation (3–4 dk) ve Anschlussfrage; Sprechpartner ile', 'Sunumu duyurarak başla: Zuerst … dann … zum Schluss …',
          'Etabın en zayıf iki bölümü sınav modunda + etap raporu', 'Puan, süre ve hata analizi; sonraki etabın odağı buna göre seçilir.', TOP),
      ['darüber, darauf, damit’i fiile göre doğru seçiyorsun', 'Sprachbausteine’ye en az 15 dakika ayırıyorsun', 'Bir argümantatif metni beş bölümle planlıyorsun'])

TOP = 'Klimaforschung, Energiewende, nachhaltige Hochschule, Artenschutz, Wetterextreme'
stage(None, 1, 'Umwelt, Klima & Forschung', '09.12. – 17.12.2026',
      'Lesen 2 ve 3 tam format; Hören 1 genel tutum', TOP,
      'Konnektoren I: obwohl ↔ weil, trotzdem ↔ deshalb, sowohl … als auch, weder … noch, je … desto, während',
      'Argumentativer Text zu einem Zitat: Position, Begründung, Beispiel', 'Diskussion (Teil 2): ein Zitat deuten, Position beziehen, widersprechen',
      reg(L23, 'Lesen 2 (6 ifade, 12 P) ve Lesen 3 (11 + 1, 24 P) sınav modunda',
          'Lesen 3’te falsch ile nicht im Text ayrımı: metin aksini mi söylüyor, yoksa hiç mi söylemiyor?',
          'Hörverstehen 3 · 1', 'Hören 3 (sunum, yaklaşık 1.000 kelime, 10 not) ve Hören 1; her ses bir kez',
          'Hören 3’te notlar kısa kelime grupları; slayttaki boşluğun türünü (sayı, isim, neden) önceden tahmin et.',
          'Argümantatif metin (alıntıdan yola çıkarak): 40 dk yazma + model metin', 'Bağlaçlarla zıtlık ve sonuç: obwohl, trotzdem, deshalb, folglich.',
          'Diskussion (Teil 2): bir alıntı + kısa 1A', 'Alıntıyı önce kendi sözlerinle açıkla: Ich verstehe das Zitat so, dass … / Da muss ich widersprechen …',
          'Lesen 1 + Sprachbausteine sınav modunda + etap raporu', 'Bağlaç hataları ayrıca sayılır.', TOP),
      ['obwohl/weil ve trotzdem/deshalb’ı anlama göre seçiyorsun', 'Lesen 3’te falsch ile nicht im Text’i ayırıyorsun', 'Tartışmada itiraz edip uzlaşma önerebiliyorsun'])

TOP = 'Studieren in Deutschland, Studienfinanzierung, Studienalltag und Wohnen, Seniorenstudium, Chancengleichheit'
stage(None, 1, 'Studium & Hochschule', '18.12.2026 – 06.01.2027',
      'Hören 2’de Umschreibungen; Lesen 1 Textrekonstruktion', TOP,
      'Wortstellung: Verb auf Position 2 nach Adverb (Heutzutage versuchen …), Verb am Ende im Nebensatz · Relativsätze (denen, dessen, was, wo)',
      'Argumentativer Text mit eigenem Beispiel (Deutschland und Türkei)', 'Zusammenfassung (Teil 1B) und Anschlussfragen',
      reg(LS, 'Lesen 1 ve Sprachbausteine sınav modunda',
          'Lesen 1’de boşluktan önceki ve sonraki cümledeki gösterme sözcüklerini (dies, dabei, deshalb) bul.',
          'Hörverstehen 2 · 3', 'Hören 2 ve Hören 3',
          'Röportajda cevap çoğu zaman başka kelimelerle gelir; şıktaki kelimeyi duymak yetmez.',
          'Argümantatif metin (45 dk) + model metin', 'Cümle başında zarf → fiil 2. sırada; yan cümlede fiil sonda. Kendi metninde kontrol listesiyle.',
          '1B Zusammenfassung + Anschlussfragen', 'Özet kalıpları: Im Text geht es um … / Der Autor vertritt die Meinung, dass …',
          'Lesen 2 + Hören 1 sınav modunda + etap raporu', 'Tatilden sonra ilk gün kısa bir tekrarla başlar.', TOP),
      ['Cümle başında zarftan sonra fiili 2. sıraya koyuyorsun', 'denen, dessen gibi ilgi zamirlerini doğru seçiyorsun', 'Bir metni 1B’de 1–2 dakikada özetleyebiliyorsun'],
      note='24.12. – 01.01. tatil: çalışma yok. Etap tatilden önce başlar, sonra devam eder.')

TOP = 'Studien zu Stress und Schlaf, Prüfungsangst, Gesundheitssystem, Ernährung, Medizinforschung'
stage(None, 1, 'Gesundheit, Medizin & Psychologie', '08.01. – 15.01.2027',
      'Lesen 3’te güven; Hören 1–3 ilk kez birlikte (40 dk)', TOP,
      'Passiv in allen Zeiten (wurde gegründet, ist … worden, muss … werden) · Passiversatz (sich lassen, -bar, sein + zu)',
      'Einleitung und Schluss: feste Redemittel', 'Präsentation 1A unter Zeit (3–4 Minuten, mit Uhr)',
      reg(L3S, 'Lesen 3 (24 P) ve Sprachbausteine (22 P) sınav modunda',
          'Sprachbausteine’de edilgen ve sich lassen; Lesen 3’te önce ifadeyi, sonra metinde yerini bul.',
          HALL, 'Hören 1, 2, 3 tam uzunlukta, yaklaşık 40 dakika',
          'Üç bölüm arka arkaya: dikkatini 40 dakika boyunca tutmak da sınavın parçası.',
          'Argümantatif metin (45 dk)', 'Giriş ve sonuç için ezber kalıplar; ortası senin argümanların.',
          '1A + Diskussion', 'Saatle sunum: 3 dakikadan kısa olmasın.',
          'Faz 1’in bütün görev tipleri karışık, sınav modunda + etap raporu', 'Büyük denemeden önce son kontrol.', TOP),
      ['Edilgeni her zamanda kurabiliyorsun (wurde gegründet, lässt sich vermeiden)', 'Hören’in üç bölümünü 40 dakika boyunca çözüyorsun', 'Sunumu 3–4 dakikada bitirebiliyorsun'])

stage(None, 1, 'Große Probeprüfung 1', '18.01. – 26.01.2027',
      'Tam deneme: yazılı ve sözlü, gerçek süreler (dört güne bölünmüş)', 'Karma Hochschul-Themen (Etap 1–5)',
      'Faz 1 tekrarı: Präpositionaladverbien, Konnektoren, Wortstellung, Passiv', 'Tam görev: iki konudan biri, 70 dakika',
      'Tam sözlü sınav: 20 dk hazırlık + 1A, 1B, 2', big(1),
      ['214 puan üzerinden ilk tam puanın var', 'Hangi bölümün %60’ın altında olduğunu biliyorsun', 'Faz 2’nin ağırlığı senin sonucuna göre belirlendi'])

TOP = 'Arbeitsmarkt für Akademiker, Berufseinstieg und Praktikum, Globalisierung und Lieferketten, Online-Handel, Work-Life-Balance'
stage(None, 2, 'Wirtschaft, Arbeit & Karriere', '28.01. – 05.02.2027',
      'Lesen 1 + 2 + Sprachbausteine aynı oturumda (yaklaşık 60 dk)', TOP,
      'Adjektivdeklination (mit einer vollständigen Mappe) · Partizipialattribute (die steigenden Mieten, der viel diskutierte Plan)',
      'Argumentativer Text zu einem Zitat (70 dk)', 'Diskussion: auf Argumente reagieren, nachfragen',
      reg('Leseverstehen 1 · 2 · Sprachbausteine', 'Üç görev tek oturumda, yaklaşık 60 dakika, sınav modunda',
          'Sıra senin: önce en emin olduğun görevi çöz, saati her görevden sonra kontrol et.',
          HALL, 'Hören 1, 2, 3 tam uzunlukta', 'Faz 1’deki dinleme hataların Comeback’te.',
          'Argümantatif metin: tam görev, 70 dk, en az 350 kelime + düzeltilmiş cümleler', 'İlk tam süreli yazma. Sıfat eklerini yazarken kontrol: artikel var mı, hangi hâl?',
          'Diskussion + 1B', 'Karşı tarafın argümanını tekrar edip cevap ver: Sie sagen, dass … Aber …',
          'En zayıf iki bölüm sınav modunda + etap raporu', 'Faz 2’nin ilk ölçümü.', TOP),
      ['Sıfat eklerini artikel türüne göre seçiyorsun', 'Okumada üç görevi 50 dakikada bitirebiliyorsun', 'Tartışmada karşı tarafın argümanına cevap veriyorsun'])

TOP = 'Demografischer Wandel, Altersforschung, Pflege, Ehrenamt, Familie und Studium'
stage(None, 2, 'Gesellschaft, Generationen & Altersforschung', '08.02. – 15.02.2027',
      'Lesen 3 + Sprachbausteine aynı oturumda; Hören 2 tam', TOP,
      'Nomen-Verb-Verbindungen (zur Verfügung stellen, in Anspruch nehmen, Abhilfe schaffen) · Nominalisierung',
      'Argumentativer Text (70 dk): Gegenargument widerlegen', 'Präsentation 1A mit Beispiel aus dem Heimatland',
      reg(L3S, 'Lesen 3 ve Sprachbausteine tek oturumda, yaklaşık 55 dakika',
          'Nomen-Verb-Verbindungen Sprachbausteine’in en sevdiği boşluk: isim ve fiil birlikte öğrenilir.',
          HALL, 'Hören 1, 2, 3 tam uzunlukta', 'Hören 2’de soruyu iki kez okuma alışkanlığı.',
          'Argümantatif metin: tam görev, 70 dk, en az 350 kelime', 'Karşı argümanı çürütmek: Zwar …, aber … / Dem lässt sich entgegenhalten, dass …',
          '1A Präsentation (Türkiye–Almanya karşılaştırması)', 'Kendi ülkenden bir örnek sunumu güçlendirir.',
          'Karma deneme + etap raporu', '', TOP),
      ['Sık kullanılan Nomen-Verb-Verbindungen’ı biliyorsun', 'Bir karşı argümanı çürütebiliyorsun', 'Sunumda iki ülkeyi karşılaştırabiliyorsun'])

TOP = 'Interkulturelle Kommunikation, internationale Studierende, Mehrsprachigkeit, Fremdsprachen lernen, Fachkräfte'
stage(None, 2, 'Interkulturalität, Migration & Spracherwerb', '17.02. – 25.02.2027',
      'Hören 1 + 3; Lesen 2 hızlı', TOP,
      'Konjunktiv II (Vorschläge, Hypothesen: Es wäre sinnvoll, …) · indirekte Rede mit Konjunktiv I (Er sagt, er habe …)',
      'Argumentativer Text: Argumente gewichten (das wichtigste zuletzt)', 'Teil 1 komplett (1A + 1B) mit Sprechpartner',
      reg('Leseverstehen 2 · Sprachbausteine', 'Lesen 2 ve Sprachbausteine sınav modunda',
          'Lesen 2’de paragrafın ana fikri ile ifadeyi eşleştir; aynı kelime tuzağına dikkat.',
          HALL, 'Hören 1, 2, 3 tam uzunlukta', 'Hören 3’te notlar en çok 3–4 kelime.',
          'Argümantatif metin: tam görev, 70 dk, en az 350 kelime', 'Öneriler Konjunktiv II ile: Man sollte …, Es wäre besser, wenn …',
          '1A + 1B arka arkaya', 'Sprechpartner sonunda telc ölçütleriyle değerlendirir.',
          'Karma deneme + etap raporu', '2. büyük denemeden önce son kontrol.', TOP),
      ['Öneri ve varsayımları Konjunktiv II ile kuruyorsun', 'Dolaylı anlatımı (Konjunktiv I) tanıyorsun', 'Argümanları önem sırasına koyuyorsun'])

TOP = 'Verhaltensökonomie, Werbung, Nachhaltigkeit, Sharing Economy, Lebensmittelverschwendung'
stage(None, 2, 'Ökonomie, Konsum & Nachhaltigkeit', '',
      'Lesen 1 + SB hız; Hören 2 tam', TOP,
      'Modalverben subjektiv (soll, will, dürfte, müsste) · Vermutungen ausdrücken (wohl, vermutlich, es ist anzunehmen, dass)',
      'Argumentativer Text: Pro und Contra abwägen, eigener Standpunkt', 'Präsentation 1A: eine Entwicklung im Heimatland vorstellen',
      reg(LS, 'Lesen 1 ve Sprachbausteine sınav modunda (yaklaşık 40 dk)',
          'Sprachbausteine’de modal fiiller ve tahmin kalıpları; Lesen 1’de boşluktan sonraki cümle de kontrol edilir.',
          HALL, 'Hören 1, 2, 3 tam uzunlukta, her ses bir kez', 'Hören 2’de konuşmacının tutumu (skeptisch, begeistert) sık sorulur.',
          'Argümantatif metin: tam görev, 70 dk, en az 350 kelime', 'Tartma kalıpları: Einerseits … andererseits … / Wägt man die Argumente ab, so …',
          '1A Präsentation + Diskussion', '',
          'Karma deneme + etap raporu', '2. büyük denemeden önce son kontrol.', TOP),
      ['soll/will/dürfte’yi doğru anlamda kullanıyorsun', 'Artı ve eksileri tartıp gerekçeli bir sonuç yazıyorsun', 'Kendi ülkendeki bir gelişmeyi sunabiliyorsun'])

stage(None, 2, 'Große Probeprüfung 2', '26.02. – 08.03.2027',
      'Tam deneme, gerçek süreler; ardından sınava kayıt', 'Karma Hochschul-Themen (Etap 1–10)',
      'Faz 1–2 tekrarı', 'Tam görev: iki konudan biri, 70 dakika', 'Tam sözlü sınav',
      big(2, ' Bu bilançodan sonra sınava kayıt: tarih ve merkez seçeriz.'),
      ['İki tam denemeyi karşılaştırıp ilerlemeni görüyorsun', 'Sınav tarihini seçip kaydını yaptın', 'Faz 3 için en zayıf iki bölüm belli'],
      note='Mart: sınava kayıt. Kayıt genelde sınavdan yaklaşık 4 hafta önce kapanır; yerler daha önce dolabilir.')

TOP = 'Verkehrswende, Stadtplanung und Stadtforschung, Leben auf dem Land, Pendeln, Tourismus'
stage(None, 3, 'Stadt, Mobilität & Raumplanung', '09.03. – 17.03.2027',
      'Okuma bölümünün yarısı tek oturumda; 70 dk tam metin', TOP,
      'Infinitivkonstruktionen (um … zu, ohne … zu, statt … zu) · zu-Infinitiv oder dass-Satz · Präpositionen mit Genitiv (aufgrund, trotz, angesichts, hinsichtlich)',
      'Volltext: 70 Minuten, ein Thema aus zwei', 'Komplette mündliche Prüfung (1A, 1B, 2)',
      reg('Leseverstehen 1 · 2 · Sprachbausteine', 'Üç görev tek oturumda, gerçek süre payıyla (yaklaşık 60 dk)',
          'Gerçek sınavda 90 dakikayı nasıl böleceğini burada denersin.',
          HALL, 'Hören 1, 2, 3, gerçek sınav sırası ve süresi', '',
          'Volltext: 70 dakika (5 dk seçim, 10 dk plan, 50 dk yazma, 5 dk kontrol)', 'Süre planını sınavdaki gibi uygula.',
          'Tam sözlü sınav (20 + 16 dk)', 'Sprechpartner partner rolünde; değerlendirme telc ölçütleriyle.',
          'Zayıf bölüm sınav modunda + etap raporu', '', TOP),
      ['um/ohne/statt … zu’yu doğru kuruyorsun', '70 dakikada tam bir metin yazıyorsun', 'Tam sözlü sınavı baştan sona yaptın'])

TOP = 'Künstliche Intelligenz, große Erfindungen, Robotik, Forschungsethik, Zukunft der Arbeit'
stage(None, 3, 'Technik, Fortschritt & Erfindungen', '19.03. – 26.03.2027',
      'Hören gerçek sürede; Lesen 3 + Sprachbausteine', TOP,
      'Konnektoren II: zumal, sofern, sodass, indem, wohingegen, es sei denn',
      'Zwei Themen zur Auswahl: in 5 Minuten entscheiden', 'Diskussion unter Zeitdruck, Redemittel-Karten',
      reg(L3S, 'Lesen 3 ve Sprachbausteine, gerçek süre payıyla',
          'İleri bağlaçlar Sprachbausteine’de: zumal, sofern, sodass.',
          HALL, 'Hören 1, 2, 3 gerçek sınav gibi', '',
          'Argümantatif metin: tam görev, 70 dk', 'Konu seçimini 5 dakikada yap: hangisine daha çok örnek bulabiliyorsun?',
          'Diskussion (Teil 2) + Bewertung', 'Redemittel kartlarından en az 4 kalıp kullan.',
          'Karma deneme + etap raporu', '', TOP),
      ['zumal, sofern, sodass’ı doğru kullanıyorsun', 'İki konudan birini hızlı seçiyorsun', 'Tartışmada kalıpları kendiliğinden kullanıyorsun'])

TOP = 'Literatur und Lesen, Kunst in der Schule, Natur- oder Geisteswissenschaften, Museen, Bildung durch Reisen'
stage(None, 3, 'Kultur, Literatur & Geisteswissenschaften', '29.03. – 06.04.2027',
      'En zayıf iki bölüme çift çalışma (2. büyük denemeye göre)', TOP,
      'Stil und Register: Nominalstil ↔ Verbalstil, formelle Redemittel',
      'Korrekturlesen mit eigener Fehler-Checkliste (5 Minuten am Ende)', '1A + 1B mit Bewertung nach telc-Kriterien',
      reg('Leseverstehen · Sprachbausteine (zayıf görevler)', '2. büyük denemede en düşük iki okuma görevi, sınav modunda',
          'Hangi görev olduğu senin sonucuna göre seçilir.',
          'Hörverstehen (zayıf görevler)', 'Dinlemede en düşük iki görev', '',
          'Volltext (70 dk) + kendi kontrol listen', 'Son 5 dakika: edatlar, fiilin yeri, sıfat ekleri.',
          '1A + 1B + Bewertung', '',
          'Karma deneme + etap raporu', '', TOP),
      ['Zayıf iki bölümün puanı yükseldi', 'Metnini kendi listenle kontrol ediyorsun', 'Resmî ve günlük dili ayırıyorsun'])

TOP = 'Wissenschaftssprache, Referat und Hausarbeit, Gruppenarbeit, Plagiat, Sprache im Wandel'
stage(None, 3, 'Sprache, Kommunikation & wissenschaftliches Arbeiten', '',
      'Gerçek süreler: okuma bölümünün üç görevi tek oturumda; Hören tam', TOP,
      'Wortbildung (Präfixe, Suffixe, Komposita) · Partizip I und II als Adjektiv (die wachsende Zahl, die gestellte Frage)',
      'Volltext 70 dk: argumentativer Text', 'Komplette mündliche Prüfung mit Bewertung',
      reg('Leseverstehen 1 · 3 · Sprachbausteine', 'Üç görev tek oturumda, gerçek süre payıyla (yaklaşık 65 dk)',
          'Gerçek sınavın 90 dakikalık okuma bölümüne en yakın gün.',
          HALL, 'Hören 1, 2, 3 gerçek sınav gibi', '',
          'Volltext (70 dk)', 'Kelime türetme: Sprachbausteine’de ve kendi metninde.',
          'Tam sözlü sınav (20 + 16 dk)', '',
          'Zayıf bölüm sınav modunda + etap raporu', '3. büyük denemeden önce son kontrol.', TOP),
      ['Kelime türetmeyi tanıyıp kullanıyorsun', 'Okuma bölümünün büyük kısmını tek oturumda çözüyorsun', 'Sözlü sınavda üç bölümü de akıcı yapıyorsun'])

stage(None, 3, 'Große Probeprüfung 3', '08.04. – 16.04.2027',
      'Tam deneme, gerçek süreler', 'Karma Hochschul-Themen (Etap 1–15)', 'Faz 1–3 tekrarı',
      'Tam görev: iki konudan biri, 70 dakika', 'Tam sözlü sınav', big(3),
      ['Yazılı bölümde %60 eşiğine ne kadar yakın olduğunu biliyorsun', 'Kişisel hata listen kesinleşti', 'Son fazın planı hazır'])

TOP = 'Demokratie, Hochschulpolitik und Studiengebühren, Verbraucherrecht, Ethik in Forschung und Medizin'
stage(None, 4, 'Politik, Recht & Ethik', '19.04. – 26.04.2027',
      'Kişisel hata listesi I; Sprachbausteine hızı', TOP,
      'Fehlerliste I: Verben mit Präpositionen, Konnektoren, Relativpronomen',
      'Volltext 70 dk + Selbstkorrektur', 'Komplette mündliche Prüfung',
      reg(LS, 'Lesen 1 ve Sprachbausteine sınav modunda', 'Boşluklar senin hata listenden.',
          HALL, 'Hören 1, 2, 3 gerçek sınav gibi', '',
          'Volltext (70 dk)', '', 'Tam sözlü sınav', '',
          'Karma deneme + etap raporu', '', TOP),
      ['Hata listenin ilk yarısı kapandı', 'Sprachbausteine’yi süre içinde ve dikkatle çözüyorsun', 'Sözlü sınavda rahat konuşuyorsun'])

TOP = 'Karma Hochschul-Themen (sınavda sık çıkanlar)'
stage(None, 4, 'Gemischte Prüfungsthemen', '28.04. – 06.05.2027',
      'Kişisel hata listesi II; en zayıf bölüm iki kez', TOP,
      'Fehlerliste II: Wortstellung, Adjektivendungen, Passiv',
      'İki farklı çıkış noktası: alıntıdan ve sorudan argümantatif metin', 'Sprechpartner: sınav simülasyonu',
      reg(L23, 'Lesen 2 ve Lesen 3 sınav modunda', '',
          HALL, 'Hören 1, 2, 3 gerçek sınav gibi', '',
          'Argümantatif metin: tam görev, 70 dk', '', '1A + 1B + 2', '',
          'En zayıf bölüm sınav modunda + etap raporu', 'Genel provadan önce son kontrol.', TOP),
      ['Hata listenin ikinci yarısı kapandı', 'Alıntıdan da sorudan da rahat yazıyorsun', 'Genel provaya hazırsın'])

TOP = 'Karma Hochschul-Themen'
stage(None, 4, 'Schwachstellen-Training', '',
      'En zayıf iki bölüm ikişer kez (3. büyük denemeye göre)', TOP,
      'Fehlerliste III: en sık 10 hatan, her biri yeni cümlelerde',
      'Kendi zayıf ölçütüne göre (ör. Kommunikative Gestaltung)', 'Zayıf sözlü bölüm iki kez',
      reg('Schwächster Leseteil', '3. büyük denemede en düşük okuma görevi, iki farklı metinle', 'Hangi görev olduğu senin sonucuna göre seçilir.',
          'Schwächster Hörteil', 'En düşük dinleme görevi, iki farklı kayıtla', '',
          'Volltext (70 dk)', '', 'Tam sözlü sınav', '',
          'Karma deneme + etap raporu', 'Genel provadan önce son kontrol.', TOP),
      ['En zayıf iki bölümün %60’ın üzerinde', 'En sık 10 hatan artık tekrar etmiyor', 'Genel provaya hazırsın'])

stage(None, 4, 'Große Probeprüfung 4: Generalprobe', '07.05. – 17.05.2027',
      'Gerçek sınav koşulları: sabah, aynı sıra, aynı süreler', 'Karma Hochschul-Themen', 'Tüm hata listesi',
      'Tam görev: iki konudan biri, 70 dakika', 'Tam sözlü sınav', big(4),
      ['Sınav günü gibi bir puanın var', 'Her bölümde süre planın hazır', 'Son haftaların odağı belli'],
      note='Mümkünse gerçek sınav saatinde (sabah) yap; sıra da sınavdaki gibi: önce okuma ve Sprachbausteine, sonra dinleme ve yazma.')

stage(None, 4, 'Endspurt', '18.05. – 26.05.2027',
      'Hata listesini kapatmak, sınav günü planı', 'Tüm etapların kelimeleri', 'Kişisel test: kendi hatalarından 30 soru',
      'Redemittel kartları son tekrar', 'Kısa sunum ve tartışma, rahat tempo',
      [{'focus': 'Fehlerliste: Sprachbausteine', 's': 'Kendi hatalarından kişisel test', 'g': 'Senin hata listen', 'detail': ''},
       {'focus': 'Lesen + Hören: Strategien', 's': 'Her görev tipinden bir kısa örnek, stratejiyle', 'g': 'Karma Hochschul-Themen', 'detail': ''},
       {'focus': 'Schreiben: Redemittel und Checkliste', 's': 'Kısa metin + kontrol listesi', 'g': 'Karma Hochschul-Themen', 'detail': ''},
       {'focus': 'Sprechen: letzte Simulation', 's': 'Tam sözlü sınav, rahat tempoda', 'g': 'Karma Hochschul-Themen', 'detail': ''},
       {'focus': 'Prüfungstag-Plan', 's': 'Sınav günü: saatler, yanına alacakların, her bölümün süre planı', 'g': '', 'detail': 'Sonrası tampon haftalar: hafif tekrar, dinlenme.'}],
      ['Kendi hata listen kapandı', 'Sınav günü neyi ne zaman yapacağını biliyorsun', 'Sınava dinlenmiş giriyorsun'])

import datetime as _dt
_hol = set(); _d = _dt.date(2026, 12, 24)
while _d <= _dt.date(2027, 1, 1): _hol.add(_d); _d += _dt.timedelta(1)
CAL = []; _d = _dt.date(2026, 11, 30)
while len(CAL) < 5 * (len(W) - 1):
    if _d.weekday() in (0, 1, 3, 4) and _d not in _hol: CAL.append(_d)
    _d += _dt.timedelta(1)
def _f(d, y=True): return d.strftime('%d.%m.%Y' if y else '%d.%m.')
def win(w):
    if w == 1: return (_dt.date(2026, 11, 9), _dt.date(2026, 11, 26))
    return (CAL[(w - 2) * 5], CAL[(w - 2) * 5 + 4])
def rng(a, b): return (_f(a, a.year != b.year) + ' – ' + _f(b))
for x in W:
    a_, b_ = win(x['w']); x['dates'] = rng(a_, b_)
PH = [(1, 6), (7, 11), (12, 16), (17, 21)]
for ph, (fr, to) in zip(P['phases'], PH):
    ph['from'], ph['to'] = fr, to; ph['dates'] = rng(win(fr)[0], win(to)[1])
last = win(len(W))[1]
P['buffer']['dates'] = rng(last + _dt.timedelta(1), _dt.date(2027, 6, 18))
P['buffer']['d'] = 'Kaçırdığın günler burada yetişir (haftada 4 günle yaklaşık 8 gün). Kalan zamanda kelime tekrarı, Sprechpartner ve haftada bir kısa okuma/dinleme. Sınavdan önceki hafta yeni konu yok.'
BIGW = [x['w'] for x in W if any(d.get('big') for d in x['days'])]
assert BIGW == [6, 11, 16, 20], BIGW
def wr(w): a_, b_ = win(w); return _f(a_, False) + '–' + _f(b_)
P['milestones'] = [
    {'d': '26.11.2026', 't': 'Lesen 2 ve 3 ilk kez resmî sınav ölçüsünde (Tag 5)'},
    {'d': '30.11.2026', 't': 'Hedef artık telc Deutsch C1 Hochschule (Tag 6’dan): aynı yapı, akademik konular'},
    {'d': wr(6), 't': '1. büyük deneme (Etap 6): resmî telc Deutsch C1 Hochschule Übungstest 1', 'big': True},
    {'d': wr(11), 't': '2. büyük deneme (Etap 11)', 'big': True},
    {'d': 'Mart 2027', 't': 'Sınava kayıt (C1 Hochschule): Berlin’de ör. DeutschAkademie, did deutsch-institut, Berlitz, VHS Prüfungszentrale; ücret yaklaşık 225–229 €. Kayıt genelde sınavdan yaklaşık 4 hafta önce kapanır, yerler daha önce dolabilir.', 'reg': True},
    {'d': wr(16), 't': '3. büyük deneme (Etap 16)', 'big': True},
    {'d': wr(20), 't': '4. büyük deneme: genel prova (Etap 20)', 'big': True},
    {'d': '19.06.2027', 't': 'Prüfung: telc Deutsch C1 Hochschule (hedef Haziran 2027; kesin gün Mart’ta)', 'exam': True},
]
for x in W:
    if x['title'] == 'Studium & Hochschule': assert win(x['w'])[0] < _dt.date(2026, 12, 24) < win(x['w'])[1], 'christmas note'
for x in W:
    assert len(x['days']) == 5, x['w']
P['weeks'] = W
out = 'window.PLAN = ' + json.dumps(P, ensure_ascii=False) + ';\n'
open(SRC, 'w', encoding='utf-8').write(out)
print('weeks', len(W), 'days', 5 * len(W), 'bytes', len(out))
