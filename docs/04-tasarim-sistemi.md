# Tasarım Sistemi

> Onaylanan tasarım Claude Design ile üretildi ve `docs/tasarim/` klasöründe duruyor. **Bu belge kuraldır, HTML dosyaları görsel referanstır.** İkisi çelişirse bu belge geçerlidir. Tasarım dosyalarındaki örnek veriler (öğrenci adları, konu adları, yayınevi adları, sayılar) sadece görseldir; gerçek konu listesi `05-lgs-2027-sablonu.md` ve veritabanından gelir.

## 1. Referans Dosyalar

| Dosya | İçerik |
|---|---|
| `docs/tasarim/tasarim-sistemi.html` | Renkler, clay seviyeleri, tipografi, kırılma noktaları, tüm bileşenler (öğrenci ve koç varyantı yan yana), token listesi |
| `docs/tasarim/ogrenci-telefon.html` | S1 Bugün, S2 Hızlı kayıt, S3 Konu haritası, S4 Haftalık plan |
| `docs/tasarim/ogrenci-masaustu.html` | S5 Bugün, S6 Hızlı kayıt diyaloğu, S7 Konu haritası |
| `docs/tasarim/veli-telefon.html` | V1 Haftalık özet |
| `docs/tasarim/koc-masaustu.html` | K1 Ana ekran, K2 Öğrenci detayı, K3 Plan oluşturucu |
| `docs/tasarim/ekran-goruntuleri/*.png` | Aynı ekranların statik görüntüleri (Claude Code bunları doğrudan okuyabilir) |

