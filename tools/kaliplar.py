"""Build data/kaliplar.js: the grammar-pattern notebook (Kalıp defteri) for the word list tab.

cats  – categories in the order of how often the official telc C1 Übungstest 1 tests them in Sprachbausteine
items – the patterns (id, cat, de, kasus, en, tr, note, ex, exEn, exTr, fw)
links – per day: item id of an exercise gap -> pattern id. The app reads the student's own answers
        (localStorage) for these gaps and shows ✓/✗ per pattern; no personal data lives in the repo.
Every new day: add the day's gaps to LINKS (and new patterns with k(...)), then run: python3 tools/kaliplar.py
"""
import json, os

CATS = [
    {'id': 'kon', 'de': 'Konnektoren & Konjunktionen', 'tr': 'Bağlaçlar', 'exam': 'Resmî deneme sınavında 22 boşluğun 5’i', 'hint': 'Önce anlamı sor (zıtlık mı, neden mi, sonuç mu?), sonra fiilin yerini: Nebensatz → fiil sonda, Adverb → fiil hemen arkada.'},
    {'id': 'vf', 'de': 'Verbformen: Passiv, Konjunktiv, Partizip', 'tr': 'Fiil biçimleri', 'exam': '22 boşluğun 4’ü', 'hint': 'Cümlede başka bir fiil var mı? Partizip II varsa çoğu zaman werden/sein/haben eksiktir.'},
    {'id': 'vp', 'de': 'Verben mit Präposition', 'tr': 'Fiil + edat', 'exam': '22 boşluğun 3’ü', 'hint': 'Fiili edatıyla birlikte ezberle. Boşluk edat ya da da-/wo-biçimi olabilir; fiil bazen cümlenin sonunda gelir.'},
    {'id': 'pa', 'de': 'da- und wo-Wörter (darüber, worauf …)', 'tr': 'da-/wo- biçimleri', 'exam': 'fiil + edat boşluklarının çoğu bu biçimde', 'hint': 'Sesli harfle başlayan edatta r eklenir: dar-über, dar-auf, wor-an. Kişiler için kullanılmaz: an ihn, über sie.'},
    {'id': 'end', 'de': 'Adjektiv- und Kasusendungen', 'tr': 'Sıfat ve hâl ekleri', 'exam': '22 boşluğun 3’ü', 'hint': 'Önce hâli bul (edat? fiil?), sonra artikeli: ein- + Dativ → -en; der/die/das + Nominativ tekil → -e.'},
    {'id': 'prep', 'de': 'Präpositionen mit festem Kasus', 'tr': 'Edat + hâl', 'exam': '22 boşluğun 2’si', 'hint': 'Genitiv edatları sınavda çok sık: aufgrund, trotz, angesichts … Anlamı ayırt et: neden mi, zıtlık mı, yerine mi?'},
    {'id': 'nvv', 'de': 'Feste Wendungen & Nomen-Verb-Verbindungen', 'tr': 'Kalıplar', 'exam': '22 boşluğun 2’si + kelime seçimi', 'hint': 'İsim ve fiil birlikte öğrenilir: zur Verfügung stellen, in Anspruch nehmen. Şıklar genelde aynı fiille uyumlu isimlerdir.'},
    {'id': 'rel', 'de': 'Relativpronomen', 'tr': 'İlgi zamirleri', 'exam': 'bağlaç ve ek boşluklarında sık', 'hint': 'Cinsiyet ve sayı önceki isimden, hâl yan cümledeki fiil ya da edattan gelir.'},
    {'id': 'nap', 'de': 'Nomen & Adjektive mit Präposition', 'tr': 'İsim/sıfat + edat', 'exam': 'kelime seçimi ve edat boşluklarında', 'hint': 'Fiilin edatı çoğu zaman isimde de kalır: sich interessieren für → das Interesse an (dikkat: değişebilir!).'},
    {'id': 'ws', 'de': 'Wortstellung', 'tr': 'Kelime sırası', 'exam': 'Sprachbausteine’de nadiren; yazma ve konuşmada her cümlede', 'hint': 'Ana cümlede çekimli fiil 2. sırada, yan cümlede en sonda.'},
]

# (id, cat, de, kasus, en, tr, note, ex, exEn, exTr, fw)
I = []
def k(id, cat, de, kasus, en, tr, note, ex, exEn, exTr, fw=''):
    I.append({'id': id, 'cat': cat, 'de': de, 'kasus': kasus, 'en': en, 'tr': tr, 'note': note, 'ex': ex, 'exEn': exEn, 'exTr': exTr, **({'fw': fw} if fw else {})})

# ---- Konnektoren
k('kon-obwohl', 'kon', 'obwohl …', 'NS', 'although', 'rağmen, -diği hâlde', 'Zıtlık, yan cümle: çekimli fiil sonda. Tuzak: weil (neden). „obwohl“ = beklenenin tersi olur.', 'Viele Geräte landen im Müll, obwohl man sie reparieren könnte.', 'Many devices end up in the bin although they could be repaired.', 'Pek çok cihaz, tamir edilebilecekleri hâlde çöpe gidiyor.')
k('kon-trotzdem', 'kon', 'trotzdem', 'Adv', 'nevertheless', 'yine de', 'Zıtlık, ama bir zarf: hemen arkasından çekimli fiil gelir (Trotzdem lohnt sich …). Tuzak: deshalb (sonuç).', 'Der Schaden war groß. Trotzdem hat sich der Besuch gelohnt.', 'The damage was serious. Nevertheless, the visit was worth it.', 'Hasar büyüktü. Yine de ziyarete değdi.')
k('kon-deshalb', 'kon', 'deshalb / deswegen / daher', 'Adv', 'therefore', 'bu yüzden', 'Sonuç bildiren zarf: fiil hemen arkasında (Deshalb kommen viele …). Tuzak: trotzdem (zıtlık).', 'Die Mieten steigen. Deshalb ziehen viele Familien ins Umland.', 'Rents are rising. That is why many families move to the surrounding area.', 'Kiralar artıyor. Bu yüzden pek çok aile çevre bölgelere taşınıyor.')
k('kon-weil', 'kon', 'weil / da …', 'NS', 'because, since', 'çünkü, -dığı için', 'Neden, yan cümle: fiil sonda. „da“ çoğu zaman cümle başında, bilinen bir nedeni verir.', 'Da die Nachfrage hoch ist, steigen die Preise.', 'Since demand is high, prices are rising.', 'Talep yüksek olduğu için fiyatlar artıyor.')
k('kon-dass', 'kon', 'dass … / damit … / ob …', 'NS', 'that / so that / whether', 'ki / -sın diye / -ıp -madığı', 'dass: bir içerik bildirir (gewährleisten, dass …). damit: amaç. ob: evet/hayır sorusu (Es ist unklar, ob …). Tuzak: üçü de yan cümle, anlamla seç.', 'Damit soll gewährleistet werden, dass auch alte Geräte repariert werden können.', 'This is to ensure that old devices can be repaired too.', 'Bununla eski cihazların da tamir edilebilmesi güvence altına alınmak isteniyor.')
k('kon-sodass', 'kon', 'sodass … / so …, dass …', 'NS', 'so that (result)', 'öyle ki, bu yüzden', 'Sonuç bildiren yan cümle. „so“ sıfatın önünde: so teuer, dass … Resmî deneme sınavında da bir sonuç (konsekutiv) boşluğu vardı.', 'Die Wohnung war so teuer, dass wir sie nicht nehmen konnten.', 'The flat was so expensive that we could not take it.', 'Daire o kadar pahalıydı ki tutamadık.')
k('kon-indem', 'kon', 'indem …', 'NS', 'by (doing)', '-arak, -mek suretiyle', 'Yolu/aracı bildirir: Wie? → indem. Tuzak: damit (amaç), während (zaman).', 'Man spart Geld, indem man Geräte reparieren lässt.', 'You save money by having devices repaired.', 'Cihazları tamir ettirerek para biriktirirsin.')
k('kon-waehrend', 'kon', 'während …', 'NS / G', 'while, whereas', '-ken; oysa', 'Yan cümlede iki anlam: zaman (-ken) ya da zıtlık (oysa). Edat olarak Genitiv alır: während des Studiums.', 'Während die Mieten steigen, bleiben die Löhne gleich.', 'While rents are rising, wages stay the same.', 'Kiralar artarken maaşlar aynı kalıyor.')
k('kon-sowohl', 'kon', 'sowohl … als auch …', '', 'both … and', 'hem … hem de', 'İki parçalı bağlaç; ikinci parça her zaman „als auch“. Tuzak: entweder … oder (ya … ya), weder … noch (ne … ne).', 'Beraten werden sowohl Mieter als auch Wohnungssuchende.', 'Both tenants and flat-seekers receive advice.', 'Hem kiracılara hem de ev arayanlara danışmanlık veriliyor.')
k('kon-weder', 'kon', 'weder … noch …', '', 'neither … nor', 'ne … ne de', 'Kendisi olumsuz: ayrıca „nicht“ eklenmez.', 'Die Wohnung ist weder hell noch ruhig.', 'The flat is neither bright nor quiet.', 'Daire ne aydınlık ne de sessiz.')
k('kon-entweder', 'kon', 'entweder … oder …', '', 'either … or', 'ya … ya da', 'İki seçenek. „entweder“ cümle başındaysa fiil hemen arkasında da gelebilir.', 'Entweder wir finden bald etwas, oder wir ziehen ins Umland.', 'Either we find something soon or we move to the surrounding area.', 'Ya yakında bir şey buluruz ya da çevre bölgeye taşınırız.')
k('kon-zwar', 'kon', 'zwar …, aber …', '', 'admittedly …, but', 'gerçi …, ama', 'Kabul + itiraz. Argümantasyonda çok kullanışlı (yazma!).', 'Die Lage ist zwar gut, aber die Miete ist zu hoch.', 'The location is good, admittedly, but the rent is too high.', 'Konum gerçi iyi ama kira çok yüksek.')
k('kon-je', 'kon', 'je + Komparativ …, desto + Komparativ …', '', 'the more …, the more …', 'ne kadar … o kadar', 'İkinci parça „desto“ (ya da „umso“) ve hemen arkasında sıfatın karşılaştırma hâli, sonra fiil.', 'Je mehr Menschen mitmachen, desto größer ist die Wirkung.', 'The more people take part, the greater the effect.', 'Ne kadar çok kişi katılırsa etki o kadar büyük olur.')
k('kon-nichtnur', 'kon', 'nicht nur …, sondern auch …', '', 'not only … but also', 'yalnızca … değil, … da', 'İkinci parça „sondern auch“ (aber auch değil).', 'Das Konzept betrifft nicht nur Großstädte, sondern auch ländliche Regionen.', 'The concept affects not only big cities but also rural regions.', 'Konsept yalnızca büyük şehirleri değil, kırsal bölgeleri de ilgilendiriyor.')
k('kon-falls', 'kon', 'falls / sofern …', 'NS', 'in case, provided that', 'eğer, … şartıyla', 'Koşul, yan cümle. „sofern“ = „wenn und nur wenn“, resmî metinlerde sık.', 'Sofern genug Wohnungen gebaut werden, könnten die Mieten sinken.', 'Provided enough flats are built, rents could fall.', 'Yeterince daire yapılırsa kiralar düşebilir.')
k('kon-zumal', 'kon', 'zumal …', 'NS', 'especially since', 'üstelik … olduğundan', 'Ek ve güçlü bir neden. C1 metinlerinde ve Sprachbausteine’de sevilen bir bağlaç.', 'Der Umzug fiel ihr leicht, zumal sie in der Stadt keine Freunde hatte.', 'The move was easy for her, especially since she had no friends in the city.', 'Taşınmak ona kolay geldi, üstelik şehirde hiç arkadaşı yoktu.')
k('kon-statt', 'kon', '(an)statt … zu / ohne … zu', 'Inf', 'instead of / without (doing)', '-mek yerine / -meden', 'Mastar yapısı: özne aynıysa. „statt“ + Genitiv edat olarak da kullanılır.', 'Viele kaufen ein neues Gerät, statt das alte zu reparieren.', 'Many buy a new device instead of repairing the old one.', 'Pek çok kişi eskisini tamir etmek yerine yeni cihaz alıyor.')

