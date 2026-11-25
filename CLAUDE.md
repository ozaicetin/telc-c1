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
- claude.ai artifact'ı: https://claude.ai/artifact/Kxxn5QzTgQfJ53gdCzhF7z (slug `9994c6f2-4bf8-4019-ab6a-1b58f7e7cebd`). Kaynak: `artifact/sprechpartner.html` (GitHub Pages'te çalışmaz, yalnızca claude.ai'da). Öğrencinin aboneliği içinde, ek ücretsiz.
- Yetenekler: `dictation` (konuşma→metin, Chrome/Edge ve Claude masaüstü), `sample` (partner cevabı ve değerlendirme), `tts` (Claude sesi; yoksa tarayıcı sesi), `db` (`sessions/<tarih>-<görev>-<id>`, okuma/yazma `admin`), `user`.
- Görevler sayfadaki `TASKS` dizisinde. Yeni günün Sprechen görevini oraya `{id:'dN-1a', day:N, teil:'Teil 1A', kind:'present', title, target, points, follow}` olarak ekle, `publish_files` ile aynı slug'a yeniden yayınla (önce `list_files`/`get_artifact` ile sürümü al). Sitedeki Sprechen adımı `#dN-1a` ile açar (`sec.partner` ile değiştirilebilir).
- „N. günü bitirdim“de `db_list`/`db_get` ile `sessions` koleksiyonunu oku; konuşma puanlarını ve düzeltmeleri rapora ve Projedeki günlüğe ekle.

## Tasarım
„C1-Heft“: kareli defter, kırmızı kenar çizgisi, bantlı sınav kâğıdı, post-it Türkçe, kırmızı kalem hocanın notu, XP/Level, Zincir, Karne (not 1–6, „Bestanden“ damgası), Harita (her hafta bir „Boss“ deneme). Fontlar Bricolage Grotesque, Caveat, Literata. Öğrenci düz, „Claude görünümlü“ arayüzü istemiyor; bu dili koru.