HTML dosyaları çift tıklayarak açıldığında boş görünebilir; bir yerel sunucuyla açın: `npx serve docs/tasarim`. İnternet bağlantısı gerekir (React ve Lexend CDN'den yüklenir). PNG görüntüler yedek yazı tipiyle alınmıştır, tipografi için HTML'i esas alın.

## 2. Görsel Yön: Hibrit, Tek Ürün

Renk paleti, ders renkleri, Lexend yazı tipi, lucide ikonları ve yazım dili tüm rollerde ortaktır. Değişen tek şey yüzeyin dokusudur.

| Rol | Yüzey dili | `data-surface` | Özet |
|---|---|---|---|
| Öğrenci (telefon + masaüstü) | Claymorphism | `clay` | Kabarık, dokunsal, oyunsu ama çocuksu değil. Rozet, seri, fosforlu vurgu var. |
| Veli | Sakin clay | `clay-calm` | Aynı token'lar; sadece `clay-sm` özet kartları. Rozet, seri, fosforlu vurgu yok. |
| Koç | Sade | `flat` | Düz yüzey, 1 px kenarlık, boşlukla hiyerarşi. Gölge sadece yüzen öğelerde. Clay sadece logo kutusu ve öğrenci avatarında. |

**Uygulama:** Her rolün kök layout'u `<div data-surface="clay|clay-calm|flat">` ile sarılır. Ortak bileşenler (Button, Card, Input, Badge, Dialog, Nav) varyantını bu özelliğe göre CSS ile alır; bileşene her seferinde `variant="clay"` geçilmez. Böylece aynı bileşen öğrenci ekranında kabarık, koç ekranında düz görünür.

## 3. Token'lar

`src/app/globals.css` içinde `:root` altında tanımlanır. Adlar koyu tema için korunur; koyu temada aynı adlar yeniden tanımlanacak (sonraki tur).

```css
:root {
  /* mürekkep ve zemin */
  --ink-900:#1B2440; --ink-700:#39456B; --ink-500:#5A6485; --ink-300:#9AA2BC;
  --bg-app:#E9EDF6; --bg-surface:#F1F4FB; --bg-raised:#FAFBFE; --bg-sunken:#DFE5F1;
  --bg-paper:#FFFFFF;        /* koç (flat) kart, giriş ve diyalog zemini */
  --line:#D6DDEC; --line-strong:#BCC6DE;

  /* ders renkleri: tam renk / soft zemin / koyu metin tonu */
  --subject-tr:#D14B33;   --subject-tr-soft:#FAE6E1;   --subject-tr-ink:#AE3922;
  --subject-math:#2E66D6; --subject-math-soft:#E2EAFB; --subject-math-ink:#2354BC;
  --subject-sci:#0E8C73;  --subject-sci-soft:#DBF0EA;  --subject-sci-ink:#0A6F5C;
  --subject-hist:#B0810F; --subject-hist-soft:#F6EBD3; --subject-hist-ink:#8A650A;
  --subject-rel:#7451C4;  --subject-rel-soft:#EAE3FA;  --subject-rel-ink:#6040AE;
  --subject-eng:#C2377F;  --subject-eng-soft:#FAE1EE;  --subject-eng-ink:#A62A6B;
  /* yedek ders renkleri (soft ve ink tonları uygulamada türetilecek) */
  --subject-r1:#0F7A8C; --subject-r2:#7A4A2A; --subject-r3:#4F5A6B; --subject-r4:#9C1F4F;

  /* vurgu ve durum */
  --accent-marker:#FFD84D; --accent-marker-soft:#FFF3C7;
  --state-success:#1B8A66; --state-success-soft:#DCF0E8;
  --state-warning:#C07C0C; --state-warning-soft:#FAEBD2;
  --state-error:#C6352A;   --state-error-soft:#FADFDC;

  /* clay gölgeler (öğrenci, veli) */
  --clay-sm:4px 4px 10px rgba(27,36,64,.10), -3px -3px 8px rgba(255,255,255,.85);
  --clay-md:8px 8px 20px rgba(27,36,64,.12), -6px -6px 16px rgba(255,255,255,.90);
  --clay-lg:16px 16px 34px rgba(27,36,64,.14), -10px -10px 24px rgba(255,255,255,.95);
  --clay-inner:inset 2px 2px 4px rgba(255,255,255,.60), inset -3px -3px 8px rgba(27,36,64,.06);
  --clay-pressed:inset 4px 4px 10px rgba(27,36,64,.14), inset -3px -3px 8px rgba(255,255,255,.75);
  --clay-well:inset 3px 3px 8px rgba(27,36,64,.10), inset -2px -2px 6px rgba(255,255,255,.85);

  /* koç gölgeleri, yarıçaplar ve metin boyutları: Bölüm 3.1'deki @theme içinde tanımlanır */

  /* ölçüler */
  --touch-min:44px;
  --nav-rail:104px;          /* öğrenci masaüstü yan menü (tasarımdaki gerçek değer) */
  --nav-bottom: calc(60px + 18px + max(env(safe-area-inset-bottom), 12px)); /* telefon/tablet alt menüsünün kapladığı yükseklik: çubuk + taşan (+) + safe-area; sayfa alt boşluğu ve yapışkan alt öğeler bunun üstünde */
  --coach-sidebar:232px;
  --content-max-student:1240px;
  --content-max:1320px;
  --focus-color:#2E66D6;     /* odak halkası; ders rengi değil, ders dışı hiçbir öğe --subject-* token'ına bağlanmaz */
  --focus-ring:3px solid var(--focus-color); --focus-offset:3px;
  --motion-press:120ms; --motion-marker:220ms;
}
```

Tasarım dosyasındaki token listesinden farklar: koç gölgeleri, yarıçaplar ve metin boyutları Tailwind'le ad çakışmasını önlemek için `@theme` içine taşındı (değerler aynı); `--nav-rail` ekranlarda 104 px kullanıldığı için 92 yerine 104 alındı; içerik genişliği öğrenci (1240) ve koç (1320) için ayrıldı. Boşluk token'ları Tailwind v4'ün varsayılan 4 px tabanlı ölçeğiyle birebir örtüştüğü için ayrıca tanımlanmaz (`p-1` = 4 px … `p-12` = 48 px).

### 3.1 Tailwind v4 eşlemesi

```css
@import "tailwindcss";

@theme inline {
  /* :root token'larına bağlanan renkler ve clay gölgeler */
  --color-ink-900: var(--ink-900);
  --color-ink-700: var(--ink-700);
  --color-ink-500: var(--ink-500);
  --color-ink-300: var(--ink-300);
  --color-bg-app: var(--bg-app);
  --color-bg-surface: var(--bg-surface);
  --color-bg-raised: var(--bg-raised);
  --color-bg-sunken: var(--bg-sunken);
  --color-bg-paper: var(--bg-paper);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-marker: var(--accent-marker);
  --color-marker-soft: var(--accent-marker-soft);
  --color-success: var(--state-success);
  --color-success-soft: var(--state-success-soft);
  --color-warning: var(--state-warning);
  --color-warning-soft: var(--state-warning-soft);
  --color-error: var(--state-error);
  --color-error-soft: var(--state-error-soft);
  /* ders rengi: bileşen düzeyinde ayarlanan --s değişkenleri (Bölüm 4.2) */
  --color-subject: var(--s);
  --color-subject-soft: var(--s-soft);
  --color-subject-ink: var(--s-ink);

  --shadow-clay-sm: var(--clay-sm);
  --shadow-clay-md: var(--clay-md);
  --shadow-clay-lg: var(--clay-lg);
  --shadow-clay-pressed: var(--clay-pressed);
  --shadow-clay-well: var(--clay-well);

  --font-sans: var(--font-lexend), system-ui, sans-serif;
}

@theme {
  /* Tailwind ad alanlarıyla aynı adı taşıyan token'lar :root'ta değil burada,
     literal değerle tanımlanır. inline olmayan @theme bunları CSS değişkeni olarak
     da yayınlar, yani var(--radius-card) gibi her yerde kullanılabilir. */
  --shadow-pop: 0 10px 28px rgba(27,36,64,.14), 0 2px 6px rgba(27,36,64,.06);
  --shadow-drag: 0 16px 32px rgba(27,36,64,.20);

  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-card: 20px;
  --radius-lg: 28px;
  --radius-xl: 36px;
  --radius-pill: 999px;

  --text-display: 32px;    --text-display-lg: 44px;   /* telefon / masaüstü */
  --text-title: 24px;      --text-title-lg: 28px;
  --text-heading: 18px;    --text-heading-lg: 20px;
  --text-body: 16px;
  --text-small: 14px;
  --text-micro: 12px;      --text-micro-lg: 12.5px;
}
```

Kırılma noktaları Tailwind varsayılanlarıyla örtüşür: `md:` = tablet (768 px), `lg:` = masaüstü (1024 px). Ayrıca tanımlanmaz.

Clay yardımcıları `@utility` ile tanımlanır (ör. `clay-card`: `bg-raised` + `--clay-md` + `--clay-inner`; `clay-press`: `:active` durumunda `--clay-pressed` ve `scale(.97)`, `--motion-press` süresiyle).

### 3.2 Yüzey varyantları (`@custom-variant`)

`data-surface` mekanizması Tailwind v4 özel varyantlarıyla çalışır; bileşen sınıfları `clay:` / `calm:` / `flat:` önekiyle yazılır, bileşene prop geçilmez:

```css
@custom-variant clay (&:where([data-surface="clay"], [data-surface="clay"] *, [data-surface="clay-calm"], [data-surface="clay-calm"] *));
@custom-variant calm (&:where([data-surface="clay-calm"], [data-surface="clay-calm"] *));
@custom-variant flat (&:where([data-surface="flat"], [data-surface="flat"] *));
```

- `clay` varyantı hem `clay` hem `clay-calm` yüzeyinde geçerlidir; `calm` yalnızca veli yüzeyinde ve `clay`'den sonra tanımlandığı için aynı öğede kazanır (ör. `clay:shadow-clay-md calm:shadow-clay-sm`).
- Seçici "kendisi veya soyundan" biçimindedir: portal ile `body`'ye çıkan Dialog içeriği kendi üzerine `data-surface` alır (`useSurface()` ile) ve doğru varyantı korur.
- Yüzeyler **iç içe konmaz**; her rol layout'unda tek `SurfaceRoot`. `data-surface` olmayan bağlamda bileşenler nötr (flat'e yakın) görünür.

