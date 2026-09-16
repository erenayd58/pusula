# Claude Code ile Geliştirme Rehberi

Bu rehber, projeyi VS Code içinde Claude Code ile faz faz nasıl inşa edeceğinizi anlatır.

## 1. Başlamadan Önce

### 1.1 Hesaplar

| Hesap | Ne için | Not |
|---|---|---|
| GitHub | Kod deposu, CI, yedekleme | Depo **özel (private)** olmalı |
| Vercel | Uygulama barındırma | GitHub ile giriş yapın |
| Supabase | Veritabanı, giriş, depolama | İki proje açın: `pusula-staging` ve `pusula-prod`, ikisi de **Frankfurt (eu-central-1)** bölgesinde |
| Google Cloud | YouTube Data API anahtarı | Faz 5'te gerekir; anahtarı sadece YouTube Data API v3 ile sınırlandırın |

### 1.2 Bilgisayarınıza kurulacaklar

- Node.js (güncel LTS sürümü)
- pnpm (`npm install -g pnpm`)
- Docker Desktop (Supabase'i yerelde çalıştırmak için)
- Supabase CLI
- VS Code + Claude Code eklentisi
- Git

### 1.3 Depoyu hazırlama

```bash
mkdir pusula && cd pusula
git init
# Bu paketteki CLAUDE.md dosyasını köke, docs/ klasörünü olduğu gibi kopyalayın
git add . && git commit -m "docs: proje planı ve mimari belgeleri"
```

GitHub'da özel bir depo açıp bu klasörü bağlayın.

## 2. Çalışma Döngüsü (Her Faz İçin)

```
┌─ 1. Yeni dal aç ─────────────── git switch -c faz-2-mufredat
│
├─ 2. Yeni Claude Code oturumu ── Önceki fazın sohbet geçmişi taşınmaz;
│                                  bilgi CLAUDE.md ve docs/ içinden okunur.
│
├─ 3. Önce plan iste ──────────── Aşağıdaki faz istemini yapıştırın.
│                                  Claude plan çıkarsın, KOD YAZMASIN.
│
├─ 4. Planı gözden geçir ──────── Eksik veya belgeyle çelişen yeri düzeltin, onaylayın.
│
├─ 5. Katman katman uygula ────── Veritabanı → RLS testleri → sunucu (queries/actions)
│                                  → arayüz → birim/e2e testleri
│                                  Her katman sonunda: pnpm check && pnpm db:test
│
├─ 6. Elle dene ───────────────── Kabul kriterlerini üç rolle tek tek deneyin.
│
├─ 7. Belgeleri güncelle ──────── Yol haritası kutucukları, karar kaydı, veri modeli farkları.
│
└─ 8. PR → önizleme → birleştir ─ Vercel önizleme linkinde test → main → supabase db push
```

### Verimli çalışma ipuçları

- **Bir oturumda bir faz, bir fazda bir katman.** Büyük fazları (1, 3, 6, 8) alt görevlere bölün ve her birini ayrı istekle yaptırın.
- **Önce testler.** Yeni tablolar için Claude'dan önce RLS testlerini yazmasını, sonra politikaları yazmasını isteyin. Güvenlik açığını en ucuz burada yakalarsınız.
- **Tasarımı gösterin.** Arayüz işlerinde istemde ilgili `docs/tasarim/ekran-goruntuleri/*.png` dosyasını belirtin; Claude Code görüntüyü okuyabilir. Bittiğinde uygulamanın ekran görüntüsünü alıp tasarımla karşılaştırmasını isteyin.
- **Ekran görüntüsü paylaşın.** Arayüz beklediğiniz gibi değilse ekran görüntüsünü sohbete ekleyip neyin yanlış olduğunu söyleyin.
- **Hata çıktısını olduğu gibi yapıştırın.** "Çalışmıyor" yerine terminal çıktısı veya tarayıcı konsol hatası.
- **Gizli anahtarları asla sohbete yapıştırmayın.** `.env.local` dosyasını kendiniz doldurun.
- **Belgeyle çelişki varsa belgeyi güncelleyin.** Claude belgeden farklı bir şey önerirse ve siz kabul ediyorsanız, önce ilgili `docs/` dosyasını güncelletin.
- **Sık commit.** Her çalışan adımda commit; geri dönmek kolaylaşır.

## 3. Faz İstemleri

Her istemi yeni bir oturumun başında kullanın. Köşeli parantez içindekileri kendi durumunuza göre düzenleyin.

### Faz 0: Temel Kurulum

```
CLAUDE.md, docs/01-proje-plani.md, docs/02-mimari.md ve docs/04-tasarim-sistemi.md
belgelerini oku. docs/tasarim/ekran-goruntuleri/tasarim-sistemi.png görüntüsüne bak.

Ortam: Windows, VS Code terminali PowerShell. Komutları buna göre öner.

Faz 0'ı (Temel Kurulum) uygulamak için bir plan çıkar, henüz kod yazma:
- Next.js 16 (App Router, TypeScript strict, src/ dizini) projesini pnpm ile bu
  klasörün köküne kur. create-next-app dolu klasöre kurulum yapmazsa geçici bir
  klasörde oluşturup dosyaları köke taşı. docs/, CLAUDE.md ve README.md'ye dokunma.
- Tailwind v4 + shadcn/ui. 04 Bölüm 3'teki token'ları (:root + iki @theme bloğu),
  Lexend'i (next/font, latin + latin-ext, --font-lexend) ve tabular rakamları
  globals.css'e işle. Clay yardımcılarını @utility ile tanımla.
- data-surface="clay | clay-calm | flat" mekanizması: SurfaceRoot bileşeni ve
  Button, Card, Input, Badge, Dialog bileşenlerinin iki yüzey varyantı.
- subjectVars() yardımcısı ve SubjectBadge / SubjectStripe (04 Bölüm 4.2).
- lib/format (formatPercent, formatNet, formatCount, formatDuration, formatDateTr,
  formatWeekRange) + birim testleri.
- 02-mimari.md Bölüm 2'deki klasör iskeleti (boş klasörlerde .gitkeep).
- ESLint (flat config + modül sınırı kuralları), Prettier, Vitest, Playwright.
- Supabase CLI'yi geliştirme bağımlılığı olarak ekle, supabase/ klasörünü başlat.
- package.json betikleri (02-mimari.md Bölüm 9), supabase komutları pnpm üzerinden.
- .env.example, .gitignore kontrolü, .github/workflows/ci.yml, dependabot.yml.
- Sadece geliştirme ortamında açılan /dev/design sayfası: docs/tasarim/tasarim-sistemi.html
  içindeki renkler, clay seviyeleri, tipografi ve temel bileşenler, öğrenci (clay) ve
  koç (flat) varyantları yan yana. Tasarım dosyasıyla karşılaştırılarak doğrulanacak.

Planı adım adım listele, her adımın nasıl doğrulanacağını yaz ve onayımı bekle.
```

### Faz 1: Kimlik, Roller ve Modül Altyapısı

Bu fazı üç ayrı oturuma bölmeniz önerilir.

**1a. Veritabanı ve RLS**

```
CLAUDE.md, docs/02-mimari.md ve docs/03-veri-modeli.md belgelerini oku.

Faz 1'in veritabanı katmanını planla:
- Enum tipleri (sadece bu fazda gerekenler), organizations, profiles, students,
  student_parents, invitations, consents, student_modules tabloları.
  (students.curriculum_template_id FK'sı Faz 2'de eklenecek; şimdilik nullable kolon.)
- private şemasındaki yardımcı fonksiyonlar (03-veri-modeli.md Bölüm 5.1).
- RLS politikaları (Bölüm 5.3 matrisi).
- ÖNCE pgTAP testleri: Bölüm 5.4'teki 5 senaryonun her tablo için testi.
- seed.sql: 1 kurum, 1 owner, 1 koç, 3 öğrenci, 2 veli.
- pnpm db:types ile tip üretimi.

Testleri yazıp başarısız olduklarını gördükten sonra politikaları yaz.
```

**1b. Kimlik doğrulama akışları**

```
CLAUDE.md ve docs/02-mimari.md (Bölüm 4) ile docs/01-proje-plani.md (Bölüm 8 ve 9)
belgelerini oku.

Planla ve uygula:
- lib/supabase (client, server, admin, proxy), src/proxy.ts ile oturum yenileme ve
  rol bazlı yönlendirme.
- lib/auth: getSessionUser (React cache), requireRole, username ↔ sentetik e-posta.
- lib/actions/create-action.ts ve lib/result.ts.
- /login: tek alan hem kullanıcı adı hem e-posta kabul eder.
- Koç: /coach/students/new formu (ad, kullanıcı adı, geçici şifre, sezon, sınav tarihi)
  → admin istemcisiyle Auth kullanıcısı + profiles + students satırları.
- Koç: öğrenci şifresi sıfırlama.
- Koç: veli davet kodu üretme. /invite/[code]: veli kaydı → /consent (KVKK onayı,
  consents tablosuna kayıt) → veli paneli.
- Koçun kâğıt onayı sisteme işleyebilmesi.
- Playwright: koç öğrenci oluşturur → öğrenci giriş yapar; veli davetle kayıt olur.

Önce Supabase'in güncel Next.js SSR rehberine göre anahtar adlarını ve istemci
kurulumunu doğrula.
```

**1c. Modül sistemi ve uygulama kabukları**

```
CLAUDE.md ve docs/02-mimari.md (Bölüm 3) ile docs/04-tasarim-sistemi.md belgelerini oku.

Planla ve uygula:
- src/modules: defineModule, registry, getEnabledModules, requireModule.
- Çekirdek modül manifesti (core).
- Öğrenci kabuğu (data-surface="clay"): telefon ve tablette StudentBottomNav (ortada
  taşan hızlı kayıt düğmesi için yer tutucu), masaüstünde 104 px StudentRail. Menü
  öğeleri 04 Bölüm 8.2'deki gibi, registry'den üretilir.
- Koç kabuğu (data-surface="flat"): 232 px CoachSidebar, telefonda soldan açılan panel;
  /coach/students listesi (şimdilik ad + durum), /coach/students/[studentId] layout'u
  ve sekmeler (registry'den). Görsel referans: docs/tasarim/ekran-goruntuleri/koc-masaustu.png
- Veli kabuğu (data-surface="clay-calm"): alt menü Özet · Denemeler · Notlar; çocuk
  seçimi, tek çocuksa yönlendirme.
- ResponsiveSheet: < 768 px alt panel, ≥ 768 px diyalog, aynı API.
- /coach/students/[studentId]/modules: modül aç/kapat (dependsOn kontrolü ile).
- Boş durum ekranları (EmptyState).
- Birim testleri: registry filtreleme, bağımlılık çözümleme.
```

### Faz 2: Müfredat Şablonları ve Konu Takibi

```
CLAUDE.md, docs/03-veri-modeli.md (Bölüm 4.2) ve docs/05-lgs-2027-sablonu.md
belgelerini oku.

Faz 2'yi planla:
- curriculum_templates, subjects, topics, student_topic_progress + RLS + pgTAP testleri.
- students.curriculum_template_id FK'sını ekle.
- supabase/seeds/lgs-2027-template.sql (05 belgesindeki içerik, kurum ayarları dahil).
- copy_curriculum_template fonksiyonu (katalog kopyalama parametresi şimdilik yok sayılır).
- features/topics modülü:
  - Koç: /coach/templates liste, şablon detay editörü (ders ve konu ekle, düzenle,
    sürükle-bırak sırala, alt konu), şablon kopyala.
  - Öğrenci: /student/topics (ders kartları + tamamlanma yüzdesi),
    /student/topics/[subjectId] (konu listesi, durum ve güven puanı değiştirme,
    tembel satır oluşturma).
  - Koç öğrenci sekmesi: öğrencinin konu durumları (salt okunur + düzenleme).
  - Tekrar tarihi hesaplama saf fonksiyonu + birim testi.
- Widget: studentToday için "tamamlanan konu" özeti.
```

### Faz 3: Soru Takibi, Hedefler, Bugün Ekranı (MVP)

```
CLAUDE.md, docs/01-proje-plani.md (Bölüm 6.1), docs/03-veri-modeli.md (Bölüm 4.3, 6, 7)
ve docs/04-tasarim-sistemi.md (Bölüm 5, 8.2, 8.4, 10) belgelerini oku. Görsel referans:
docs/tasarim/ekran-goruntuleri/ogrenci-telefon.png (S1, S2), ogrenci-masaustu.png (S5, S6)
ve koc-masaustu.png (K1, K2 üst kısım).

Faz 3'ü üç parçada planla:

A) Veri: question_logs, goals + RLS + testler; v_student_daily_summary,
   v_student_subject_weekly, v_coach_student_overview (şimdilik sadece bu fazın
   verileriyle); goal_progress ve student_streak fonksiyonları + testler.

B) Öğrenci:
   - Hızlı kayıt (ResponsiveSheet + NumberStepper): son ders/konu hatırlanır, net
     anlık gösterilir, telefonda 3 dokunuşta kayıt; masaüstünde Tab / ↑ ↓ / Enter / Esc
     klavye akışı.
   - /student/log: geçmiş kayıtlar (gün gruplu), düzenleme, silme.
   - /student/goals: hedef çubukları.
   - /student/today: geri sayım, seri, GoalRing (ders dışı metrik: ink-900, hedefe
     ulaşınca fosforlu + "hedef tamam"), modül widget'ları; masaüstünde iki sütun.

C) Koç:
   - Hedef atama formu (metrik, dönem, ders, değer).
   - /coach: öğrenci tablosu (v_coach_student_overview, tek sorgu); telefonda kart listesi.
   - Öğrenci genel bakış: son 14 gün soru grafiği, ders dağılımı, hedef durumu.
   - Sorular sekmesi: filtrelenebilir kayıt tablosu.

Playwright: öğrenci hızlı kayıt → hedef çubuğu güncellenir → koç listesinde görünür.
```

### Faz 4: Haftalık Plan, Notlar, Duyurular

```
CLAUDE.md, docs/03-veri-modeli.md (Bölüm 4.4, 5.3, 7) ve docs/04-tasarim-sistemi.md
(Bölüm 8.2 S4, 8.4 K3) belgelerini oku. Görsel referans: ogrenci-telefon.png (S4) ve
koc-masaustu.png (K3).

Faz 4'ü planla:
- weekly_plans, plan_items, plan_templates, coach_notes, meetings, announcements
  + RLS + testler; question_logs.plan_item_id FK'sı.
- complete_plan_item ve copy_weekly_plan fonksiyonları + testler.
- features/planner:
  - Koç plan oluşturucu: 7 günlük sütun, dnd-kit ile sürükle-bırak (klavye sensörü
    dahil), sol panelde zayıf konular / atanmış kaynaklar / video listeleri, öğe türüne
    göre form, otomatik taslak kaydı, yayınla, şablondan başlat, şablon olarak kaydet,
    başka öğrencilere kopyala, gün ve hafta süre toplamları. 1440 px altında sol panel
    daraltılabilir, 1280 px altında sütunlar yatay kayar.
  - Öğrenci /student/plan: günlere göre liste; "Tamamla" soru türündeyse hızlı kayıt
    panelini plandan ön doldurulmuş açar; hafta sonu değerlendirme alanı.
  - Bugün ekranı widget'ı: bugünün görevleri.
- features/coach-notes: not listesi, görünürlük seçimi, sabitleme; görüşme kaydı ve
  aksiyon maddeleri.
- features/announcements: koç oluşturur, hedef kitle seçer; öğrenci/veli görür.
```

### Faz 5: Kaynaklar ve Videolar

```
CLAUDE.md ve docs/03-veri-modeli.md (Bölüm 4.5) belgelerini oku.

Faz 5'i planla:
- Kaynak ve video tabloları + RLS + testler; question_logs.section_id FK'sı;
  v_student_resource_progress, v_student_playlist_progress.
- features/resources:
  - Koç katalog: kaynak ekle, bölüm/test listesi (toplu ekleme: "Test 1-40, her biri
    20 soru" gibi hızlı üretim), bölümleri konulara eşleme, öğrenciye atama.
  - Öğrenci: kaynak kartları ve yüzdeler, kaynak detayında test listesi; test
    işaretleme hızlı kayıt panelini section_id ile açar.
- features/videos:
  - Sunucu tarafında YouTube Data API ile oynatma listesi içe aktarma (sayfalama,
    süre bilgisi, hata ve kota durumları için Türkçe mesaj).
  - Videoları konulara eşleme, öğrenciye atama.
  - Öğrenci: liste ilerlemesi, youtube-nocookie gömülü oynatıcı, izlendi işareti,
    video notu.
- copy_curriculum_template fonksiyonuna katalog kopyalamayı ekle.
```

### Faz 6: Denemeler, Yanlış Defteri, Tekrar, Konu Haritası

```
CLAUDE.md, docs/03-veri-modeli.md (Bölüm 4.6, 6, 8) ve docs/04-tasarim-sistemi.md
(Bölüm 9) belgelerini oku. Görsel referans: ogrenci-telefon.png (S3), ogrenci-masaustu.png
(S7), koc-masaustu.png (K2 konu haritası ve yanlış nedeni dağılımı).

Faz 6'yı dört parçada planla:
A) Denemeler: tablolar + RLS + testler, save_mock_exam_result, v_mock_exam_trend.
   Öğrenci giriş sihirbazı (deneme seç veya serbest başlık → ders ders D/Y/B →
   isteğe bağlı yanlış konuları → özet). Net trend grafiği. Koç: deneme kataloğu,
   aynı denemede öğrenci karşılaştırma tablosu.
B) Yanlış defteri: mistakes tablosu, storage bucket ve politikaları, istemci tarafı
   sıkıştırma, fotoğraf çekme/yükleme, hata nedeni seçimi, filtreli liste. Koç:
   hata nedeni dağılım grafiği.
C) Tekrar sistemi: v_review_queue, mark_reviewed, pg_cron refresh_review_queue.
   Öğrenci /student/review ve Bugün widget'ı.
D) Konu haritası: v_topic_mastery, TopicMasteryCell (5 durum + seçili; doluluk, desen,
   ikon), telefonda sarmalanan ders kartları + alt panel detayı, masaüstünde tek ızgara
   + sağ yan panel + ok tuşlarıyla gezinme, koç için sade sürüm, zayıf konular listesi.
```

### Faz 7: Veli Paneli, Bildirimler, Uyarılar

```
CLAUDE.md, docs/01-proje-plani.md (Bölüm 5, 7), docs/03-veri-modeli.md (Bölüm 4.7, 7)
ve docs/04-tasarim-sistemi.md (Bölüm 8.3, 8.4 K1) belgelerini oku. Görsel referans:
veli-telefon.png (V1). Tasarımdaki "Mesajlar" sekmesi "Notlar" olarak uygulanır.

Faz 7'yi planla:
- notifications tablosu + RLS; üst barda bildirim zili ve okundu işaretleme.
- Olay bazlı bildirimler: plan yayınlandı, not eklendi, duyuru.
- private.detect_alerts ve pg_cron işi; v_coach_student_overview.alerts alanını
  kurum ayarlarındaki eşiklerle tamamla; koç ana ekranında "Dikkat gerektirenler" ve
  uyarı türüne göre hızlı eylem düğmeleri.
- Kurum ayarları sayfası: uyarı eşikleri, tekrar aralıkları, sıralama tablosu.
- Veli paneli: her modülün parentSummary widget'ı, can_view_details'e göre detaylar,
  veliye açık notlar.
- private.generate_weekly_summaries + pg_cron; veli ve öğrenci için haftalık özet
  bildirimi.
- (İsteğe bağlı) Resend ile haftalık özet e-postası.
```

### Faz 8: Deneyimi Zenginleştirme

Her modülü ayrı oturumda yapın.

```
CLAUDE.md, docs/02-mimari.md (Bölüm 3) ve docs/03-veri-modeli.md (Bölüm 4.8)
belgelerini oku.

[MODÜL ADI] modülünü planla ve uygula: tablo + RLS + testler, module.ts manifesti,
öğrenci/koç/veli ekranları ve widget'ları. Modül kapatıldığında menüde, panelde ve
rotalarda hiç görünmediğini test et.

Sıra önerisi: PWA (Serwist, manifest, ana ekrana ekleme, çevrimdışı ekranı) →
study-timer → checkins → reading → achievements → target-schools → school-exams →
yazdırılabilir veli görüşmesi raporu → web push.
```

### Faz 9: Sağlamlaştırma

```
Tüm docs/ belgelerini oku ve projeyi denetle:
- Her tablonun RLS'si ve pgTAP testi var mı? Eksikleri listele.
- Modül sınırı ihlalleri (ESLint), kullanılmayan kod, any tipleri.
- Yavaş sorgular: görünümlerin EXPLAIN çıktıları, eksik indeksler.
- Erişilebilirlik: klavye ile tüm kritik akışlar, kontrast, ekran okuyucu etiketleri.
- Playwright ile kritik akışların tamamı.
- Sentry kurulumu.
- backup.yml ve keepalive.yml iş akışları; yedekten boş bir Supabase projesine geri
  yükleme adımlarını docs/yedekleme.md olarak belgele.
Önce bulguları önem sırasına göre raporla, sonra onayımla düzelt.
```

## 4. Sık Kullanılan Ek İstemler

**Yeni bir modül eklemek (ileride):**

```
docs/02-mimari.md Bölüm 3'e uyarak "[modül adı]" adında yeni bir modül tasarla.
Önce 01-proje-plani.md modül kataloğuna ve 03-veri-modeli.md'ye eklenecek kısımları
öner, onaylarsam uygula.
```

**Kod incelemesi:**

```
Bu daldaki değişiklikleri main ile karşılaştır. CLAUDE.md kurallarına, RLS
kapsamına, modül sınırlarına ve 04-tasarim-sistemi.md yazım diline uygunluğu denetle.
Bulguları önem sırasıyla listele.
```

**Yeni sezon hazırlığı:**

```
LGS 2027 şablonunu "LGS 2028" olarak kopyalamak için adımları uygula. Ardından MEB'in
2028 için yayımladığı değişikliklere göre güncellenmesi gereken alanları (dersler,
konular, scoring) listele; değişiklikleri koç panelinden mi migration ile mi yapmamız
gerektiğini öner.
```