# ---- Verbformen
k('vf-passiv-praet', 'vf', 'wurde + Partizip II (Passiv Präteritum)', '', 'was (done)', '-ıldı, -ildi', 'Boşluktan önce Partizip II varsa (gegründet, gebaut …) eksik olan çoğu zaman „wurde/wurden“. Tuzak: worden (yalnızca Perfekt’te, ist … worden).', 'Der Verein wurde vor über hundert Jahren gegründet.', 'The association was founded more than a hundred years ago.', 'Dernek yüz yıldan uzun süre önce kuruldu.')
k('vf-passiv-perf', 'vf', 'ist … worden (Passiv Perfekt)', '', 'has been (done)', '-ılmıştır', 'Passiv Perfekt’te „geworden“ değil „worden“. „geworden“ = olmuş (Aus der Idee ist eine Bewegung geworden).', 'Das Haus ist im letzten Jahr saniert worden.', 'The building was renovated last year.', 'Bina geçen yıl yenilendi.')
k('vf-passiv-modal', 'vf', 'muss / kann … + Partizip II + werden', '', 'must / can be (done)', '-ılmalı, -ılabilir', 'Modal fiil + edilgen: sonda „Partizip II + werden“ (mastar). Tuzak: worden.', 'Reparaturanleitungen müssen für alle zugänglich gemacht werden.', 'Repair manuals must be made accessible to everyone.', 'Tamir kılavuzları herkesin erişimine açılmalı.')
k('vf-lassen', 'vf', 'sich lassen + Infinitiv', '', 'can be (done)', '-ılabilir', 'Edilgenin yerine: „lässt sich vermeiden“ = „kann vermieden werden“. Boşluk çoğu zaman „lassen/lässt“.', 'Viele Probleme lassen sich leicht vermeiden.', 'Many problems can easily be avoided.', 'Pek çok sorun kolayca önlenebilir.')
k('vf-seinzu', 'vf', 'sein + zu + Infinitiv', '', 'is to be (done), can be (done)', '-ılmalı / -ılabilir', 'Edilgen + modal anlam: „Der Antrag ist bis Freitag einzureichen“ = muss eingereicht werden.', 'Die Unterlagen sind vollständig abzugeben.', 'The documents must be handed in complete.', 'Belgeler eksiksiz teslim edilmeli.')
k('vf-k2', 'vf', 'Konjunktiv II: wäre, hätte, würde + Inf.', '', 'would (be/have)', '-ardı, -saydı', 'Varsayım, öneri, nezaket. Geçmişte: hätte … können/müssen. Sınavda: „Es wäre sinnvoll, …“.', 'Es wäre sinnvoll, mehr Sozialwohnungen zu bauen.', 'It would make sense to build more social housing.', 'Daha fazla sosyal konut yapmak mantıklı olurdu.')
k('vf-k1', 'vf', 'Konjunktiv I (indirekte Rede): er habe, sie sei', '', 'reported speech', 'dolaylı anlatım', 'Gazete metinlerinde başkasının sözü: „Er sagt, er habe keine Zeit.“ Lesen’de kimin söylediğini gösterir.', 'Der Sprecher erklärte, die Stadt sei auf einem guten Weg.', 'The spokesperson stated that the city was on the right track.', 'Sözcü, şehrin doğru yolda olduğunu açıkladı.')
k('vf-trennbar', 'vf', 'trennbare Verben: mitkommen, aufschrauben', '', 'separable verbs', 'ayrılabilen fiiller', 'Ön ek ana cümlede sona gider (Kommst du mit?). Partizip II: auf-ge-schraubt, mit-ge-kommen. zu-Infinitiv: mitzukommen. Yan cümlede birleşik: …, ob du mitkommst.', 'Er hat das Radio in wenigen Minuten aufgeschraubt.', 'He opened up the radio in a few minutes.', 'Radyoyu birkaç dakikada açtı (vidalarını söktü).')
k('vf-werden', 'vf', 'werden: geworden / worden / wird', '', 'become / passive', 'olmak / edilgen', 'Üç biçim karışır: „Aus der Idee ist eine Bewegung geworden“ (oldu), „Das Haus ist saniert worden“ (edilgen), „Es wird gebaut“ (şimdiki edilgen).', 'So ist aus einer kleinen Idee eine echte Bewegung geworden.', 'In this way a small idea has become a real movement.', 'Böylece küçük bir fikir gerçek bir harekete dönüştü.')