### 3.3 shadcn/ui takma adları

shadcn bileşenlerinin beklediği semantik adlar (`--color-background`, `--color-primary`, `--color-border`, `--color-ring` …) `@theme inline` içinde **yalnızca yukarıdaki token'lara bağlanarak** tanımlanır (`--color-primary: var(--ink-900)`, `--color-border: var(--line)`, `--color-ring: var(--focus-color)` gibi). Hex yazılmaz, yeni renk tanımlanmaz; amaç sonraki fazlarda eklenen shadcn bileşenlerinin ilk andan paleti kullanmasıdır.

## 4. Renk Kuralları

### 4.1 Genel

- Hex değer bileşenlerde yazılmaz; sadece token.
- **Kırmızı (`--state-error`) sadece sistem hatasıdır.** Düşük performans nötr renk ve dille anlatılır: "180 soru kaldı".
- **Uyarı rengi (`--state-warning`)** sadece koç ekranlarında dikkat gerektiren durumlar için: "Dikkat gerektirenler" satırının kenarı, gecikmiş son giriş, yüksek birikmiş tekrar sayısı. Öğrenci ve veli ekranlarında kullanılmaz.
- **Fosforlu sarı (`--accent-marker`)** sadece iki yerde: tamamlanan görev ve ulaşılan günlük hedef. Başka hiçbir yerde kullanılmaz.

### 4.2 Ders renkleri

- Ders rengi **sadece dersi** temsil eder ve hiçbir zaman tek başına bilgi taşımaz; her zaman kısa ad (Tür, Mat, Fen, İnk, Din, İng) ya da ikonla gelir.
- **Rozet metni:** `-ink` tonu, `-soft` zemin üzerinde. Tam renk üzerine beyaz metin AA kontrastını geçmediği için kullanılmaz.
- **Tam renk** sadece şerit (kart kenarı), dolgu (grafik çubuğu, konu haritası hücresi) ve grafik çizgisinde kullanılır.
- **Ders dışı metrikler ders renklerini kullanmaz.** Günün toplam hedef halkası, plan uyumu çubuğu, toplam net grafiği gibi dersten bağımsız göstergeler `--ink-900` (veya hedefe ulaşıldığında `--accent-marker`) kullanır. Aksi halde mavi Matematik, yeşil Fen gibi okunur. Tasarım dosyalarında bu kurala uymayan üç yer vardır ve uygulamada düzeltilecektir: S1/S5 günün hedefi halkası (mavi), V1 plan uyumu çubuğu (yeşil), V1 net grafiğinde son deneme çubuğu (mavi).
- **Türkçe ve hata rengi birbirine yakındır** (`#D14B33` / `#C6352A`). Bu yüzden hata durumları asla sadece renkle gösterilmez: her zaman ikon + açıklayıcı metin + (toast ise) "Tekrar dene" eylemi birlikte kullanılır.

