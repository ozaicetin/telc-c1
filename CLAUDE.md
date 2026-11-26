# C1-Heft · çalışma talimatı (Claude için)

Bu depo Özay'ın telc Deutsch C1 çalışma sitesidir: https://ozaicetin.github.io/telc-c1/ (GitHub Pages, `main`, kök klasör).
Öğrencinin ilerlemesi, hataları ve kişisel notları **burada değil**, claude.ai'daki „TELC C1 Ve Logistik Lernen“ Projesindedir:
`claude/00-telc-c1-ogretmen-rehberi.md` (kurallar, akış), `claude/01-telc-c1-ilerleme-gunlugu.md` (puanlar, hatalar, kelimeler) ve `claude/03-kararlar-ve-oturum-gecmisi.md` (kararlar, sistem haritası, bekleyen işler, her gün için kontrol listesi). Her oturumda önce bunları oku. Sesli mod: `claude/02-sprechpartner-sesli-mod.md`. Tam yedek: `claude/yedek/son-yedek.md` (haftada bir yenilenir, öğrenciye de gönderilir).

**Depo herkese açık.** Puan, hata listesi, öğretmen notu, yazdığı metinler gibi kişisel bilgileri buraya koyma; onlar Projede kalır.

## Yapı
- `src/` → `index.html` kaynağı: `head.html`, `fonts.css`, `base.css`, `theme.css` (C1-Heft tasarımı), `app.js`. `python3 tools/build.py` ile `index.html` üretilir. `index.html`'i elle düzenleme.
- `data/manifest.js` (günler, kelimeler, `current`), `data/plan.js` (Haziran 2027 planı: 21 etap × 5 gün, haftada 4 gün, `phases`, `milestones`, `examDate`; `weeks[w]` = etap, gün satırında `boss`/`big`/`bil`; değiştirirsen manifestte `planV`'yi artır), `data/dayN.js` (gün içeriği), `data/seed.js` (Tag 1–3 kelime tekrar verisi).
- `sw.js` çevrimdışı çalışma (önce ağ, yoksa kayıtlı kopya). `fonts/`, `icons/`, `manifest.webmanifest`.
- `tools/daykit.py`: gün yazma yardımcıları (`W`, `mc`, `gap`, `rfx`, `note`) ve `save_day()` (doğrular, `data/dayN.js` yazar, manifesti günceller, `current` yapar, sürümü artırır).

## „N. günü hazırla“ / „N. günü bitirdim“
1. Sonuç: öğrenci Karne'den indirdiği `c1-heft-tagN-sonuc.json` dosyasını ekler veya „Raporu kopyala“ metnini yapıştırır. Raporu ondan yaz; dosyanın içeriğini Projeye `claude/sonuclar/tagN-sonuc.json` olarak kaydet (yedek: tarayıcı verisi silinirse buradan geri yüklenir).
2. Yeni gün: Projedeki günlükten en kritik hataları ve plandaki günü al. İçeriği bir Python betiğinde `tools/daykit.py` ile kur ve `save_day(day, words, date=..., short=...)` çağır. Gün nesnesine kısa bir `teacherNote` (Türkçe, el yazısı kutusunda görünür) ekle.
3. Test: `python3 tools/build.py --test /tmp/site`, `python3 -m http.server` ile aç, Playwright (`/usr/bin/google-chrome`) ile tüm adımları, sınav modunu (`mock`), Karne, Harita, Kelimeler sekmelerini ve telefon genişliğini dene. Boşlukları JS ile doldur (`select.value=…; change`).
4. Yayın: `python3 tools/build.py` (app değiştiyse), commit (author `ozaicetin <361275159+ozaicetin@users.noreply.github.com>`), `git -c push.negotiate=true push`. Pages 1–2 dakikada güncellenir; CDN index'i 10 dakikaya kadar eski gösterebilir.
5. Projedeki günlüğü güncelle (gün satırı, hatalar, öğretilen kelimeler, değişiklik geçmişi).

## Kurallar (öğrencinin)
Günde en çok 90 dk, haftada 4 gün (günler esnek; 26.11.2026'dan). Hedef sınav Haziran 2027 (19.06.2027). Etap ritmi: 1. gün Lesen + Sprachbausteine, 2. Hören, 3. Schreiben, 4. Sprechen, 5. Boss; Etap 6/11/16/20 büyük deneme (dört gün tam sınav + Bilanz; 6 = resmî Übungstest 1). Gün dosyasında `week` = etap numarası. Yalnızca telc C1 (sektör/lojistik yok, arada konu olarak geçebilir). Günde 20 genel sınav kelimesi, bilinmeyenler 1-3-7-14. Her şey DE, yanında EN, altında açılır TR. Sınav bölümleri gerçek formatta ve sınav modunda (`mock: {label, pts}`: geri sayan süre, „Abgeben“, gerçek puanlar). Önceki günlerin kritik hataları yeni metinlerin içinde tekrar sorulur. Sohbette cevaplar Türkçe ve kısa; Almanca cümle düzeltirken yalnızca doğru cümle.

## Gerçek sınav ölçüleri (26.11.2026'dan zorunlu)
Kaynak: resmî telc Deutsch C1 Übungstest 1 (telc.net, ücretsiz: https://www.telc.net/fileadmin/user_upload/mock_exams/Deutsch/telc_deutsch_c1.zip). Öğrenci: „hepsini telc C1 formatına ve sınav sorularına paralel yaz“. Her sınav bölümü bu ölçülerde yazılır; kısaltma yok. Resmî metinleri siteye kopyalama (telif); ölçüleri ve soru tarzını taklit et, metinleri kendin yaz.
- **Lesen 1** (12 P): dergi makalesi ~480–500 kelime, 6 boşluk + örnek, 8 cümle a–h (2 çeldirici); cümleler gösterme sözcükleri, bağlaçlar ve içerik tekrarıyla bağlanır.
- **Lesen 2** (12 P): tek metin (çoğu zaman kişisel deneyim yazısı), 5 bölüm a–e, ~800–850 kelime (bölüm başına 70–230). 6 soru „In welchem Abschnitt …“; çoğu yazarın tutumunu/niyetini sorar (polemisch, belehrend, selbstironisch, beschönigen …). Her bölüm en az bir kez cevap, biri iki kez.
- **Lesen 3** (24 P): bilgi/dergi metni ~1.100–1.200 kelime, ~13 paragraf; 11 ifade metin sırasıyla, dağılım 4 richtig / 4 falsch / 3 nicht im Text; tuzaklar: kişi, kaynak, neden-sonuç, „nur dann, wenn“, mantıklı ama yazılmamış. 24. görev: 3 seçenekli başlık.
- **Sprachbausteine** (22 P): popüler bilim metni ~450–500 kelime, 22 boşluk, 4 şık; kelime, bağlaç, sıfat eki, edat, fiil biçimi, Konjunktiv.
- Lesen + SB toplam 90 dk; önerilen pay: L1 15, L2 18–20, L3 28–30, SB 22–25.
- **Hören** (~40 dk, her ses bir kez): T1 8 kişi × 100–170 kelime, 10 ifade a–j (2 fazla), 1 dk okuma · T2 radyo röportajı (2 kişi, konuşma dili), 10 yarım cümle + 3 bitiş, 3 dk okuma · T3 sunum ~1.000 kelime, slayt notlarında 10 boşluk (kısa kelime grupları), 1 dk okuma + 5 dk aktarma.
- **Schreiben** (48 P, 70 dk): iki konudan biri (Leserbrief, Stellungnahme …), durum + iki alıntı; görüş, argümanlar, artı/eksi, gerekçeli sonuç; ~350 kelime. Ölçütler: Aufgabengerechtheit, Korrektheit, Repertoire, Kommunikative Gestaltung (her biri A/B/C/D = 12/8/4/0).
- **Mündlich** (48 P): 20 dk hazırlık; 1A iki konudan biri (3–4 dk); 1B partnerin sunumunu özetle + en az bir Anschlussfrage (2–3 dk); 2 üç alıntıdan biri üzerine tartışma (~6 dk). İçerik 16 (1A 6, 1B 4, 2 6) + dil 32 (Flüssigkeit, Repertoire, Grammatik, Aussprache × 8).
- 90 dk'lık bir günde gerçek boyutta ancak ~45–60 dk sınav bölümü sığar: ısınma (kartlar, tekrar, Comeback) ~30 dk. Bir bölümü kısaltmak yerine bölümü başka güne taşı.
- Sınav modunda `listen` yalnızca bir kez çalar (`lplayonce`, `d.plays[secId]`; satır satır düğmeler, `say` düğmeleri ve „langsamer“ gizli); „Abgeben“den sonra serbest. Gün bütçeleri: 1. gün ısınma ~30 + 2–3 okuma görevi 40–60 · 2. gün ısınma ~30 + Hören 1–3 ~45 · 3. gün ısınma ~15 + yazma (Faz 1 40–50, Etap 7'den tam 70) · 4. gün ısınma ~25 + 20 hazırlık + ~16 konuşma + değerlendirme · 5. gün ısınma ~20 + ~60 deneme.

## Sprechpartner (canlı konuşma partneri)
- **Asıl yol (25.11.2026'dan): sitedeki sayfa** https://ozaicetin.github.io/telc-c1/sprechen/ — kaynak `src/sprechen.html`, `python3 tools/build.py` onu `sprechen/index.html` olarak yazar (fontlar `../fonts/`). iPhone Safari'de gerçek mikrofon ve doğal ses.
  - Beyin: Claude API (`claude-haiku-5-5` konuşma, `claude-sonnet-5-5` değerlendirme; tarayıcıdan `anthropic-dangerous-direct-browser-access`). Ses: OpenAI `gpt-4o-mini-tts` (sesler marin/cedar/coral/ash), tanıma: `gpt-4o-mini-transcribe` (MediaRecorder + sessizlikte otomatik durma) ya da cihazın Web Speech tanıması (ücretsiz seçenek).
  - Öğrencinin kendi API anahtarları yalnızca cihazında (`localStorage` `c1-sp-keys`). Depoya, koda, Projeye anahtar koyma. Öğrenci istedi: otomatik ödeme yok, ön ödemeli, ekstra çekim yok; sayfada günlük harcama sınırı (`c1-sp-set.cap`, varsayılan 0,40 $) ve maliyet sayacı (`c1-sp-cost`).
  - Görev otomatik: güncel günün `speak` bölümünden (topic, structure, „Anschlussfrage“ maddesi = ek soru). Ayrıca sabit Teil 1B konuları, Teil 2 tezleri, serbest sohbet ve gündelik hayat rol oyunları (`kind:'role'`, alanlar `who`, `me`, `goal`, `tr`: doktor, ev bakma, Bürgeramt, telefonla şikâyet, iş arkadaşıyla sohbet, yöneticiyle izin, komşu) (`GENERAL`). Öğrenci önce ucuz Haiku ile denemek istiyor; beğenmezse konuşma için Sonnet'e geçilecek (`MODELS_TURN`). Yeni gün için bir şey yapmaya gerek yok; yeni tez/konu eklemek istersen `GENERAL` dizisini düzenle.
  - Sonuçlar: ana durumda `days[current].partner` (son 10: teil, task, mode, pct, grade, words, wpm, secs, cost, korrekturen, next) ve günün Teil 1A görevi yapıldıysa `speak.done`. Raporu kopyala metnine ve sonuç dosyasına girer. „N. günü bitirdim“de bunları oku.
- **Ücretsiz laptop sürümü (öğrenci ödeme yapmazsa asıl yol):** claude.ai artifact'ı https://claude.ai/artifact/Kxxn5QzTgQfJ53gdCzhF7z (slug `9994c6f2-4bf8-4019-ab6a-1b58f7e7cebd`). Chrome/Edge ya da Claude masaüstü uygulamasında Pro ile ücretsiz (dictation + Claude sesi + sample); iPhone/iPad Safari'de mikrofon ve ses yok. Kaynak `src/partner-artifact.html`; `python3 tools/build.py` onu `artifact/sprechpartner.html` olarak yazar ve içine günün Teil 1A görevini (`/*TODAY*/`, güncel günün `speak` bölümünden) ve ortak görev listesini (`src/partner-tasks.js`, `/*GENERAL*/`) koyar. **Her yeni günde:** build'den sonra `get_artifact` ile sürümü al, `publish_files` ile `artifact/sprechpartner.html`'i `index.html` olarak aynı slug'a yayınla (yetenekler korunur). Oturumlar artifact veritabanında `sessions/…` (`db_list`/`db_get`).
- Görev listesi tek yerde: `src/partner-tasks.js` (iki sayfa da kullanır). Site, Sprechen adımında iki düğme gösterir: „Laptopta ücretsiz“ (artifact `#dayN-1a`) ve „Telefonda (kendi anahtarınla)“ (`sprechen/#today`).
- Üçüncü yol: Claude uygulamasının sesli modu (Projedeki `claude/02-sprechpartner-sesli-mod.md`).

## Tasarım
„C1-Heft“: kareli defter, kırmızı kenar çizgisi, bantlı sınav kâğıdı, post-it Türkçe, kırmızı kalem hocanın notu, XP/Level, Zincir, Karne (not 1–6, „Bestanden“ damgası), Harita (her hafta bir „Boss“ deneme). Fontlar Bricolage Grotesque, Caveat, Literata. Öğrenci düz, „Claude görünümlü“ arayüzü istemiyor; bu dili koru.