# ---- Verben mit Präposition
VP = [
    ('vp-nachdenken', 'nachdenken über', 'A', 'to think about', 'üzerine düşünmek', 'Worüber? – Darüber.', 'Wer darüber nachdenkt, in eine Großstadt zu ziehen, sollte früh suchen.', 'Anyone thinking about moving to a big city should start searching early.', 'Büyük bir şehre taşınmayı düşünen, aramaya erken başlamalı.', 'Tuzak: „denken an“ (aklına gelmek, hatırlamak) ≠ „nachdenken über“ (üzerine kafa yormak).'),
    ('vp-verlassen', 'sich verlassen auf', 'A', 'to rely on', '-e güvenmek', 'Worauf? – Darauf. (Person: auf ihn)', 'Man kann sich darauf verlassen, dass die Helfer ehrlich sind.', 'You can rely on the helpers being honest.', 'Yardımcıların dürüst olacağına güvenebilirsin.', 'Arkasından dass-cümlesi gelirse: sich darauf verlassen, dass …'),
    ('vp-kommen-zu', 'es kommt zu', 'D', 'to happen, to lead to', '(bir şey) yaşanmak, meydana gelmek', 'Wozu? – Dazu.', 'Bei günstigen Wohnungen kommt es oft zu einem Ansturm.', 'Cheap flats often lead to a rush of applicants.', 'Ucuz dairelerde sık sık izdiham yaşanıyor.', 'Kalıp: „es kommt zu + Dativ“ (zu einem Ansturm, zu Problemen). Benzeri: „führen zu“.'),
    ('vp-wenden', 'sich wenden an', 'A', 'to turn to, to contact', '-e başvurmak', 'An wen? – An ihn. Woran? – Daran.', 'Bei Fragen kann man sich an den Mieterverein wenden.', 'If you have questions, you can contact the tenants’ association.', 'Sorularında kiracılar derneğine başvurabilirsin.', 'Boşluk fiilin kendisi de olabilir: „… an das Repair-Café ___“ → wenden (melden/kümmern değil).'),
    ('vp-engagieren', 'sich engagieren für', 'A', 'to get involved in', '-e gönüllü katkı vermek, -in için çalışmak', 'Wofür? – Dafür.', 'Wer sich dafür engagieren möchte, kann im Verein mitarbeiten.', 'Anyone who wants to get involved can work in the association.', 'Buna katkı vermek isteyen dernekte çalışabilir.', 'Aynı edat: sich einsetzen für, sorgen für, sich entscheiden für.'),
    ('vp-beitragen', 'beitragen zu', 'D', 'to contribute to', '-e katkıda bulunmak', 'Wozu? – Dazu.', 'Reparaturen tragen dazu bei, Müll zu vermeiden.', 'Repairs help to avoid waste.', 'Tamirler çöpün önlenmesine katkıda bulunuyor.', ''),
    ('vp-fuehren', 'führen zu', 'D', 'to lead to', '-e yol açmak', 'Wozu? – Dazu.', 'Hohe Mieten führen zur Verdrängung vieler Familien.', 'High rents lead to many families being displaced.', 'Yüksek kiralar pek çok ailenin yerinden edilmesine yol açıyor.', ''),
    ('vp-verzichten', 'verzichten auf', 'A', 'to do without', '-den vazgeçmek', 'Worauf? – Darauf.', 'Wer auf ein Auto verzichtet, spart viel Geld.', 'Anyone who does without a car saves a lot of money.', 'Arabadan vazgeçen çok para biriktirir.', ''),
    ('vp-abhaengen', 'abhängen von', 'D', 'to depend on', '-e bağlı olmak', 'Wovon? – Davon.', 'Ob das Konzept funktioniert, hängt von der Stadt ab.', 'Whether the concept works depends on the city.', 'Konseptin işleyip işlemediği şehre bağlı.', 'Ayrılabilen fiil: hängt … ab.'),
    ('vp-auswirken', 'sich auswirken auf', 'A', 'to affect', '-i etkilemek', 'Worauf? – Darauf.', 'Der Schlafmangel wirkt sich auf die Konzentration aus.', 'Lack of sleep affects concentration.', 'Uykusuzluk konsantrasyonu etkiler.', ''),
    ('vp-kuemmern', 'sich kümmern um', 'A', 'to take care of', '-le ilgilenmek', 'Worum? – Darum.', 'Die Genossenschaft kümmert sich um die Reparaturen.', 'The cooperative takes care of the repairs.', 'Kooperatif tamirlerle ilgileniyor.', ''),
    ('vp-bemuehen', 'sich bemühen um / sich bewerben um', 'A', 'to strive for / to apply for', '… için çabalamak / -e başvurmak', 'Worum? – Darum.', 'Sie bewirbt sich um eine Wohnung bei einer Genossenschaft.', 'She is applying for a flat with a cooperative.', 'Bir kooperatife daire için başvuruyor.', 'bewerben um (bir şey için) + bei (bir yere/kişiye).'),
    ('vp-beschaeftigen', 'sich beschäftigen mit', 'D', 'to deal with', '-le uğraşmak', 'Womit? – Damit.', 'Die Studie beschäftigt sich mit dem Wohnungsmarkt.', 'The study deals with the housing market.', 'Çalışma konut piyasasıyla ilgileniyor.', ''),
    ('vp-teilnehmen', 'teilnehmen an', 'D', 'to take part in', '-e katılmak', 'Woran? – Daran.', 'Viele Bürger haben an der Umfrage teilgenommen.', 'Many citizens took part in the survey.', 'Pek çok vatandaş ankete katıldı.', ''),
    ('vp-beziehen', 'sich beziehen auf', 'A', 'to refer to', '-e atıfta bulunmak', 'Worauf? – Darauf.', 'Der Autor bezieht sich auf eine neue Studie.', 'The author refers to a new study.', 'Yazar yeni bir araştırmaya atıfta bulunuyor.', ''),
    ('vp-gewoehnen', 'sich gewöhnen an', 'A', 'to get used to', '-e alışmak', 'Woran? – Daran.', 'An den langen Arbeitsweg habe ich mich gewöhnt.', 'I have got used to the long commute.', 'Uzun iş yoluna alıştım.', 'Tuzak: an + Akkusativ (an den Weg), teilnehmen an + Dativ.'),
    ('vp-erinnern', 'sich erinnern an', 'A', 'to remember', '-i hatırlamak', 'Woran? – Daran.', 'Ich erinnere mich gut an die erste Besichtigung.', 'I remember the first viewing well.', 'İlk ev gezisini iyi hatırlıyorum.', ''),
    ('vp-interessieren', 'sich interessieren für', 'A', 'to be interested in', '-e ilgi duymak', 'Wofür? – Dafür.', 'Immer mehr Menschen interessieren sich für Genossenschaften.', 'More and more people are interested in cooperatives.', 'Giderek daha fazla insan kooperatiflerle ilgileniyor.', 'İsimde edat değişir: das Interesse an + D.'),
    ('vp-freuen', 'sich freuen auf / über', 'A', 'to look forward to / to be pleased about', '-i dört gözle beklemek / -e sevinmek', 'Worauf? / Worüber?', 'Ich freue mich auf die neue Wohnung und über die Hilfe meiner Freunde.', 'I am looking forward to the new flat and pleased about my friends’ help.', 'Yeni daireyi dört gözle bekliyorum ve arkadaşlarımın yardımına seviniyorum.', 'auf = gelecekteki bir şey, über = olmuş bir şey. Klasik tuzak!'),
    ('vp-aergern', 'sich ärgern über / sich beschweren über', 'A', 'to be annoyed about / to complain about', '-e kızmak / -den şikâyet etmek', 'Worüber? – Darüber.', 'Viele Mieter beschweren sich über den Lärm.', 'Many tenants complain about the noise.', 'Pek çok kiracı gürültüden şikâyet ediyor.', 'Kime şikâyet? → bei + D (sich beim Vermieter beschweren).'),
    ('vp-traeumen', 'träumen von', 'D', 'to dream of', '-in hayalini kurmak', 'Wovon? – Davon.', 'Viele träumen von einer Wohnung mit Balkon.', 'Many dream of a flat with a balcony.', 'Pek çok kişi balkonlu bir dairenin hayalini kuruyor.', ''),
    ('vp-warnen', 'warnen vor', 'D', 'to warn against', '-e karşı uyarmak', 'Wovor? – Davor.', 'Experten warnen vor steigenden Mieten.', 'Experts warn of rising rents.', 'Uzmanlar artan kiralara karşı uyarıyor.', 'Aynı edat: Angst haben vor, sich schützen vor.'),
    ('vp-leiden', 'leiden unter / an', 'D', 'to suffer from', '-den muzdarip olmak', 'Worunter? – Darunter.', 'Viele Städte leiden unter Wohnungsnot.', 'Many cities suffer from a housing shortage.', 'Pek çok şehir konut sıkıntısı çekiyor.', 'leiden an = hastalık (an einer Krankheit), leiden unter = durum (unter Lärm).'),
    ('vp-sorgen', 'sorgen für', 'A', 'to ensure, to provide for', '-i sağlamak', 'Wofür? – Dafür.', 'Bäume sorgen für Schatten und kühlere Luft.', 'Trees provide shade and cooler air.', 'Ağaçlar gölge ve daha serin hava sağlar.', 'Tuzak: sich Sorgen machen um (endişelenmek).'),
    ('vp-bestehen', 'bestehen aus / auf / in', 'D / A / D', 'to consist of / to insist on / to lie in', '-den oluşmak / -de ısrar etmek / -de yatmak', 'Woraus? / Worauf? / Worin?', 'Das Problem besteht darin, dass es zu wenige Wohnungen gibt.', 'The problem lies in the fact that there are too few flats.', 'Sorun, çok az daire olmasında yatıyor.', 'Üç anlam: aus (oluşmak), auf + A (ısrar), in (bir şeyde yatmak: Der Vorteil besteht darin, …).'),
    ('vp-achten', 'achten auf / hinweisen auf', 'A', 'to pay attention to / to point out', '-e dikkat etmek / -e dikkat çekmek', 'Worauf? – Darauf.', 'Experten weisen darauf hin, dass die Mieten weiter steigen.', 'Experts point out that rents will continue to rise.', 'Uzmanlar kiraların artmaya devam edeceğine dikkat çekiyor.', ''),
    ('vp-zweifeln', 'zweifeln an', 'D', 'to doubt', '-den şüphe etmek', 'Woran? – Daran.', 'Kritiker zweifeln an der Wirkung der Mietpreisbremse.', 'Critics doubt the effect of the rent cap.', 'Eleştirmenler kira frenin etkisinden şüphe ediyor.', ''),
    ('vp-gehoeren', 'gehören zu', 'D', 'to be one of, to belong to', '-e dahil olmak', 'Wozu? – Dazu.', 'Hamburg gehört zu den teuersten Städten Deutschlands.', 'Hamburg is one of the most expensive cities in Germany.', 'Hamburg Almanya’nın en pahalı şehirlerinden biri.', 'gehören + D (sahiplik: Das gehört mir) ≠ gehören zu (dahil olmak).'),
]
for id, de, kas, en, tr, fw, ex, exEn, exTr, note in VP:
    k(id, 'vp', de, kas, en, tr, note or 'Fiili edatıyla birlikte öğren.', ex, exEn, exTr, fw)