**Veritabanı bağlantısı:** `subjects.color` alanı token önekini tutar: `subject-tr`, `subject-math`, `subject-sci`, `subject-hist`, `subject-rel`, `subject-eng`, `subject-r1` … `subject-r4`.

Tailwind sınıfları derleme zamanında üretildiği için `bg-${color}` gibi dinamik sınıf adları çalışmaz. Bunun yerine ders rengi taşıyan bileşen, kök öğesinde CSS değişkenlerini ayarlar ve içeride sabit sınıflar kullanılır:

```tsx
// src/components/shared/subject-scope.tsx
export function subjectVars(color: string): React.CSSProperties {
  return {
    "--s": `var(--${color})`,
    "--s-soft": `var(--${color}-soft, color-mix(in srgb, var(--${color}) 12%, white))`,
    "--s-ink": `var(--${color}-ink, color-mix(in srgb, var(--${color}) 80%, black))`,
  } as React.CSSProperties;
}
// kullanım: <div style={subjectVars(subject.color)} className="border-l-4 border-subject">
```

Yedek renklerin `-soft` ve `-ink` tonları tanımlı olmadığı için `color-mix` ile türetilir.

## 5. Clay Kullanım Kuralları (öğrenci ve veli)

| Seviye | Nerede |
|---|---|
| `clay-sm` | Ders rozeti, çip, liste kabı, veli özet kartı, küçük istatistik kutusu |
| `clay-md` | Plan görev kartı, ders kartı, birincil düğme, hedef halkası kabı |
| `clay-lg` | Alt panel, diyalog, hızlı kayıt düğmesi, alt menü, masaüstü yan menü |
| `clay-well` (kuyu) | İçerik yüzeyleri: form alanının içi, ilerleme çubuğu yuvası, sayı adımlayıcının değer alanı |
| `clay-pressed` | Basılı durum ve seçili çip/menü öğesi |

- Üç yükseklik seviyesinden fazlası kullanılmaz.
- **Clay kaptır, içerik düzdür.** Uzun metin, liste satırının içi, form alanının içi clay olmaz.
- **Basılı durum:** gölge içe döner (`--clay-pressed`), öğe %3 küçülür, 120 ms.
- **Tamamlanan görev kartı** `clay-md`'den `clay-sm`'e düşer ("işi bitti" hissi), onay kutusu fosforlu sarı olur.
- Koç ekranlarında clay yok; sadece logo kutusu ve öğrenci avatarı `clay-sm` taşır.

## 6. Tipografi

- **Aile:** Lexend, `next/font/google`, alt kümeler `latin` + `latin-ext`, değişken ağırlık (300-700), CSS değişkeni `--font-lexend`. Tasarım bu seçimi korudu: yuvarlak ve geniş harf formları clay diliyle uyumlu, Türkçe karakter seti tam.
- Tüm sayılarda `font-variant-numeric: tabular-nums` (gövdeye global olarak uygulanır).
- Telefonda gövde metni 16 px'in altına inmez. 12-13 px sadece çip, birim ve tablo etiketlerinde.
- Başlıklar cümle düzeninde; büyük harfli, harf aralıklı küçük etiket yok.
- Ağırlıklar: 400 gövde, 500 vurgu, 600 başlık ve sayılar.

## 7. Köşe Yuvarlaklığı

Öğe büyüdükçe yuvarlaklık artar:

| Token | Kullanım |
|---|---|
| `pill` | Çip, rozet, ilerleme çubuğu |
| `xs` (8) | Konu haritası hücresi |
| `sm`-`md` (12-16) | Düğme, giriş alanı, küçük istatistik kutusu |
| `card` (20) | Kart |
| `lg`-`xl` (28-36) | Alt panel, diyalog, alt menü |

Koç tarafında aynı ölçek daha küçük uçtan kullanılır: kart ve tablo kabı `sm`-`md`, düğme ve giriş `xs`-`sm`.

## 8. Responsive Davranış ve Ekranlar

### 8.1 Kırılma noktaları

| Aralık | Tailwind |
|---|---|
| Telefon: < 768 px | varsayılan |
| Tablet: 768-1023 px | `md:` |
| Masaüstü: ≥ 1024 px | `lg:` |

