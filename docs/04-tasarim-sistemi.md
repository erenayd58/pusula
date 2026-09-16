# Tasarım Sistemi

## 1. Konu, Kitle, Görev

- **Konu:** LGS'ye hazırlanan bir öğrencinin çalışma defteri ve koçunun kontrol paneli.
- **Kitle:** 13-14 yaşında öğrenciler (telefonda, kısa süreli, sık kullanım), koç (masaüstünde, yoğun veriyle), veli (telefonda, haftada birkaç kez, özet).
- **Birincil görev:** Öğrenci için "bugün ne yapacağım ve ne yaptım" sorusunu saniyeler içinde yanıtlamak. Koç için "kime, neden müdahale etmeliyim" sorusunu tek bakışta yanıtlamak.

## 2. Görsel Fikir

Okul hayatının tanıdık nesnelerinden beslenen sade bir dil:

- **Ders renkleri = defter kapakları.** Her dersin sabit bir rengi vardır ve bu renk uygulamanın her yerinde (rozet, grafik, konu haritası, plan kartının sol çizgisi) aynı dersi temsil eder. Öğrenci bir süre sonra metni okumadan rengi tanır.
- **Mürekkep ve kâğıt.** Nötr zemin serin gri-beyaz, metin ve birincil düğmeler koyu mürekkep mavisi. Renk yükünü dersler taşır; arayüzün kendisi sessizdir.
- **Fosforlu kalem.** Tek vurgu rengi. Sadece "tamamlandı" anında ve günün hedef sayısında kullanılır; bir satırın arkasına fosforlu kalem çekilmiş gibi görünür. Başka hiçbir yerde kullanılmaz, böylece anlamını korur.

**İmza öğe: Konu Haritası.** Her ders bir satır, her konu bir hücre; hücrenin doluluğu hâkimiyet puanını gösterir. Öğrencinin ve koçun "nerede eksiğim var" sorusuna tek ekranda cevap veren, uygulamanın en akılda kalıcı ekranı budur. Görsel cesaret burada harcanır; diğer ekranlar sakin kalır.

### Bilinçli olarak kaçınılanlar

- Her şeyi aynı köşe yuvarlaklığında ve aynı gölgeli kartlara bölmek. Burada çizgiler ve boşluk hiyerarşiyi kurar; gölge sadece üstte yüzen öğelerde (alt panel, menü, diyalog) vardır.
- Başlıkların üstünde küçük harf aralıklı BÜYÜK HARF etiketler.
- Motivasyon için gradyanlı süslemeler, konfeti yağdıran animasyonlar. Başarı anı tek, küçük ve anlamlı bir hareketle gösterilir (fosforlu kalemin satıra çekilmesi).
- Kırmızıyı performans için kullanmak. Kırmızı sadece sistem hatasıdır ("kaydedilemedi"). Düşük performans "kalan" diliyle ve nötr renkle gösterilir.

## 3. Renk Token'ları

`src/app/globals.css` içinde CSS değişkeni olarak tanımlanır, Tailwind v4 `@theme` ile sınıflara bağlanır.

### 3.1 Temel

| Token | Açık tema | Koyu tema | Kullanım |
|---|---|---|---|
| `--canvas` | `#F4F6FA` | `#0F1426` | Sayfa zemini |
| `--surface` | `#FFFFFF` | `#172036` | Kart, panel, tablo zemini |
| `--ink` | `#1B2440` | `#E8ECF5` | Ana metin, birincil düğme zemini |
| `--ink-muted` | `#5B6479` | `#9AA3B8` | İkincil metin |
| `--line` | `#D9DEE8` | `#2A3350` | Kenarlıklar, ayraçlar |
| `--highlight` | `#FFD84D` | `#E9BE2F` | Fosforlu kalem (sadece tamamlandı + günün hedefi) |
| `--danger` | `#C23B34` | `#F07A72` | Sadece sistem hataları |
| `--success` | `#1D8F63` | `#4CC495` | Kayıt başarılı bildirimi |

### 3.2 Ders Renkleri

Veritabanında `subjects.color` alanı token **adını** tutar (`subject-math`), hex değerini değil. Böylece tema değişince veriler bozulmaz. Yeni bir ders eklenirse yedek paletten (`subject-extra-1…4`) seçilir.

| Token | Ders | Açık | Koyu |
|---|---|---|---|
| `--subject-turkish` | Türkçe | `#D9543C` | `#F08A73` |
| `--subject-math` | Matematik | `#2E66D6` | `#6E9BF2` |
| `--subject-science` | Fen Bilimleri | `#14946F` | `#4FC7A2` |
| `--subject-history` | İnkılap Tarihi | `#A8741A` | `#DDAA4E` |
| `--subject-religion` | Din Kültürü | `#7654C2` | `#A68BE6` |
| `--subject-english` | İngilizce | `#C63F77` | `#EC7DAA` |
| `--subject-extra-1…4` | Yedek | `#0E7C86`, `#6B7A1E`, `#8A4F7D`, `#4B5563` | açık tonları |