# ---- da-/wo-Wörter
k('pa-dar', 'pa', 'da(r) + Präposition: darüber, darauf, daran, dafür, dazu …', '', 'about it, on it …', 'bunun hakkında, buna …', 'Bir şeyi ya da bir cümleyi işaret eder. Sesli harfle başlayan edatta r: dar-über, dar-auf, dar-an, dar-in. Hangisi? Fiilin edatı: nachdenken über → darüber.', 'Sie möchten erreichen, dass wir darüber nachdenken, was wir kaufen.', 'They want us to think about what we buy.', 'Ne satın aldığımız üzerine düşünmemizi istiyorlar.', 'denken an → daran · warten auf → darauf · sorgen für → dafür')
k('pa-dass', 'pa', 'da(r)- + dass-Satz / zu-Infinitiv', '', 'the fact that …', '-masına, -mesine', 'da-biçimi, arkadan gelen cümlenin „yer tutucusu“dur: Ich verlasse mich darauf, dass … / Es kommt darauf an, ob … Boşluk çoğu zaman tam bu da-kelimesi.', 'Viele verlassen sich darauf, dass Freunde ihnen helfen.', 'Many rely on friends helping them.', 'Pek çok kişi arkadaşlarının yardım edeceğine güveniyor.')
k('pa-wo', 'pa', 'wo(r) + Präposition: worüber, worauf, woran …', '', 'about what, on what …', 'ne hakkında, neye …', 'Bir şey hakkında soru: Worauf wartest du? Kişi için edat + wen/wem: Auf wen wartest du? İlgi cümlesinde de: alles, worüber wir gesprochen haben.', 'Worüber hat sich der Mieter beschwert?', 'What did the tenant complain about?', 'Kiracı neden şikâyet etti?')
k('pa-person', 'pa', 'Personen: an ihn, über sie, auf ihn (kein da-)', '', 'for people: preposition + pronoun', 'kişiler için da- kullanılmaz', 'da-/wo-biçimleri yalnızca şeyler ve olaylar için. Kişi: „Ich denke an ihn“ (daran değil), „Auf wen kann man sich verlassen?“', 'Auf meine Nachbarin kann ich mich verlassen – auf sie ist immer Verlass.', 'I can rely on my neighbour – she is always reliable.', 'Komşuma güvenebilirim, ona her zaman güvenilir.')

# ---- Endungen
k('end-dat-ein', 'end', 'Dativ nach ein-/kein-/mein-: -en', 'D', 'adjective ending after ein- (dative)', 'ein- + Dativ → -en', 'mit, bei, nach, von, zu … Dativ ister. ein-/kein-/Possessiv + Dativ → sıfat her cinste -en: mit einer vollständigen Mappe, mit einem neuen Vertrag.', 'Mit einer vollständigen Bewerbungsmappe hat man bessere Chancen.', 'With a complete application folder you have better chances.', 'Eksiksiz bir başvuru dosyasıyla şansın daha yüksek.')
k('end-best', 'end', 'nach der/die/das: -e oder -en', '', 'after the definite article', 'der/die/das sonrası', 'Nominativ tekil (ve die/das Akkusativ tekil) → -e; geri kalan her şey → -en: die steigende Miete, mit der steigenden Miete, die steigenden Mieten.', 'Jedes gerettete Smartphone bedeutet weniger Müll.', 'Every smartphone saved means less waste.', 'Kurtarılan her akıllı telefon daha az çöp demek.')
k('end-ohne', 'end', 'ohne Artikel: starke Endung (mit großem Aufwand)', '', 'no article: strong ending', 'artikelsiz: güçlü ek', 'Artikel yoksa sıfat artikelin ekini alır: mit großem Aufwand (dem → -em), bei schlechtem Wetter, trotz hoher Preise.', 'Viele Geräte lassen sich mit geringem Aufwand reparieren.', 'Many devices can be repaired with little effort.', 'Pek çok cihaz az bir çabayla tamir edilebilir.')
k('end-partizip', 'end', 'Partizip als Adjektiv: die steigenden Mieten, das gerettete Gerät', '', 'participle used as adjective', 'sıfat olarak ortaç', 'Partizip I (-end) = devam eden: die steigenden Mieten. Partizip II = tamamlanmış/edilgen: das gerettete Gerät. Ekleri normal sıfat gibi.', 'Die steigenden Mieten verdrängen viele alte Mieter.', 'Rising rents are pushing out many long-standing tenants.', 'Artan kiralar pek çok eski kiracıyı yerinden ediyor.')
k('end-n', 'end', 'n-Deklination: den Kunden, dem Experten, des Mieters', '', 'weak nouns and genitive -s', 'zayıf isimler ve -s', 'Bazı erkek isimler Nominativ dışında -n/-en alır: der Kunde → den Kunden, der Experte → mit dem Experten. Genitivde erkek/nötr isim -(e)s: des Vermieters.', 'Der Vermieter fragte nach der Bescheinigung des alten Vermieters.', 'The landlord asked for the certificate from the previous landlord.', 'Ev sahibi eski ev sahibinin belgesini istedi.')

# ---- Präpositionen
k('prep-gen', 'prep', 'Genitiv: aufgrund, trotz, wegen, angesichts, hinsichtlich', 'G', 'because of, despite, in view of, regarding', 'nedeniyle, -e rağmen, göz önünde …', 'Anlamla seç: aufgrund/wegen = neden, trotz = zıtlık, angesichts = durum göz önüne alınınca, hinsichtlich = konusunda, anstelle = yerine. Arkasından Genitiv: aufgrund einer neuen Richtlinie.', 'Aufgrund einer neuen EU-Richtlinie müssen Hersteller Ersatzteile anbieten.', 'Because of a new EU directive, manufacturers must offer spare parts.', 'Yeni bir AB yönergesi nedeniyle üreticiler yedek parça sunmak zorunda.')
k('prep-gen2', 'prep', 'Genitiv: innerhalb, außerhalb, während, infolge, anstelle, statt', 'G', 'within, outside, during, as a result of, instead of', 'içinde, dışında, sırasında, sonucunda, yerine', 'Zaman ve yer bildiren Genitiv edatları; resmî dilde çok sık: innerhalb eines Jahres, außerhalb der Stadt.', 'Innerhalb von zwei Jahren wurden vier Häuser saniert.', 'Within two years, four buildings were renovated.', 'İki yıl içinde dört bina yenilendi.')
k('prep-dat', 'prep', 'Dativ: mit, nach, bei, seit, von, zu, aus, gegenüber, zufolge', 'D', 'dative prepositions', 'Dativ alan edatlar', '„zufolge“ sonra gelir: dem Bericht zufolge. „gegenüber“ çoğu zaman sonra: der Stadt gegenüber.', 'Einer Studie zufolge gehen Bewohner gemischter Quartiere häufiger zu Fuß.', 'According to a study, residents of mixed districts walk more often.', 'Bir araştırmaya göre karma semtlerde oturanlar daha sık yürüyor.')
k('prep-akk', 'prep', 'Akkusativ: durch, für, gegen, ohne, um', 'A', 'accusative prepositions', 'Akkusativ alan edatlar', 'Bu beşi her zaman Akkusativ: für den neuen Vertrag, ohne einen Makler.', 'Ohne einen Makler ist die Suche oft günstiger.', 'Without an estate agent, the search is often cheaper.', 'Emlakçısız arama çoğu zaman daha ucuz.')
k('prep-wechsel', 'prep', 'Wechselpräpositionen: in, an, auf … + A (wohin) / + D (wo)', 'A / D', 'two-way prepositions', 'iki yönlü edatlar', 'Hareket/yön → Akkusativ (in die Stadt ziehen), konum → Dativ (in der Stadt wohnen).', 'Viele ziehen in die Stadt, aber nicht alle können in der Stadt bleiben.', 'Many move to the city, but not everyone can stay in the city.', 'Pek çok kişi şehre taşınıyor ama herkes şehirde kalamıyor.')