### 8.2 Öğrenci

| Aralık | Menü | İçerik | Hızlı kayıt |
|---|---|---|---|
| Telefon | Alt menü; ortadaki kayıt düğmesi çubuktan 18 px taşar | Tek sütun | Alttan açılan panel |
| Tablet | Alt menü kalır (başparmak erişimi) | İki sütun | Ortada diyalog |
| Masaüstü | Solda 104 px dar clay yan menü; kayıt düğmesi en üstte koyu düğme | İki sütun, en fazla 1240 px, ortalı | Ortada diyalog |

**Menü öğeleri:**
- Telefon alt menüsü: Bugün · Konular · (+) Kayıt · Denemeler · Ben
- Masaüstü yan menüsü: Kayıt · Bugün · Konular · Plan · Denemeler · Yanlışlar · Kaynaklar · Videolar · Ben
- Telefonda Plan'a "Bugün" ekranındaki Planım kartından; Yanlışlar, Kaynaklar ve Videolar'a "Ben" sekmesinden erişilir.

Menüler modül registry'sinden üretildiği için (`nav.student.mobile: true`) bu dağılım tek satırla değiştirilebilir.

**Ekran notları:**
- **S1 / S5 Bugün:** Üstte selamlama, tarih, seri ve LGS geri sayımı. Günün hedefi halkası (86 / 120) + motive edici tek cümle ("34 soru kaldı. Paragrafla kapatabilirsin.") + bugünkü çalışma süresi. Planım listesi. Tekrar zamanı gelenler. Bu hafta özeti. Masaüstünde solda "bugün ne yapacağım" (hedef + plan), sağda "neyi kaçırıyorum" (tekrar + haftalık özet).
- **S2 / S6 Hızlı kayıt:** Ders ve konu son kayıttan hazır gelir, sayıyı girip kaydedilir. Anlık "Toplam 40 · Net 30,00". Masaüstünde klavye akışı: Tab alanlar arası, ↑ ↓ sayı değiştirir, Enter kaydeder, Esc kapatır; bu ipucu diyalogun altında görünür. Sayı adımlayıcı alanı doğrudan yazılabilir, dokunma hedefi 48 × 48 px.
- **S3 / S7 Konu haritası:** Bölüm 9.
- **S4 Haftalık plan:** Pazartesi-Pazar gün seçici (işaretli günlerde nokta), seçili günün görevleri ve toplam süresi, koçun haftalık mesajı, "Haftam nasıl geçti?" alanı (pazar akşamı açılır, koç okur).

### 8.3 Veli

- Telefon öncelikli tek sütun. Masaüstünde aynı içerik ortalanır, en fazla iki sütuna yayılır; yeni bilgi eklenmez.
- **V1 Haftalık özet sırası:** selamlama + hafta seçici → plan uyumu cümlesi ve çubuğu → soru sayısı ve çalışma süresi → son deneme neti ve değişimi → son 5 deneme grafiği → ders bazında haftalık soru → koçun veliye açık son notu.
- **Alt menü:** Özet · Denemeler · Notlar.

> **Kapsam notu:** Tasarımda veli alt menüsünde "Mesajlar" sekmesi ve "koçunuza mesaj yazabilirsiniz" cümlesi var. Mesajlaşma `01-proje-plani.md` Bölüm 12'de kapsam dışıdır. Bu nedenle sekme **"Notlar"** olarak uygulanır (koçun veliye açık notları) ve mesaj cümlesi kaldırılır. Mesajlaşma istenirse önce modül olarak plana eklenir.

### 8.4 Koç

