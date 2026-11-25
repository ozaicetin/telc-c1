# C1-Heft · çalışma talimatı (Claude için)

Bu depo Özay'ın telc Deutsch C1 çalışma sitesidir: https://ozaicetin.github.io/telc-c1/ (GitHub Pages, `main`, kök klasör).
Öğrencinin ilerlemesi, hataları ve kişisel notları **burada değil**, claude.ai'daki „TELC C1 Ve Logistik Lernen“ Projesindedir:
`claude/00-telc-c1-ogretmen-rehberi.md` (kurallar, akış) ve `claude/01-telc-c1-ilerleme-gunlugu.md` (puanlar, hatalar, kelimeler). Her oturumda önce ikisini oku.

**Depo herkese açık.** Puan, hata listesi, öğretmen notu, yazdığı metinler gibi kişisel bilgileri buraya koyma; onlar Projede kalır.

## Yapı
- `src/` → `index.html` kaynağı: `head.html`, `fonts.css`, `base.css`, `theme.css` (C1-Heft tasarımı), `app.js`. `python3 tools/build.py` ile `index.html` üretilir. `index.html`'i elle düzenleme.
- `data/manifest.js` (günler, kelimeler, `current`), `data/plan.js` (8 haftalık plan), `data/dayN.js` (gün içeriği), `data/seed.js` (Tag 1–3 kelime tekrar verisi).
- `sw.js` çevrimdışı çalışma (önce ağ, yoksa kayıtlı kopya). `fonts/`, `icons/`, `manifest.webmanifest`.
- `tools/daykit.py`: gün yazma yardımcıları (`W`, `mc`, `gap`, `rfx`, `note`) ve `save_day()` (doğrular, `data/dayN.js` yazar, manifesti günceller, `current` yapar, sürümü artırır).

## „N. günü hazırla“ / „N. günü bitirdim“
1. Sonuç: öğrenci Karne'den indirdiği `c1-heft-tagN-sonuc.json` dosyasını ekler veya „Raporu kopyala“ metnini yapıştırır. Raporu ondan yaz; dosyanın içeriğini Projeye `claude/sonuclar/tagN-sonuc.json` olarak kaydet (yedek: tarayıcı verisi silinirse buradan geri yüklenir).
2. Yeni gün: Projedeki günlükten en kritik hataları ve plandaki günü al. İçeriği bir Python betiğinde `tools/daykit.py` ile kur ve `save_day(day, words, date=..., short=...)` çağır. Gün nesnesine kısa bir `teacherNote` (Türkçe, el yazısı kutusunda görünür) ekle.
3. Test: `python3 tools/build.py --test /tmp/site`, `python3 -m http.server` ile aç, Playwright (`/usr/bin/google-chrome`) ile tüm adımları, sınav modunu (`mock`), Karne, Harita, Kelimeler sekmelerini ve telefon genişliğini dene. Boşlukları JS ile doldur (`select.value=…; change`).
4. Yayın: `python3 tools/build.py` (app değiştiyse), commit (author `ozaicetin <361275159+ozaicetin@users.noreply.github.com>`), `git -c push.negotiate=true push`. Pages 1–2 dakikada güncellenir; CDN index'i 10 dakikaya kadar eski gösterebilir.
5. Projedeki günlüğü güncelle (gün satırı, hatalar, öğretilen kelimeler, değişiklik geçmişi).

## Kurallar (öğrencinin)
Günde en çok 90 dk, Pzt–Cum. Yalnızca telc C1 (sektör/lojistik yok, arada konu olarak geçebilir). Günde 20 genel sınav kelimesi, bilinmeyenler 1-3-7-14. Her şey DE, yanında EN, altında açılır TR. Sınav bölümleri gerçek formatta ve sınav modunda (`mock: {label, pts}`: geri sayan süre, „Abgeben“, gerçek puanlar). Önceki günlerin kritik hataları yeni metinlerin içinde tekrar sorulur. Sohbette cevaplar Türkçe ve kısa; Almanca cümle düzeltirken yalnızca doğru cümle.

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