# ---- Nomen-Verb-Verbindungen & feste Wendungen
NVV = [
    ('nvv-verfuegung', 'zur Verfügung stehen / stellen', 'to be available / to make available', 'hizmete sunulmak / sunmak', 'Ehrenamtliche stellen ihre Zeit kostenlos zur Verfügung.', 'Volunteers make their time available free of charge.', 'Gönüllüler zamanlarını ücretsiz olarak sunuyor.', 'Sprachbausteine’de çok sık: „zur ___“ → Verfügung. stehen = bulunmak, stellen = vermek.'),
    ('nvv-anspruch', 'in Anspruch nehmen', 'to make use of, to take up (time)', 'yararlanmak; (zaman) almak', 'Nehmen Sie Beratungsangebote in Anspruch.', 'Make use of advice services.', 'Danışmanlık hizmetlerinden yararlanın.', ''),
    ('nvv-kauf', 'in Kauf nehmen', 'to accept (a downside)', 'göze almak, katlanmak', 'Für eine günstige Miete nehmen viele einen langen Weg in Kauf.', 'For a low rent, many accept a long journey.', 'Ucuz bir kira için pek çok kişi uzun bir yolu göze alıyor.', ''),
    ('nvv-betracht', 'in Betracht ziehen / kommen', 'to consider / to be an option', 'göz önünde bulundurmak / söz konusu olmak', 'Eine Wohnung am Stadtrand kam für mich lange nicht in Betracht.', 'For a long time, a flat on the edge of town was not an option for me.', 'Şehrin kenarında bir daire uzun süre benim için söz konusu değildi.', ''),
    ('nvv-abhilfe', 'Abhilfe schaffen', 'to remedy', 'çare bulmak', 'Nur mehr bezahlbarer Wohnraum kann Abhilfe schaffen.', 'Only more affordable housing can remedy the situation.', 'Ancak daha fazla uygun fiyatlı konut çare olabilir.', ''),
    ('nvv-rolle', 'eine (wichtige) Rolle spielen', 'to play a (key) role', '(önemli) bir rol oynamak', 'Die Anbindung spielt bei der Wohnungssuche eine große Rolle.', 'Transport links play a big part in the search for a flat.', 'Ulaşım bağlantısı ev aramada büyük rol oynar.', ''),
    ('nvv-kritik', 'Kritik üben an + D', 'to criticise', 'eleştirmek', 'Viele üben Kritik an der Mietpreisbremse.', 'Many criticise the rent cap.', 'Pek çok kişi kira frenini eleştiriyor.', ''),
    ('nvv-ausdruck', 'zum Ausdruck bringen', 'to express', 'ifade etmek', 'Die Autorin bringt ihre Enttäuschung deutlich zum Ausdruck.', 'The author clearly expresses her disappointment.', 'Yazar hayal kırıklığını açıkça ifade ediyor.', ''),
    ('nvv-frage', 'in Frage kommen / infrage stellen', 'to be possible / to call into question', 'söz konusu olmak / sorgulamak', 'Pendeln kam für sie zunächst nicht infrage.', 'At first, commuting was out of the question for her.', 'İşe gidip gelmek başta onun için söz konusu değildi.', ''),
    ('nvv-massnahmen', 'Maßnahmen ergreifen', 'to take measures', 'önlem almak', 'Die Stadt hat Maßnahmen gegen den Leerstand ergriffen.', 'The city has taken measures against empty buildings.', 'Şehir boş binalara karşı önlem aldı.', ''),
    ('nvv-entscheidung', 'eine Entscheidung treffen', 'to make a decision', 'karar vermek', 'Nach vierzehn Monaten traf sie eine Entscheidung.', 'After fourteen months she made a decision.', 'On dört ay sonra bir karar verdi.', 'Tuzak: „machen“ değil „treffen“.'),
    ('nvv-ruecksicht', 'Rücksicht nehmen auf + A', 'to show consideration for', 'göz önünde bulundurmak, saygı göstermek', 'Man sollte auf die Nachbarn Rücksicht nehmen.', 'You should show consideration for your neighbours.', 'Komşuları gözetmek gerekir.', ''),
    ('nvv-bezug', 'Bezug nehmen auf + A', 'to refer to', '-e atıfta bulunmak', 'In Ihrem Leserbrief sollten Sie auf den Artikel Bezug nehmen.', 'In your letter to the editor you should refer to the article.', 'Okur mektubunda makaleye atıfta bulunmalısın.', 'Yazma görevinde çok kullanışlı.'),
    ('nvv-kraft', 'in Kraft treten', 'to come into force', 'yürürlüğe girmek', 'Die neue Richtlinie tritt im nächsten Jahr in Kraft.', 'The new directive comes into force next year.', 'Yeni yönerge gelecek yıl yürürlüğe giriyor.', ''),
    ('nvv-einfluss', 'Einfluss nehmen auf + A / Einfluss haben auf + A', 'to influence', 'etkilemek', 'Der Einzelne hat wenig Einfluss auf den Wohnungsmarkt.', 'The individual has little influence on the housing market.', 'Bireyin konut piyasası üzerinde az etkisi var.', ''),
    ('nvv-hand', 'auf der Hand liegen', 'to be obvious', 'apaçık ortada olmak', 'Die Vorteile digitaler Medien liegen auf der Hand.', 'The advantages of digital media are obvious.', 'Dijital medyanın avantajları apaçık ortada.', 'Tuzak: auf der Zunge liegen = dilinin ucunda olmak. Özne bir şey (die Vorteile, der Grund), kişi değil.'),
    ('nvv-gewicht', 'ins Gewicht fallen', 'to matter, to carry weight', 'önem taşımak, ağır basmak', 'Der höhere Preis fällt kaum ins Gewicht.', 'The higher price hardly matters.', 'Yüksek fiyat pek önem taşımıyor.', 'Tuzak: jdm. ins Wort fallen = sözünü kesmek; ins Wasser fallen = (plan) suya düşmek. Sık kalıp: kaum / stark ins Gewicht fallen.'),
    ('nvv-schritt', 'mit etw. Schritt halten', 'to keep pace with', '…e ayak uydurmak', 'Viele Schulen können mit der Digitalisierung kaum Schritt halten.', 'Many schools can hardly keep pace with digitalisation.', 'Birçok okul dijitalleşmeye zorlukla ayak uyduruyor.', 'mit + Dativ: mit der Entwicklung, mit dem Tempo. „halten“ çekimlenir: hielt Schritt, hat Schritt gehalten.'),
]
for id, de, en, tr, ex, exEn, exTr, note in NVV:
    k(id, 'nvv', de, '', en, tr, note or 'İsim ve fiili birlikte öğren; Sprachbausteine’de isim ya da fiil boş bırakılır.', ex, exEn, exTr)

# ---- Relativpronomen
k('rel-nom-akk', 'rel', 'der / die / das / den (Nominativ, Akkusativ)', 'N / A', 'who, which, that', 'ki o, -an/-en', 'Cinsiyet ve sayı önceki isimden: Akkus (Pl.) → die. Hâl yan cümleden: … Akkus, die sich nicht austauschen lassen (die = özne, Nominativ).', 'Manche Hersteller verbauen Akkus, die sich nicht austauschen lassen.', 'Some manufacturers install batteries that cannot be replaced.', 'Bazı üreticiler değiştirilemeyen piller takıyor.')
k('rel-denen', 'rel', 'denen (Dativ Plural) · Präposition + denen', 'D', 'to/with/on which (plural)', 'çoğul Dativ: -dikleri', 'Çoğul + Dativ → denen (die değil!). Edatla: auf denen, bei denen, mit denen. Edat yan cümledeki fiilden ya da anlamdan gelir.', 'Hilfreich sind Portale, auf denen private Vermieter Wohnungen anbieten.', 'Portals on which private landlords offer flats are helpful.', 'Özel ev sahiplerinin daire sunduğu portallar faydalı.')
k('rel-dessen', 'rel', 'dessen (m./n.) / deren (f./Pl.) – Genitiv', 'G', 'whose', '-in … -ı (sahiplik)', 'Sahiplik: der Mann, dessen Wohnung … / die Frau, deren Sohn … / die Mieter, deren Verträge … Sonraki isim artikel almaz.', 'Die Kollegin, deren Straße saniert wurde, musste umziehen.', 'The colleague whose street was renovated had to move.', 'Sokağı yenilenen iş arkadaşı taşınmak zorunda kaldı.')
k('rel-praep', 'rel', 'Präposition + dem / der / den (Singular)', 'D / A', 'with/in/for which', 'edat + ilgi zamiri', 'Edat başa gelir, ilgi zamiri onun istediği hâlde: die Stadt, in der ich wohne · der Vertrag, über den wir sprechen.', 'Das ist die Genossenschaft, bei der ich Mitglied bin.', 'This is the cooperative of which I am a member.', 'Bu, üyesi olduğum kooperatif.')
k('rel-was-wo', 'rel', 'was (alles, etwas, nichts, das Beste) · wo (Ort) · wo(r)- + Präp.', '', 'what, where', 'ne, -dığı yer', '„alles, was“, „das Einzige, was“; yer: die Stadt, wo …; bütün cümleye bağlanma: …, worüber ich mich sehr freue.', 'Das ist alles, was ich mir leisten kann.', 'That is everything I can afford.', 'Gücümün yettiği her şey bu.')

# ---- Nomen & Adjektive mit Präposition
NAP = [
    ('nap-angewiesen', 'angewiesen auf + A', 'dependent on', '-e muhtaç', 'Ältere Menschen sind auf kurze Wege angewiesen.', 'Older people depend on short distances.', 'Yaşlılar kısa yollara muhtaç.'),
    ('nap-abhaengig', 'abhängig von + D', 'dependent on', '-e bağımlı, -e bağlı', 'Die Miete ist abhängig von der Lage.', 'The rent depends on the location.', 'Kira konuma bağlı.'),
    ('nap-interesse', 'das Interesse an + D', 'interest in', '-e ilgi', 'Das Interesse an Genossenschaften wächst.', 'Interest in cooperatives is growing.', 'Kooperatiflere ilgi artıyor.'),
    ('nap-angst', 'die Angst vor + D', 'fear of', '-den korku', 'Viele Mieter haben Angst vor einer Kündigung.', 'Many tenants are afraid of being given notice.', 'Pek çok kiracı tahliyeden korkuyor.'),
    ('nap-einfluss', 'der Einfluss auf + A', 'influence on', '-e etki', 'Der Zuzug hat großen Einfluss auf die Mieten.', 'The influx has a big influence on rents.', 'Göç kiralar üzerinde büyük etki yapıyor.'),
    ('nap-grund', 'der Grund für + A', 'reason for', '-in nedeni', 'Der Grund für ihren Umzug war die hohe Miete.', 'The reason for her move was the high rent.', 'Taşınmasının nedeni yüksek kiraydı.'),
    ('nap-suche', 'die Suche nach + D', 'search for', '-i arama', 'Die Suche nach einer Wohnung dauerte vierzehn Monate.', 'The search for a flat took fourteen months.', 'Daire arayışı on dört ay sürdü.'),
    ('nap-zufrieden', 'zufrieden mit + D / überzeugt von + D', 'satisfied with / convinced of', '-den memnun / -e ikna olmuş', 'Mit der neuen Wohnung ist sie sehr zufrieden.', 'She is very satisfied with the new flat.', 'Yeni daireden çok memnun.'),
    ('nap-verantwortlich', 'verantwortlich für + A / bekannt für + A', 'responsible for / known for', '-den sorumlu / ile tanınan', 'Die Stadt ist für den Bau neuer Schulen verantwortlich.', 'The city is responsible for building new schools.', 'Şehir yeni okulların yapımından sorumlu.'),
]
for id, de, en, tr, ex, exEn, exTr in NAP:
    k(id, 'nap', de.split(' + ')[0] if ' + ' in de and '/' not in de else de, de.split('+')[-1].strip() if '+' in de and '/' not in de else '', en, tr, 'İsimle/sıfatla edatı birlikte öğren; fiildekiyle aynı olmayabilir.', ex, exEn, exTr)