- Masaüstü öncelikli; yan menü 232 px, içerik en fazla 1320 px.
- **Telefonda:** yan menü soldan açılan panele (hamburger) döner, tablo satırları kart listesine döner, plan oluşturucu salt okunurdur ve "Düzenlemek için bilgisayardan açın" notu gösterilir.
- **K1 Ana ekran:** Başlık (Öğrenciler, tarih, LGS geri sayımı) + arama + Filtreler + Yeni öğrenci. "Dikkat gerektirenler" satırlarında uyarının türüne göre **hızlı eylem** düğmesi vardır: hareketsizlik → "Not yaz", net düşüşü → "Planı gözden geçir", birikmiş tekrar → "Tekrar planı kur"; ayrıca "Öğrenciyi aç". Öğrenci tablosu: öğrenci, son giriş, haftalık hedef (ince çubuk + yüzde), son net ve trend, plan uyumu, birikmiş tekrar, satır menüsü.
- **K2 Öğrenci detayı:** Başlıkta sınıf, okul, hedef lise, veli adı, LGS geri sayımı, "Not yaz" ve "Plan hazırla". Sekmeler registry'den. Genel bakışta 5 özet kutusu (bu hafta soru, çalışma süresi, plan uyumu, son net, birikmiş tekrar; her birinin altında karşılaştırma bilgisi), son 14 gün yığılmış soru grafiği, deneme net trendi (toplam + ders çizgileri), sade konu haritası, yanlış nedeni dağılımı, sabitlenmiş not, öğrencinin geçen hafta değerlendirmesi.
- **K3 Plan oluşturucu:** Başlıkta taslak durumu ve otomatik kayıt zamanı, hafta seçici, hafta toplamı (süre + soru), Şablondan başlat, Başka öğrencilere kopyala, Planı yayınla. Solda aranabilir kaynak paneli: zayıf konular (%60 altı başarı veya tekrar gerekli), atanmış kaynaklar, izlenmemiş video listeleri. 7 gün sütunu, gün başlığında tarih ve toplam süre, "Buraya bırak" hedefi, "+ Görev ekle". Altta gün başına süre özeti. **Otomatik taslak kaydı** bu ekranın gereksinimidir.
- **Dar masaüstü:** 1440 px'te 7 sütun sıkışıktır. 1440 px'in altında sol kaynak paneli daraltılabilir olur; 1280 px'in altında gün sütunları yatay kaydırılır.

## 9. Konu Haritası

Uygulamanın imza ekranı. Durumlar üç ayrı kanalla ayrılır: **doluluk, desen ve ikon.** Renk sadece dersi söyler, durumu söylemez.

| Durum | Doluluk | Desen / ikon | Kenarlık |
|---|---|---|---|
| Başlanmadı | Boş (`bg-sunken`) | Yok | Kesikli `line-strong` |
| Çalışılıyor | Alttan %45 ders rengi | Çapraz tarama | Ders rengi, ince |
| Tamamlandı | %100 düz ders rengi | Yok | Yok |
| Oturdu | %100 düz ders rengi | Beyaz onay ikonu + iç beyaz çerçeve | Yok |
| Tekrar gerekli | Alttan %60 ders rengi | Dikey tarama + yenile ikonu | Kesikli ders rengi |
| Seçili (ek durum) | Mevcut durum | `clay-pressed` + belirgin çerçeve | 2 px `ink-900` |

**Yerleşim:**
- **Telefon:** Her ders ayrı clay kart; başlıkta ders adı ve tamamlanma yüzdesi, altında ince ilerleme çubuğu. Hücre 44 × 44 px, satırlar **sarmalanır** (yatay kaydırma yok). Seçili hücrenin detayı alttan panel: konu, soru sayısı, başarı yüzdesi, son çalışma, durum, "Tekrar ettim" ve "+" (bu konuya kayıt ekle).
- **Masaüstü:** Tüm dersler 13 sütunlu tek ızgarada, hücre 52 px, satırların sağı ders uzunluğuna göre boş kalır. Detay sağ yan panelde: yukarıdakilere ek olarak yanlış defterindeki soru sayısı ve bağlı kaynaklar/videolar. Ok tuşlarıyla hücreler arasında gezinilir.
- **Koç (sade):** Aynı durum kanalları, clay yok, hücreler daha küçük; satır sonunda yüzde.
- Sütun sayısı sabit 13 değildir; en uzun dersin konu sayısından hesaplanır.

## 10. Bileşen Envanteri

`tasarim-sistemi.html` Bölüm 6'daki bileşenler. Her biri `data-surface`'e göre clay veya sade görünür.