Her ders rengi için `--subject-*-soft` (%12 opaklık zemin) türetilir. Metin her zaman `--ink` renginde kalır; ders rengi metin rengi olarak sadece büyük ve kalın ifadelerde kullanılır (kontrast için).

### 3.3 Hâkimiyet Ölçeği (Konu Haritası)

Renk tek başına anlam taşımaz; doluluk seviyesi + desen birlikte kullanılır.

| Durum | Hücre görünümü |
|---|---|
| Başlanmadı | Boş hücre, ince `--line` kenarlık |
| Çalışılıyor | Hücrenin alt %33'ü ders rengiyle dolu |
| Tamamlandı | Alt %66 dolu |
| Oturdu | Tamamen dolu |
| Tekrar gerekli | Mevcut doluluk + çapraz tarama deseni |

Hücreye dokununca/üzerine gelince konu adı, soru sayısı, başarı yüzdesi ve son çalışma tarihi gösterilir.

## 4. Tipografi

- **Aile:** [Lexend](https://fonts.google.com/specimen/Lexend), `next/font/google` ile, `latin` + `latin-ext` alt kümeleri. Okuma akıcılığını artırmak amacıyla tasarlanmış bir yazı tipi; genç kullanıcılar ve yoğun sayı içeren ekranlar için bilinçli seçim. Kurulumda ğ, ş, ı, İ, ç, ö, ü karakterlerinin doğru göründüğü kontrol edilir.
- **Yedek:** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- **Sayılar:** Tüm istatistik ve tablolarda `font-variant-numeric: tabular-nums`.

| Token | Boyut / satır yüksekliği | Ağırlık | Kullanım |
|---|---|---|---|
| `text-display` | 40 / 44 | 600 | Günün hedef sayısı, geri sayım |
| `text-title` | 24 / 30 | 600 | Sayfa başlığı |
| `text-heading` | 18 / 24 | 600 | Bölüm başlığı |
| `text-body` | 16 / 24 | 400 | Gövde (mobilde asla 16'nın altına inmez; iOS yakınlaştırmasını önler) |
| `text-small` | 14 / 20 | 400 | İkincil bilgi, tablo |
| `text-micro` | 12 / 16 | 500 | Grafik ekseni, rozet |

Başlıklar cümle düzeninde yazılır ("Bugünkü görevler"), büyük harf kullanılmaz.

## 5. Biçim ve Boşluk

- **Boşluk ölçeği:** 4 px tabanlı (4, 8, 12, 16, 24, 32, 48).
- **Köşe yuvarlaklığı hiyerarşisi:**
  - `6px`: giriş alanı, rozet, konu haritası hücresi
  - `10px`: kart, tablo kapsayıcısı
  - `20px`: alt panel (bottom sheet) üst köşeleri, diyalog
  - `999px`: sadece ilerleme çubuğu ve avatar
- **Gölge:** Sadece yüzen öğelerde tek bir gölge token'ı (`--shadow-float`).
- **Dokunma hedefi:** En az 44×44 px.
- **Satır uzunluğu:** Metin blokları en fazla ~70 karakter (`max-w-prose`).

## 6. Yerleşimler

### 6.1 Öğrenci: Bugün (mobil)

```
┌──────────────────────────────┐
│ Günaydın Elif        🔥 12   │  ← seri
│ LGS'ye 268 gün               │
├──────────────────────────────┤
│  Bugün                        │
│  86 / 120 soru               │  ← text-display, hedefe ulaşınca fosforlu
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░            │
├──────────────────────────────┤
│ Planım                  3/5  │
│ ▌Mat  Üslü İfadeler · 40 soru│  ← sol çizgi ders rengi
│ ▌Fen  Basınç · video 3-5  ✓  │  ← tamamlanınca fosforlu arka plan
│ ▌Türkçe Paragraf · 30 soru   │
├──────────────────────────────┤
│ Tekrar zamanı            4   │
│ DNA ve Genetik Kod · 7. gün  │
├──────────────────────────────┤
│  [modül widget'ları sırayla] │
└──────────────────────────────┘
│ Bugün  Konular  (＋)  Deneme  Ben │  ← alt menü, ortada hızlı kayıt
```

### 6.2 Öğrenci: Hızlı kayıt alt paneli

```
┌──────────────────────────────┐
│ Soru kaydı              ✕    │
│ [Mat][Fen][Tür][İnk][Din][İng]│  ← son kullanılan ders seçili gelir
│ Konu:  Üslü İfadeler     ▾   │  ← son konu önerilir
│ Kaynak: (isteğe bağlı)   ▾   │
│                              │
│  Doğru    Yanlış    Boş      │
│  [ 32 ]   [  6 ]   [  2 ]    │  ← büyük sayı klavyesi
│  Toplam 40 · Net 30,00       │
│                              │
│ [        Kaydet         ]    │
└──────────────────────────────┘
```

### 6.3 Koç: Ana ekran (masaüstü)

```
┌────────────┬─────────────────────────────────────────────────────┐
│ Pusula     │ Öğrencilerim                     [+ Yeni öğrenci]   │
│            ├─────────────────────────────────────────────────────┤
│ Öğrenciler │ Dikkat gerektirenler (3)                            │
│ Planlar    │ Ahmet K.   4 gündür kayıt yok                  [→]  │
│ Şablonlar  │ Zeynep A.  Son 2 deneme ortalaması -6 net      [→]  │
│ Kaynaklar  │ Can D.     19 tekrar birikmiş                  [→]  │
│ Videolar   ├─────────────────────────────────────────────────────┤
│ Denemeler  │ Ad        Son giriş  Hafta hedefi  Son net  Plan    │
│ Duyurular  │ Elif Y.   bugün      ████████░ 86%  71,33 ↑ %80     │
│ Ayarlar    │ Ahmet K.  4 gün önce ██░░░░░░ 22%   58,00 → %35     │
│            │ …                                                   │
└────────────┴─────────────────────────────────────────────────────┘
```

### 6.4 Konu Haritası

```
              1. dönem ─────────────────────── 2. dönem ────────
Matematik    [▇][▇][▅][▂][ ][ ][ ][ ][ ][ ][ ][ ]
Fen          [▇][▅][▨][▂][ ][ ][ ]
Türkçe       [▇][▇][▅][▅][▂][ ][ ][ ][ ][ ][ ][ ]
İnkılap      [▇][▂][ ][ ][ ][ ][ ]
Din          [▅][ ][ ][ ][ ]
İngilizce    [▇][▅][▂][ ][ ][ ][ ][ ][ ][ ]
                         ▨ = tekrar gerekli
```

### 6.5 Veli: Özet (mobil)

Tek sütun, en önemli üç bilgi yukarıda: bu haftaki çalışma (soru + süre), plan uyumu yüzdesi, son deneme neti ve trendi. Altında koçun veliye açık son notu.

## 7. Hareket

- Tek anlamlı an: bir görev tamamlandığında fosforlu kalem soldan sağa 250 ms'de çizilir.
- Alt panel açılış/kapanış geçişi (kullanıcı eylemine yanıt).
- Sayfa yüklemede kademeli giriş animasyonları **yok**.
- `prefers-reduced-motion` durumunda tüm geçişler anlık olur.

## 8. Yazım Dili

| Kitle | Hitap | Örnek |
|---|---|---|
| Öğrenci | Sen, samimi, kısa | "Bugün 34 soru kaldı." / "Kaydedildi." |
| Veli | Siz, bilgilendirici | "Elif bu hafta planının %80'ini tamamladı." |
| Koç | Nötr, işlevsel | "Plan 3 öğrenciye kopyalandı." |

Kurallar:

- Düğme ne yapacağını söyler: "Kaydet", "Planı yayınla", "Daveti gönder". "Tamam", "Gönder" gibi belirsiz ifadeler kullanılmaz.
- Eylemin adı akış boyunca aynı kalır: "Planı yayınla" → "Plan yayınlandı".
- Hata mesajı ne olduğunu ve ne yapılacağını söyler, özür dilemez: "Fotoğraf 2 MB'tan büyük. Daha küçük bir fotoğraf seç."
- Boş ekran bir davettir: "Henüz deneme eklemedin. İlk denemeni ekleyerek net takibine başla." + düğme.
- Performans dili yargılamaz: "Hedefin gerisindesin" yerine "Haftalık hedefe 180 soru kaldı".
- Sayılar Türkçe biçimde: `71,33 net`, `1.250 soru`, `%80`.

## 9. Erişilebilirlik Tabanı

- WCAG AA kontrast (metin 4,5:1, büyük metin 3:1). Ders renkleri açık zeminde metin olarak sadece `text-heading` ve üzeri boyutta.
- Görünür klavye odağı (`focus-visible` halkası, `--ink` renginde 2 px).
- Hiçbir bilgi sadece renkle aktarılmaz (ders adı kısaltması, desen, simge eşlik eder).
- Grafiklerin altında ekran okuyucu için özet metin.
- Form alanlarının hepsinde görünür etiket; hata mesajı alana `aria-describedby` ile bağlı.
- Mobil sayı girişi `inputmode="numeric"`.

## 10. Bileşen Envanteri

`components/shared` altında, modüllerin ortak kullandığı bileşenler:

| Bileşen | Açıklama |
|---|---|
| `SubjectBadge` | Ders renk noktası + kısa ad |
| `SubjectStripe` | Kartın solundaki ders renkli dikey çizgi |
| `StatNumber` | Büyük sayı + küçük açıklama, tabular rakam |
| `ProgressBar` | Hedef ilerlemesi, hedefe ulaşınca fosforlu |
| `HighlightMark` | Fosforlu kalem efekti sarmalayıcısı |
| `TopicMasteryCell` | Konu haritası hücresi |
| `EmptyState` | Boş ekran: açıklama + eylem düğmesi |
| `PageHeader` | Başlık, açıklama, sağda eylemler |
| `BottomSheet` | Mobilde alt panel, masaüstünde diyalog (aynı API) |
| `NumberStepper` | Doğru/yanlış/boş için büyük dokunmatik sayı girişi |
| `CountdownChip` | LGS geri sayımı |
| `ConfirmDialog` | Silme gibi geri alınamaz işlemler |
| `DateRangePicker` | Türkçe, pazartesi başlangıçlı |