# ---- Wortstellung
k('ws-v2', 'ws', 'Adverb am Anfang → Verb auf Position 2', '', 'verb second after an adverb', 'zarf başta → fiil 2. sırada', 'Deshalb / Heutzutage / Trotzdem / So … başta ise hemen arkasından çekimli fiil, sonra özne: Deshalb kommen viele Besucher … (Deshalb viele Besucher kommen ✗).', 'Heutzutage suchen viele Familien eine größere Wohnung.', 'Nowadays many families are looking for a bigger flat.', 'Günümüzde pek çok aile daha büyük bir daire arıyor.')
k('ws-ns', 'ws', 'Nebensatz: Verb am Ende (…, dass sie mehr zahlen müssen)', '', 'verb at the end of a subordinate clause', 'yan cümlede fiil sonda', 'dass, weil, obwohl, ob, wenn … ile başlayan cümlede çekimli fiil en sonda; modal fiil varsa en son o: …, ob die Miete gesenkt werden soll.', 'Es wird diskutiert, ob die Miete gesenkt werden soll.', 'It is being discussed whether the rent should be lowered.', 'Kiranın düşürülüp düşürülmeyeceği tartışılıyor.')
k('ws-ns-erst', 'ws', 'Nebensatz zuerst → Verb direkt danach (Weil …, bin ich …)', '', 'subordinate clause first, then the verb', 'yan cümle başta → ana cümle fiille başlar', 'Yan cümle birinci sırayı alır; ana cümle doğrudan çekimli fiille başlar: Weil die Miete zu hoch war, bin ich umgezogen.', 'Weil die Miete zu hoch war, bin ich umgezogen.', 'Because the rent was too high, I moved.', 'Kira çok yüksek olduğu için taşındım.')