| Bileşen | Konum | Not |
|---|---|---|
| `Button` (primary, secondary, ghost) | `components/ui` | Durumlar: normal, hover, basılı, odak, devre dışı. Tasarım dosyasında koç ghost düğmesi `--subject-math-ink` (mavi) kullanır; Bölüm 4.2 gereği uygulamada `--ink-700` + altı çizili (öğrenci ghost ile aynı). |
| `Input`, `Select` | `components/ui` | Clay'de kap clay, alan içi `clay-well` |
| `formatNamePossessive` | `lib/format` | Faz 6b: ad + ilgi hali (`Ayşe'nin`, `Mehmet'in`, `Can'ın`); veli başlığı "…'nin bu haftası" — ek elle yazılmaz |
| `NumberStepper` | `components/shared` | − / + düğmeli, doğrudan yazılabilir, ↑ ↓ destekli; koç için kompakt D/Y/B/Net satırı; `dense` (deneme sihirbazı): etiket solda, 36 px düğme + 44 px dokunma alanı, iki adımlayıcı telefonda yan yana (< 390 px etiket üstte) |
| `SubjectBadge`, `SubjectStripe` | `components/shared` | `subjectVars()` ile |
| `GoalRing`, `ProgressBar` | `components/shared` | Hedefe ulaşınca fosforlu + "hedef tamam" metni |
| `PlanTaskCard` | `features/planner` | Bekliyor / tamamlandı; koç sürümü sürüklenebilir + "Buraya bırak" hedefi |
| `TopicMasteryCell`, `TopicMap` | `features/topics` | Bölüm 9 |
| `StreakBadge`, `AchievementBadge`, `CountdownChip` | `components/shared` | Rozet ve seri sadece `clay`; koçta veri olarak ("Seri 12 gün") |
| `StudentBottomNav`, `StudentRail` | `components/layout` | Registry'den |
| `CoachSidebar` | `components/layout` | Telefonda soldan panel, `shadow-pop` |
| `DataTable` | `components/shared` | Koç; telefonda kart listesine döner |
| `AlertRow` | `features/analytics` | Uyarı kenarı + hızlı eylem düğmesi |
| `EmptyState` | `components/shared` | Başlık, tek cümle, eylem düğmesi |
| `Toast` | sonner teması | Başarı: "Kaydedildi. Bugün 34 soru kaldı." Hata: ikon + "Kaydedilemedi. Tekrar dene." + eylem |
| `BottomSheet` / `Dialog` | `components/ui` | < 768 px alt panel, ≥ 768 px diyalog; aynı API (`ResponsiveSheet`) |
| `StatTile` | `components/shared` | Büyük sayı + kısa açıklama (+ isteğe bağlı karşılaştırma satırı) |
| `MistakeForm`, `MistakeList`, `MistakeDetail`, `ReasonDistribution` | `features/mistakes` | Faz 6b: fotoğraf alanı en üstte (kamera/galeri, canvas sıkıştırma, önizleme + Kaldır), fotoğrafsızken not alanı ipuçlu, fotoğrafla "Not ekle" katlanır; ders/neden çipleri `radiogroup`; liste kartı küçük görsel / ders ikonu, nötr neden rozeti (`Badge`), çözülen kayıtta fosforlu "Çözüldü" (tamamlanan görev kuralı); filtre çipleri URL bağlantısı (`aria-pressed`), neden çipleri "Nedene göre" katlanır; koç dağılımı `ink-900` yatay çubuklar (ders rengi yok) |
| `StudentPicker` | `components/shared` | Faz 7: kaynak/liste atama paneli (`ResponsiveSheet`, onay kutuları; atanmışlar işaretli + devre dışı; "N öğrenciye ata") |
| `ResourceForm`, `SectionEditor`, `StudentResourceList/Detail` | `features/resources` | Faz 7a: ad alanında benzer ad önerisi ("Bunu mu demek istedin?"), tür/ders çipleri (`radiogroup`), test partisi ("Test 1–40, her biri 20 soru", canlı önizleme); editörde çoklu seçim → "Konuya eşle", ↑↓; öğrenci kartlarında `ProgressBar` (`ink-900`, ders rengi ve fosforlu yok), test satırı dokununca hızlı kayıt `section` ön dolgusu (Boş otomatik) |
| `PlaylistForm`, `VideoEditor`, `StudentPlaylistPlayer` | `features/videos` | Faz 7b: "YouTube listesi" / "Elle liste kur" çipleri (anahtar yoksa nötr not); editörde konuya eşle, video ekle, Listeyi yenile (küçük resim yok, D15); oynatıcı `youtube-nocookie` iframe 16:9, "İzledim" `aria-pressed`, not, sonraki video; izlenen satır nötr onay ikonu (fosforlu yalnızca plan kartında) |
| `LineChart` | `components/shared/line-chart` | Faz 6a (karar C1): saf SVG çizgi grafiği; `viewBox` genişliği kabın ölçülen genişliği (`ResizeObserver`; metin telefonda küçülmez), x eşit aralıklı (etiket sayısı genişliğe göre 3–6), y `niceCeil`; seri çipleri (`checkbox`, en az biri açık; toplam `ink-900` 3 px, dersler `var(--s)` 1,5 px), `secondaryToggle` ile `defaultOn` olmayan seriler < md "Dersleri göster" arkasında (grafik ilk ekranda), nokta seçimi dokunma/←→/Home/End, `aria-live` detay kutusu, `<figure aria-label={özet}>` + sr-only tablo; hareket yok. Dört noktadan azsa çağıran kart listesi çizer |

## 11. Hareket

- **Basılma:** 120 ms, gölge içe döner, %3 küçülme (sadece clay).
- **Görev tamamlandı:** fosforlu kalem soldan sağa 220 ms'de çizilir, kart `clay-md` → `clay-sm`.
- **Alt panel / diyalog** açılış-kapanış geçişi.
- **Sürükle-bırak (koç):** sürüklenen kart `shadow-drag` + hafif eğim, hedef "Buraya bırak" kesikli kutusu.
- Sayfa açılışında kademeli giriş animasyonu, konfeti, parıltı yok.
- `prefers-reduced-motion: reduce` durumunda tüm geçişler kapanır.

## 12. Yazım Dili

| Kitle | Hitap | Örnek |
|---|---|---|
| Öğrenci | Sen, samimi, kısa | "Kaydedildi. Bugün 34 soru kaldı." / "34 soru kaldı. Paragrafla kapatabilirsin." |
| Veli | Siz, bilgilendirici | "Elif bu hafta planının %80'ini tamamladı." |
| Koç | Nötr, işlevsel | "Plan 3 öğrenciye kopyalandı." |

- Düğme eylemi söyler: "Kaydet", "Planı yayınla", "Tekrar ettim", "Tekrara başla". "Tamam", "Gönder" yok.
- Eylemin adı akış boyunca aynı kalır: "Planı yayınla" → "Plan yayınlandı".
- Hata mesajı ne olduğunu ve ne yapılacağını söyler, özür dilemez.
- Boş durum eylem önerir: "Henüz deneme eklemedin. İlk denemeni ekle, net takibin başlasın."
- Performans dili yargılamaz: "Hedefin gerisindesin" değil, "180 soru kaldı".
- Öğrenciler arası sıralama veya karşılaştırma öğrenci ve veli ekranlarında yok.

### 12.1 Sayı ve tarih biçimi

- Metinde Türkçe biçim: `71,33 net` · `1.250 soru` · `%80` · `14 sa 20 dk` · `16 Eylül` · `14 – 20 Eylül`.
- **Biçimlenmiş metin ile hesap/CSS değeri ayrı tutulur.** `%86` sadece ekranda gösterilir; çubuk genişliği gibi CSS değerlerine ham sayı (`86%`) verilir. (Tasarım dosyasında koç tablosundaki hedef çubukları bu yüzden yanlış görünür: `width:%86` geçersiz CSS'tir.)
- **Sayı ile birim arasında bölünmeyen boşluk (U+00A0)** vardır (`14 sa 20 dk`, `1.250 soru`, `71,33 net`, `16 Eylül`); satır sonunda sayı ile birim ayrılmaz. Birim `lib/format`'a parametre olarak verilir (`formatCount(1250, "soru")`) ya da `withUnit()` ile eklenir; hafta aralığı yalnızca dash çevresinde kırılabilir.
- **Negatif sayılar tipografik eksi (U+2212) ile** yazılır: `−4,33`, `−0,50`; tire (`-`) kullanılmaz. Değişim ve trend değerleri işaretlidir: `+3,67` / `−0,50`, sıfırda işaret yok (`0,00`). `Intl` çıktısındaki işaret `lib/format` içinde normalize edilir.
- Tüm biçimlendirme `lib/format` üzerinden: `formatPercent`, `formatNet`, `formatSigned`, `formatCount`, `formatDuration`, `formatDateTr`, `formatWeekRange`.

## 13. Erişilebilirlik

- WCAG AA kontrast. Pastel zemin üzerinde soluk gri metin yok; ikincil metin en açık `--ink-500`.
- Dokunma hedefi en az 44 × 44 px (sayı adımlayıcıda 48). Koç (flat) yüzeyinde düğme, giriş ve diyalog kapat düğmesi fare/iz sürücüde görsel olarak 38 px'tir; dokunmatik cihazlarda (`pointer-coarse:`) en az 44 px'e çıkar.
- Görünür odak halkası: `--focus-ring` / `--focus-offset`, her iki yüzey dilinde.
- Bilgi sadece renkle verilmez (ders kısa adı, desen, ikon, metin).
- Masaüstünde kritik akışlar klavyeyle yapılabilir (hızlı kayıt, konu haritasında ok tuşları, plan oluşturucuda sürükle-bırakın klavye alternatifi: dnd-kit klavye sensörü).
- Grafiklerin ekran okuyucu için metin özeti ("Beş denemede toplam net 13 puan arttı.").
- Seri ateşi emoji değil, lucide `Flame` ikonu; ikonlar yanında metin veya `aria-label`.

## 14. Sonraki Tasarım Turu İçin Açık Konular

- [ ] Koyu tema (clay gölgelerinin koyu zeminde karşılığı dahil)
- [ ] Öğrenci: Denemeler, Yanlış defteri, Kaynaklar, Videolar, Ben ekranları (Faz 6–7 uygulama görüntüleri `docs/tasarim/uygulama-6/`, `uygulama-7/`)
- [ ] Koç: Şablon editörü, Kaynak ve video katalogları, Deneme kataloğu ve karşılaştırma, Ayarlar (Faz 7 uygulama görüntüleri `docs/tasarim/uygulama-7/`)
- [ ] Giriş, davet ve KVKK onay ekranları
- [ ] Veli: Denemeler ve Notlar sekmeleri
- [ ] Boş durum illüstrasyonları (özgün SVG)