# ---- short rule (one line) and a drill card (sentence with ___, answer, 3 wrong options) for every pattern
KU = {
 'kon-obwohl': 'Zıtlık · yan cümle → fiil sonda. (weil = neden)', 'kon-trotzdem': 'Zıtlık · zarf → hemen arkasından fiil.', 'kon-deshalb': 'Sonuç · zarf → hemen arkasından fiil.',
 'kon-weil': 'Neden · yan cümle → fiil sonda.', 'kon-dass': 'dass = içerik · damit = amaç · ob = „-ıp -madığı“.', 'kon-sodass': 'Sonuç: so + sıfat …, dass … / …, sodass …',
 'kon-indem': 'Nasıl? → indem (…-arak). Yan cümle.', 'kon-waehrend': '-ken / oysa · yan cümle. Edat olarak + Genitiv.', 'kon-sowohl': 'sowohl … als auch = hem … hem de.',
 'kon-weder': 'weder … noch = ne … ne. „nicht“ eklenmez.', 'kon-entweder': 'entweder … oder = ya … ya da.', 'kon-zwar': 'zwar …, aber … = gerçi …, ama.',
 'kon-je': 'je + karşılaştırma …, desto + karşılaştırma.', 'kon-nichtnur': 'nicht nur …, sondern auch …', 'kon-falls': 'Koşul · falls / sofern → fiil sonda.',
 'kon-zumal': 'zumal = üstelik … olduğundan (ek neden).', 'kon-statt': '(an)statt / ohne … zu + mastar.',
 'vf-passiv-praet': 'Geçmiş edilgen: wurde + Partizip II.', 'vf-passiv-perf': 'Perfekt edilgen: ist … worden (geworden değil!).', 'vf-passiv-modal': 'Modal fiil + Partizip II + werden (sonda).',
 'vf-lassen': 'sich lassen + mastar = -ılabilir.', 'vf-seinzu': 'sein + zu + mastar = -ılmalı / -ılabilir.', 'vf-k2': 'Varsayım, öneri: wäre · hätte · würde + mastar.',
 'vf-k1': 'Başkasının sözü: er habe · sie sei.', 'vf-trennbar': 'Ön ek sona: Kommst du mit? · Partizip: auf-ge-schraubt.', 'vf-werden': 'geworden = oldu · worden = edilgen · wird = olur/edilir.',
 'pa-dar': 'Sesli harfle başlayan edat → dar-: darüber, darauf, daran.', 'pa-dass': 'da-kelimesi arkadan gelen dass-cümlesini haber verir.',
 'pa-wo': 'Şey için soru: wo(r) + edat · kişi için: edat + wen/wem.', 'pa-person': 'Kişiler için da- yok: an ihn, auf sie.',
 'end-dat-ein': 'ein-/kein-/mein- + Dativ → sıfat -en.', 'end-best': 'der/die/das + Nominativ tekil → -e · geri kalanı → -en.',
 'end-ohne': 'Artikel yoksa sıfat artikelin ekini alır: mit großem Aufwand.', 'end-partizip': '-end = devam eden · ge-…-t = bitmiş; ekleri sıfat gibi.', 'end-n': 'Zayıf erkek isim: der Kunde → den / dem / des Kunden.',
 'prep-gen': 'aufgrund/wegen = neden · trotz = zıtlık · anstelle = yerine (+ Gen).', 'prep-gen2': 'innerhalb · außerhalb · während · infolge + Genitiv.',
 'prep-dat': 'mit, nach, bei, seit, von, zu, aus + Dativ · zufolge sonra gelir.', 'prep-akk': 'durch, für, gegen, ohne, um → hep Akkusativ.', 'prep-wechsel': 'Nereye? → Akk · Nerede? → Dat.',
 'nvv-verfuegung': 'zur Verfügung stellen = vermek · stehen = hazır olmak.', 'nvv-anspruch': 'in Anspruch nehmen = yararlanmak.', 'nvv-kauf': 'in Kauf nehmen = göze almak.',
 'nvv-betracht': 'in Betracht ziehen = düşünmek · kommen = söz konusu olmak.', 'nvv-abhilfe': 'Abhilfe schaffen = çare bulmak.', 'nvv-rolle': 'eine Rolle spielen = rol oynamak.',
 'nvv-kritik': 'Kritik üben an + Dativ = eleştirmek.', 'nvv-ausdruck': 'zum Ausdruck bringen = ifade etmek.', 'nvv-frage': 'in Frage kommen = mümkün olmak · infrage stellen = sorgulamak.',
 'nvv-massnahmen': 'Maßnahmen ergreifen = önlem almak.', 'nvv-entscheidung': 'eine Entscheidung treffen (machen değil).', 'nvv-ruecksicht': 'Rücksicht nehmen auf + Akk.',
 'nvv-bezug': 'Bezug nehmen auf + Akk = atıfta bulunmak.', 'nvv-kraft': 'in Kraft treten = yürürlüğe girmek.', 'nvv-einfluss': 'Einfluss haben / nehmen auf + Akk.', 'nvv-hand': 'auf der Hand liegen = apaçık ortada olmak.', 'nvv-gewicht': 'ins Gewicht fallen = önem taşımak (kaum ins Gewicht fallen = pek önemli değil).', 'nvv-schritt': 'mit + Dat Schritt halten = ayak uydurmak.',
 'rel-nom-akk': 'Cinsiyet önceki isimden, hâl yan cümleden.', 'rel-denen': 'Çoğul + Dativ → denen (auf denen, mit denen).', 'rel-dessen': 'Sahiplik: dessen (er/nötr) · deren (dişi/çoğul).',
 'rel-praep': 'Edat başa, zamir edatın hâlinde: in der, über den.', 'rel-was-wo': 'alles / etwas / nichts → was · yer → wo.',
 'ws-v2': 'Zarf başta → fiil 2. sırada, sonra özne.', 'ws-ns': 'dass, weil, ob … → çekimli fiil en sonda.', 'ws-ns-erst': 'Yan cümle başta → ana cümle fiille başlar.',
}
DR = {
 'kon-obwohl': ('Er kam pünktlich, ___ der Zug Verspätung hatte.', 'obwohl', ['weil', 'trotzdem', 'deshalb']),
 'kon-trotzdem': ('Es regnete stark. ___ gingen wir spazieren.', 'Trotzdem', ['Obwohl', 'Deshalb', 'Weil']),
 'kon-deshalb': ('Die Miete war zu hoch. ___ sind wir umgezogen.', 'Deshalb', ['Trotzdem', 'Obwohl', 'Weil']),
 'kon-weil': ('Viele ziehen aufs Land, ___ die Mieten dort niedriger sind.', 'weil', ['obwohl', 'trotzdem', 'deshalb']),
 'kon-dass': ('Niemand weiß, ___ die Mieten weiter steigen.', 'ob', ['dass', 'damit', 'indem']),
 'kon-sodass': ('Die Wohnung war so teuer, ___ wir sie nicht nehmen konnten.', 'dass', ['damit', 'ob', 'weil']),
 'kon-indem': ('Man spart Energie, ___ man die Heizung herunterdreht.', 'indem', ['damit', 'sodass', 'obwohl']),
 'kon-waehrend': ('___ die Mieten steigen, bleiben die Löhne gleich.', 'Während', ['Deshalb', 'Damit', 'Trotzdem']),
 'kon-sowohl': ('Beraten werden sowohl Mieter ___ Vermieter.', 'als auch', ['oder', 'noch', 'sondern auch']),
 'kon-weder': ('Die Wohnung ist weder hell ___ ruhig.', 'noch', ['oder', 'als auch', 'aber']),
 'kon-entweder': ('Entweder wir finden bald etwas, ___ wir ziehen aufs Land.', 'oder', ['noch', 'als auch', 'aber']),
 'kon-zwar': ('Die Lage ist zwar gut, ___ die Miete ist zu hoch.', 'aber', ['denn', 'oder', 'sondern']),
 'kon-je': ('Je früher man sucht, ___ besser sind die Chancen.', 'desto', ['als', 'so', 'wie']),
 'kon-nichtnur': ('Das betrifft nicht nur Städte, ___ auch Dörfer.', 'sondern', ['aber', 'oder', 'als']),
 'kon-falls': ('___ genug Wohnungen gebaut werden, könnten die Mieten sinken.', 'Sofern', ['Trotzdem', 'Deshalb', 'Obwohl']),
 'kon-zumal': ('Der Umzug fiel ihr leicht, ___ sie dort schon Freunde hatte.', 'zumal', ['obwohl', 'sodass', 'damit']),
 'kon-statt': ('Viele kaufen neu, ___ das alte Gerät zu reparieren.', 'statt', ['damit', 'indem', 'obwohl']),
 'vf-passiv-praet': ('Das Haus ___ 1910 gebaut.', 'wurde', ['worden', 'hatte', 'würde']),
 'vf-passiv-perf': ('Das Haus ist letztes Jahr saniert ___.', 'worden', ['geworden', 'wurde', 'werden']),
 'vf-passiv-modal': ('Die Regeln müssen klar formuliert ___.', 'werden', ['worden', 'wurden', 'geworden']),
 'vf-lassen': ('Viele Fehler ___ sich leicht vermeiden.', 'lassen', ['werden', 'können', 'sind']),
 'vf-seinzu': ('Die Unterlagen sind bis Freitag ___.', 'einzureichen', ['eingereicht', 'einreichen', 'zu einreichen']),
 'vf-k2': ('Wenn ich mehr Geld hätte, ___ ich in der Stadt wohnen.', 'würde', ['werde', 'wurde', 'wäre']),
 'vf-k1': ('Der Sprecher sagte, die Stadt ___ auf einem guten Weg.', 'sei', ['seien', 'sein', 'wird']),
 'vf-trennbar': ('Er hat das Radio in wenigen Minuten ___.', 'aufgeschraubt', ['geaufschraubt', 'aufschraubt', 'aufgeschraubten']),
 'vf-werden': ('Aus der kleinen Idee ist eine Bewegung ___.', 'geworden', ['worden', 'wurde', 'werden']),
 'vp-nachdenken': ('Wir sollten ___ nachdenken, wie wir Energie sparen.', 'darüber', ['darauf', 'daran', 'davon']),
 'vp-verlassen': ('Kann ich mich ___ verlassen, dass du kommst?', 'darauf', ['darüber', 'daran', 'dafür']),
 'vp-kommen-zu': ('Bei der Wohnungssuche kommt es oft ___ Konflikten.', 'zu', ['bei', 'mit', 'von']),
 'vp-wenden': ('Mit Fragen können Sie sich ___ den Mieterverein wenden.', 'an', ['auf', 'für', 'zu']),
 'vp-engagieren': ('Sie engagiert sich ___ den Klimaschutz.', 'für', ['an', 'über', 'auf']),
 'vp-beitragen': ('Jeder kann ___ beitragen, weniger Müll zu produzieren.', 'dazu', ['darauf', 'damit', 'daran']),
 'vp-fuehren': ('Hohe Mieten führen ___ Verdrängung vieler Familien.', 'zur', ['an die', 'auf die', 'mit der']),
 'vp-verzichten': ('Ich verzichte gern ___ das Auto.', 'auf', ['an', 'von', 'für']),
 'vp-abhaengen': ('Das hängt ___ der Lage ab.', 'von', ['an', 'auf', 'mit']),
 'vp-auswirken': ('Stress wirkt sich ___ die Gesundheit aus.', 'auf', ['an', 'über', 'für']),
 'vp-kuemmern': ('Wer kümmert sich ___ die Reparatur?', 'um', ['für', 'auf', 'an']),
 'vp-bemuehen': ('Sie bewirbt sich ___ eine Wohnung bei der Genossenschaft.', 'um', ['für', 'auf', 'an']),
 'vp-beschaeftigen': ('Die Studie beschäftigt sich ___ dem Wohnungsmarkt.', 'mit', ['über', 'an', 'von']),
 'vp-teilnehmen': ('Viele Bürger haben ___ der Umfrage teilgenommen.', 'an', ['bei', 'in', 'zu']),
 'vp-beziehen': ('Der Autor bezieht sich ___ eine neue Studie.', 'auf', ['an', 'zu', 'über']),
 'vp-gewoehnen': ('Ich habe mich ___ den Lärm gewöhnt.', 'an', ['auf', 'über', 'mit']),
 'vp-erinnern': ('Ich erinnere mich gut ___ meine erste Wohnung.', 'an', ['auf', 'über', 'von']),
 'vp-interessieren': ('Immer mehr Menschen interessieren sich ___ Genossenschaften.', 'für', ['an', 'über', 'auf']),
 'vp-freuen': ('Ich freue mich schon ___ den Urlaub nächste Woche.', 'auf', ['über', 'an', 'für']),
 'vp-aergern': ('Viele Mieter beschweren sich ___ den Lärm.', 'über', ['auf', 'an', 'von']),
 'vp-traeumen': ('Viele träumen ___ einem eigenen Garten.', 'von', ['über', 'an', 'auf']),
 'vp-warnen': ('Experten warnen ___ steigenden Preisen.', 'vor', ['von', 'über', 'gegen']),
 'vp-leiden': ('Viele Großstädte leiden ___ Wohnungsnot.', 'unter', ['an', 'von', 'mit']),
 'vp-sorgen': ('Bäume sorgen ___ Schatten und kühle Luft.', 'für', ['um', 'an', 'auf']),
 'vp-bestehen': ('Der Vorteil besteht ___, dass man Zeit spart.', 'darin', ['daraus', 'darauf', 'daran']),
 'vp-achten': ('Achten Sie bitte ___ die Frist!', 'auf', ['an', 'für', 'über']),
 'vp-zweifeln': ('Kritiker zweifeln ___ der Wirkung des Gesetzes.', 'an', ['über', 'von', 'auf']),
 'vp-gehoeren': ('Hamburg gehört ___ den teuersten Städten.', 'zu', ['an', 'bei', 'von']),
 'pa-dar': ('Wartest du auf den Bus? – Ja, ich warte ___.', 'darauf', ['darüber', 'dafür', 'davon']),
 'pa-dass': ('Es kommt ___ an, ob wir rechtzeitig buchen.', 'darauf', ['darüber', 'dafür', 'damit']),
 'pa-wo': ('___ hast du dich so geärgert? – Über den Lärm.', 'Worüber', ['Über wen', 'Woran', 'Wofür']),
 'pa-person': ('Meine Nachbarin ist toll. Ich kann mich immer ___ verlassen.', 'auf sie', ['darauf', 'daran', 'an ihr']),
 'end-dat-ein': ('Mit einer ___ Mappe hat man bessere Chancen.', 'vollständigen', ['vollständige', 'vollständiger', 'vollständiges']),
 'end-best': ('Die ___ Mieten sind für viele ein Problem.', 'steigenden', ['steigende', 'steigender', 'steigendes']),
 'end-ohne': ('Das Gerät lässt sich mit ___ Aufwand reparieren.', 'geringem', ['geringen', 'geringer', 'geringe']),
 'end-partizip': ('Jedes ___ Gerät bedeutet weniger Müll.', 'reparierte', ['repariertes', 'reparierten', 'reparierende']),
 'end-n': ('Wir haben lange mit dem ___ gesprochen.', 'Experten', ['Experte', 'Expertes', 'Expertem']),
 'prep-gen': ('___ des Regens fand das Fest statt.', 'Trotz', ['Aufgrund', 'Wegen', 'Anstelle']),
 'prep-gen2': ('___ eines Jahres stiegen die Mieten um zehn Prozent.', 'Innerhalb', ['Außerhalb', 'Anstelle', 'Trotz']),
 'prep-dat': ('Einer Studie ___ gehen Stadtbewohner mehr zu Fuß.', 'zufolge', ['gegenüber', 'wegen', 'trotz']),
 'prep-akk': ('Ohne ___ Makler ist die Suche günstiger.', 'einen', ['einem', 'eines', 'ein']),
 'prep-wechsel': ('Viele junge Leute ziehen in ___ Stadt.', 'die', ['der', 'den', 'dem']),
 'nvv-verfuegung': ('Die Stadt stellt Räume kostenlos zur ___.', 'Verfügung', ['Hilfe', 'Leistung', 'Verwendung']),
 'nvv-anspruch': ('Nehmen Sie die kostenlose Beratung in ___!', 'Anspruch', ['Kauf', 'Betracht', 'Kraft']),
 'nvv-kauf': ('Für die gute Lage nehme ich einen langen Weg in ___.', 'Kauf', ['Anspruch', 'Kraft', 'Frage']),
 'nvv-betracht': ('Eine WG kam für mich lange nicht in ___.', 'Betracht', ['Kauf', 'Anspruch', 'Kraft']),
 'nvv-abhilfe': ('Nur neue Wohnungen können hier ___ schaffen.', 'Abhilfe', ['Hilfe', 'Vorsorge', 'Abschluss']),
 'nvv-rolle': ('Die Lage spielt bei der Suche eine große ___.', 'Rolle', ['Bedeutung', 'Wirkung', 'Stelle']),
 'nvv-kritik': ('Viele Verbände üben ___ an der Reform.', 'Kritik', ['Einfluss', 'Bezug', 'Rücksicht']),
 'nvv-ausdruck': ('Sie bringt ihre Sorge deutlich zum ___.', 'Ausdruck', ['Einsatz', 'Abschluss', 'Eindruck']),
 'nvv-frage': ('Pendeln kommt für mich nicht in ___.', 'Frage', ['Kauf', 'Anspruch', 'Kraft']),
 'nvv-massnahmen': ('Die Stadt hat neue Maßnahmen ___.', 'ergriffen', ['gemacht', 'getan', 'geführt']),
 'nvv-entscheidung': ('Wir müssen bald eine Entscheidung ___.', 'treffen', ['machen', 'tun', 'geben']),
 'nvv-ruecksicht': ('Bitte nehmen Sie ___ auf die Nachbarn.', 'Rücksicht', ['Bezug', 'Einfluss', 'Kritik']),
 'nvv-bezug': ('Ich nehme ___ auf Ihren Artikel vom 3. Mai.', 'Bezug', ['Rücksicht', 'Einfluss', 'Abhilfe']),
 'nvv-kraft': ('Das neue Gesetz tritt im Januar in ___.', 'Kraft', ['Frage', 'Betracht', 'Kauf']),
 'nvv-einfluss': ('Der Einzelne hat wenig ___ auf den Markt.', 'Einfluss', ['Rücksicht', 'Bezug', 'Kritik']),
 'nvv-hand': ('Die Gründe für den Erfolg der App liegen auf der ___.', 'Hand', ['Zunge', 'Spur', 'Seite']),
 'nvv-gewicht': ('Die paar Euro mehr fallen kaum ins ___.', 'Gewicht', ['Wort', 'Wasser', 'Auge']),
 'nvv-schritt': ('Die Gesetze können mit der Technik kaum ___ halten.', 'Schritt', ['Tempo', 'Fuß', 'Linie']),
 'rel-nom-akk': ('Das sind Geräte, ___ man leicht reparieren kann.', 'die', ['denen', 'deren', 'der']),
 'rel-denen': ('Es gibt Portale, auf ___ Vermieter Wohnungen anbieten.', 'denen', ['die', 'deren', 'der']),
 'rel-dessen': ('Die Mieter, ___ Verträge bald enden, suchen eine neue Wohnung.', 'deren', ['dessen', 'denen', 'die']),
 'rel-praep': ('Das ist die Stadt, in ___ ich seit drei Jahren wohne.', 'der', ['die', 'dem', 'den']),
 'rel-was-wo': ('Das ist alles, ___ ich darüber weiß.', 'was', ['das', 'dass', 'welches']),
 'nap-angewiesen': ('Viele ältere Menschen sind ___ den Bus angewiesen.', 'auf', ['an', 'von', 'für']),
 'nap-abhaengig': ('Der Preis ist abhängig ___ der Lage.', 'von', ['an', 'auf', 'mit']),
 'nap-interesse': ('Das Interesse ___ Genossenschaften wächst.', 'an', ['für', 'auf', 'über']),
 'nap-angst': ('Viele Mieter haben Angst ___ einer Kündigung.', 'vor', ['von', 'über', 'für']),
 'nap-einfluss': ('Der Zuzug hat großen Einfluss ___ die Mieten.', 'auf', ['an', 'über', 'für']),
 'nap-grund': ('Der Grund ___ den Umzug war die hohe Miete.', 'für', ['von', 'an', 'über']),
 'nap-suche': ('Die Suche ___ einer Wohnung dauerte lange.', 'nach', ['für', 'auf', 'von']),
 'nap-zufrieden': ('Sie ist mit der neuen Wohnung sehr ___.', 'zufrieden', ['überzeugt', 'stolz', 'abhängig']),
 'nap-verantwortlich': ('Die Stadt ist ___ den Bau neuer Schulen verantwortlich.', 'für', ['an', 'über', 'von']),
 'ws-v2': ('Heutzutage ___ eine größere Wohnung.', 'suchen viele Familien', ['viele Familien suchen', 'Familien suchen viele', 'viele suchen Familien']),
 'ws-ns': ('Es ist noch unklar, ob die Miete ___.', 'gesenkt werden soll', ['soll gesenkt werden', 'werden soll gesenkt', 'gesenkt soll werden']),
 'ws-ns-erst': ('Weil die Miete zu hoch war, ___ umgezogen.', 'bin ich', ['ich bin', 'ich habe', 'habe ich']),
}
for x in I:
    p = x['id']
    if p in KU: x['kural'] = KU[p]
    if p in DR:
        s, a, wrong = DR[p]; assert '___' in s and a not in wrong, p; x['drill'] = {'s': s, 'a': a, 'o': wrong}
missing = [x['id'] for x in I if 'drill' not in x]; assert not missing, missing
nok = [x['id'] for x in I if 'kural' not in x and x['cat'] not in ('vp', 'nap')]; assert not nok, nok

ids = [x['id'] for x in I]; assert len(ids) == len(set(ids)), 'duplicate ids'
catids = {c['id'] for c in CATS}; assert all(x['cat'] in catids for x in I)

# Which exercise item practised which pattern (item ids as the app stores them: section_block_gap)
LINKS = {
    'day4': {
        'sprachbausteine_sb_1': 'kon-obwohl', 'sprachbausteine_sb_2': 'vf-passiv-praet', 'sprachbausteine_sb_3': 'nvv-verfuegung',
        'sprachbausteine_sb_4': 'end-dat-ein', 'sprachbausteine_sb_5': 'vf-lassen', 'sprachbausteine_sb_6': 'vp-nachdenken',
        'sprachbausteine_sb_7': 'vp-kommen-zu', 'sprachbausteine_sb_8': 'rel-nom-akk', 'sprachbausteine_sb_9': 'rel-denen',
        'sprachbausteine_sb_10': 'prep-gen', 'sprachbausteine_sb_11': 'vf-passiv-modal', 'sprachbausteine_sb_12': 'kon-dass',
        'sprachbausteine_sb_13': 'vp-engagieren', 'sprachbausteine_sb_14': 'vp-wenden', 'sprachbausteine_sb_15': 'kon-sowohl',
        'sprachbausteine_sb_16': 'kon-je', 'sprachbausteine_sb_17': 'end-best', 'sprachbausteine_sb_18': 'kon-trotzdem',
        'sprachbausteine_sb_19': 'vp-verlassen', 'sprachbausteine_sb_20': 'vf-trennbar', 'sprachbausteine_sb_21': 'ws-v2',
        'sprachbausteine_sb_22': 'vf-werden',
    },
    'day5': {
        'comeback_cb_1': 'vp-nachdenken', 'comeback_cb_2': 'vp-verlassen', 'comeback_cb_3': 'vp-kommen-zu', 'comeback_cb_4': 'kon-obwohl',
        'comeback_cb_5': 'vp-wenden', 'comeback_cb_6': 'vf-passiv-praet', 'comeback_cb_7': 'nvv-verfuegung', 'comeback_cb_8': 'kon-sowohl',
        'comeback_cb_9': 'vp-engagieren', 'comeback_cb_10': 'end-dat-ein', 'comeback_cb_11': 'rel-denen', 'comeback_cb_12': 'vf-lassen',
        'comeback_cb_13': 'kon-trotzdem', 'comeback_ws1': 'ws-ns', 'comeback_ws2': 'ws-v2', 'comeback_ws3': 'ws-ns', 'comeback_ws4': 'ws-ns-erst',
        'wtest_w06': 'nvv-anspruch', 'wtest_w05': 'nvv-abhilfe',
    },
    'day6': {
        'comeback_cb_3': 'vp-kommen-zu', 'comeback_cb_4': 'vp-nachdenken', 'comeback_cb_6': 'nvv-verfuegung', 'comeback_cb_7': 'kon-sowohl',
        'comeback_cb_9': 'rel-denen', 'comeback_cb_10': 'rel-nom-akk',
        'wtest_w05': 'vp-auswirken', 'wtest_w06': 'nvv-hand', 'wtest_w07': 'nvv-gewicht',
        'sprachbausteine_sb_2': 'vp-nachdenken', 'sprachbausteine_sb_4': 'vp-auswirken', 'sprachbausteine_sb_5': 'vf-passiv-praet',
        'sprachbausteine_sb_6': 'nvv-kauf', 'sprachbausteine_sb_9': 'vp-kommen-zu', 'sprachbausteine_sb_10': 'kon-obwohl', 'sprachbausteine_sb_11': 'kon-deshalb',
        'sprachbausteine_sb_12': 'vf-k2', 'sprachbausteine_sb_13': 'vf-werden', 'sprachbausteine_sb_14': 'kon-weil', 'sprachbausteine_sb_15': 'vp-verlassen',
        'sprachbausteine_sb_16': 'kon-dass', 'sprachbausteine_sb_17': 'rel-nom-akk', 'sprachbausteine_sb_19': 'kon-je', 'sprachbausteine_sb_20': 'nvv-rolle',
        'sprachbausteine_sb_21': 'prep-dat',
    },
}
for d, m in LINKS.items():
    for item, pid in m.items(): assert pid in ids, (d, item, pid)

out = {'v': 1, 'cats': CATS, 'items': I, 'links': LINKS}
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'kaliplar.js'), 'w', encoding='utf-8').write('window.KALIP = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('items', len(I), {c['id']: sum(1 for x in I if x['cat'] == c['id']) for c in CATS}, 'links', {d: len(m) for d, m in LINKS.items()})
