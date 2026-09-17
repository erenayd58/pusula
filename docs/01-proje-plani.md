# Pusula: LGS Çalışma Takip ve Koçluk Platformu

> Çalışma adı "Pusula"dır, istediğiniz zaman değiştirilebilir. Bu belge projenin "ne" ve "neden" kısmını anlatır. "Nasıl" kısmı için `02-mimari.md` ve `03-veri-modeli.md` belgelerine bakın.

## 1. Amaç

8. sınıf öğrencisinin LGS hazırlık sürecinin tamamını (konu, kaynak, video, soru, deneme, yanlış, plan, hedef) tek bir yerden yönetebildiği; koçun tüm öğrencilerini tek ekranda izleyip müdahale edebildiği; velinin ise süreci sade bir özetle takip edebildiği bir web uygulaması.

Başarı ölçütleri:

- Öğrenci günlük soru kaydını **30 saniyenin altında** girebilmeli (3 dokunuş kuralı).
- Koç, pazartesi sabahı **tek ekrana bakarak** hangi öğrenciyle önce ilgilenmesi gerektiğini görebilmeli.
- Yeni bir öğrenci **5 dakikada** sisteme alınıp çalışmaya başlayabilmeli.
- Yeni bir sezon (ör. 2028 yeni soru modeli) **kod değiştirmeden**, sadece şablon düzenleyerek hazırlanabilmeli.

## 2. Bağlam: Neden "generic" olmak zorunda?

2026-2027 öğretim yılında 8. sınıfa geçen öğrenciler Haziran 2027 LGS'sine girecek. Bu sınav mevcut düzende yapılacak: sözel bölümde 50, sayısal bölümde 40 olmak üzere toplam 90 soru. Ancak MEB, Türkiye Yüzyılı Maarif Modeli'ne uyumlu yeni soru modelinin **2028 LGS'de** uygulanacağını açıkladı. Yani bir sonraki öğrenci grubunuzun konu yapısı ve soru tipi farklı olacak.

Bu yüzden şu kurallar mimarinin temelidir:

- Dersler, konular, soru sayıları, net hesaplama kuralı (kaç yanlış bir doğruyu götürür) **koda gömülmez, veritabanında şablon olarak durur.**
- Her yıl için şablon kopyalanıp düzenlenir; eski sezonun verileri bozulmaz.
- Aynı altyapı ileride 5-7. sınıflar, bursluluk sınavları ve hatta YKS için kullanılabilir.

## 3. Kullanıcılar ve Roller

| Rol | Kim | Ana cihaz | Ne ister |
|---|---|---|---|
| **Kurum sahibi (owner)** | Siz | Masaüstü | Her şeyi görmek, koç eklemek, şablon ve kaynak kataloğunu yönetmek |
| **Koç (coach)** | Siz veya ileride ekip arkadaşlarınız | Masaüstü | Kendi öğrencilerini izlemek, plan atamak, not yazmak |
| **Öğrenci (student)** | 13-14 yaş | Telefon (ağırlıklı) | Hızlı kayıt, bugün ne yapacağını görmek, ilerlemesini hissetmek |
| **Veli (parent)** | Anne, baba veya vasi | Telefon | Haftalık özet, deneme sonuçları, koçun notları |

Yetki özeti (detayı `03-veri-modeli.md` içindeki RLS matrisinde):

| Veri | Öğrenci | Koçu | Veli | Owner |
|---|---|---|---|---|
| Kendi çalışma kayıtları | Okur/yazar | Okur/yazar | Okur (özet) | Okur/yazar |
| Haftalık plan | Okur, tamamlar | Oluşturur | Okur | Tümü |
| Koç notları | Görünürlüğü "öğrenci" olanlar | Tümü | Görünürlüğü "veli" olanlar | Tümü |
| Yanlış defteri fotoğrafları | Okur/yazar | Okur | Varsayılan kapalı | Okur |
| Şablonlar, kaynak kataloğu | Okur | Okur (düzenleme owner izniyle) | Yok | Tümü |

Kurum (organization) katmanı baştan vardır. Şu an tek kurum siz olsanız bile, ileride başka koçlara platformu açmak isterseniz veri modeli değişmez.

## 4. Tasarım İlkeleri

1. **Tek veri kaynağı.** Bir test bitirildiğinde hem kaynak ilerlemesi hem soru istatistiği hem hedef ilerlemesi aynı `question_logs` kaydından hesaplanır. Aynı bilgi iki yerde tutulmaz.
2. **Her şey veri, hiçbir şey sabit değil.** Ders adları, renkleri, konu listesi, net kuralı, tekrar aralıkları ayarlanabilir.
3. **Modüller açılıp kapanır.** Koç, her öğrenci için hangi modüllerin görüneceğini seçer. Kapalı modül menüde, panelde ve rotalarda görünmez.
4. **Öğrenci için mobil, koç için masaüstü öncelikli.** Aynı uygulama, rol bazlı farklı yerleşim.
5. **Baskı değil, rota.** Öğrenciler arası sıralama tablosu varsayılan olarak kapalıdır. Kırmızı "başarısız" dili yerine "kalan" dili kullanılır. 13-14 yaşında sınav kaygısı gerçek bir risk; arayüz bunu körüklememeli.
6. **Koç müdahalesini kolaylaştır.** Sistem sadece veri toplamaz, koçun dikkat etmesi gereken durumları (bkz. Bölüm 7) kendisi öne çıkarır.

## 5. Modül Kataloğu

Her modül bağımsız bir klasördür (`src/features/<modul>`), kendi menü öğesini, panel kartını ve ayarlarını tanımlar. Aşama sütunu, yol haritasındaki (Bölüm 11) fazı gösterir.

| # | Modül (id) | Öğrenci ne yapar | Koç ne yapar | Veli ne görür | Faz |
|---|---|---|---|---|---|
| 0 | **Çekirdek** (`core`) | Giriş, profil, "Bugün" ekranı | Kurum ve öğrenci yönetimi | Giriş, çocuk seçimi | 1 |
| 1 | **Konu Takibi** (`topics`) | Konu durumunu işaretler (başlamadım, çalışıyorum, bitti, tekrar gerekli, oturdu), kendine güven puanı verir | Şablon ve konu listesi düzenler, öğrencinin konu haritasını görür | Ders bazlı tamamlanma yüzdesi | 2 |
| 2 | **Soru Takibi** (`question-log`) | Ders, konu, kaynak seçip doğru/yanlış/boş girer | Günlük, haftalık grafikleri ve konu bazlı başarı oranını görür | Haftalık toplam soru | 3 |
| 3 | **Hedefler** (`goals`) | Hedef ilerleme çubuklarını görür | Günlük, haftalık, aylık hedef atar (soru, süre, video, konu, net) | Hedef tamamlanma oranı | 3 |
| 4 | **Haftalık Plan** (`planner`) | Günlük görev listesini tamamlar, hafta sonu kısa değerlendirme yazar | Sürükle-bırak plan hazırlar, plan şablonu kaydeder, başka öğrenciye kopyalar | Planın yüzde kaçının yapıldığı | 4 |
| 5 | **Koç Notları ve Görüşmeler** (`coach-notes`) | Kendisine açık notları okur | Not yazar (görünürlük seçerek), görüşme kaydı ve aksiyon maddesi tutar | Veliye açık notlar | 4 |
| 6 | **Duyurular** (`announcements`) | Duyuruları görür | Tüm veya seçili öğrencilere duyuru gönderir | Veliye açık duyurular | 4 |
| 7 | **Kaynak Takibi** (`resources`) | Kitaplarını, testleri tek tek işaretler; test bitince soru kaydı otomatik açılır | Kaynak kataloğu oluşturur (yayınevi, test listesi, konu eşleşmesi), öğrenciye atar | Kaynak ilerleme yüzdeleri | 5 |
| 8 | **Video Takibi** (`videos`) | Oynatma listesindeki videoları uygulama içinde izler, izlendi işaretler, not düşer | YouTube oynatma listesini linkle içe aktarır, videoları konulara eşler | İzlenen video sayısı | 5 |
| 9 | **Denemeler** (`mock-exams`) | Deneme sonucunu ders bazında girer, yanlış yaptığı konuları işaretler | Deneme kataloğu tutar, aynı denemede öğrencileri karşılaştırır, net trendini görür | Net grafiği | 6 |
| 10 | **Yanlış Defteri** (`mistakes`) | Sorunun fotoğrafını çeker, konu ve hata nedeni seçer (bilgi eksiği, dikkat, süre, soru kökü, işlem hatası) | Hata nedeni dağılımını görür: "Bu öğrencinin sorunu bilgi değil, dikkat" | Yok (isteğe bağlı) | 6 |
| 11 | **Tekrar Sistemi** (`review`) | "Bugün tekrar edilecekler" listesi (konu ve yanlış soru) | Tekrar aralıklarını ayarlar (varsayılan 1-3-7-15-30 gün) | Yok | 6 |
| 12 | **Analiz ve Raporlar** (`analytics`) | Kendi istatistiklerini görür | Konu haritası (ısı haritası), zayıf konu listesi, yazdırılabilir veli görüşmesi raporu | Haftalık özet raporu | 6-8 |
| 13 | **Veli Paneli** (`parent`) | Yok | Veli davet eder, veliye neyin görüneceğini seçer | Özet panel | 7 |
| 14 | **Bildirimler** (`notifications`) | Plan, not, tekrar hatırlatmaları | Uyarılar, haftalık özet | Haftalık özet | 7 |
| 15 | **Odak Sayacı** (`study-timer`) | Pomodoro veya serbest sayaç; süre otomatik kaydedilir | Çalışma süresi dağılımını görür | Haftalık çalışma süresi | 8 |
| 16 | **Günlük Durum** (`checkins`) | 10 saniyelik günlük giriş: ruh hali, enerji, uyku saati | Motivasyon ve uyku ile performans ilişkisini görür, düşüş uyarısı alır | Yok (isteğe bağlı) | 8 |
| 17 | **Kitap Okuma** (`reading`) | Okuduğu kitap ve sayfa sayısını girer (LGS Türkçe paragraf becerisi için) | Okuma hedefi atar | Okunan sayfa | 8 |
| 18 | **Hedef Lise** (`target-schools`) | Hedef liselerini ve geçen yılın yüzdelik dilimini görür | Lise kataloğu girer | Hedef liseler | 8 |
| 19 | **Rozetler ve Seri** (`achievements`) | Çalışma serisi, kilometre taşı rozetleri (ör. ilk 1000 soru) | Rozet kurallarını açıp kapatır | Seri bilgisi | 8 |
| 20 | **Okul Sınavları** (`school-exams`) | Yazılı notlarını girer | Okul notlarını görür | Notlar | 8 |

**MVP (ilk kullanılabilir sürüm):** Faz 0-3. Bu noktada 2-3 öğrenciyle pilot başlatılabilir.

## 6. Kilit Kullanıcı Akışları

### 6.1 Öğrencinin bir günü

1. Telefonda ana ekrana eklenmiş uygulamayı açar, **Bugün** ekranı gelir.
2. Üstte LGS geri sayımı ve çalışma serisi; altında koçun bugün için planladığı görevler; ardından "Tekrar zamanı gelenler".
3. Bir görevi yaparken sayacı başlatır (isteğe bağlı).
4. Test bitince görevin üzerindeki "Tamamla" düğmesine basar; ders, konu ve kaynak **plandan otomatik dolu** gelir, sadece doğru/yanlış/boş girer.
5. Yanlış yaptığı bir sorunun fotoğrafını çekip yanlış defterine ekler.
6. Günü bitirirken 10 saniyelik günlük durum girişini yapar.

### 6.2 Koçun haftalık döngüsü

1. **Pazartesi:** Koç panelinde "Dikkat gerektirenler" listesi. Her öğrenci kartında son giriş, haftalık hedef yüzdesi, son deneme net trendi.
2. Bir öğrenciye tıklar: geçen haftanın plan tamamlanma oranı, konu haritası, hata nedeni dağılımı, öğrencinin hafta sonu değerlendirmesi.
3. Yeni haftalık planı hazırlar: plan şablonundan başlar, zayıf konuları sürükleyip ekler, yayınlar.
4. Veliye açık bir not yazar.
5. **Hafta sonu:** Sistem otomatik haftalık özet üretir, veliye bildirim gider.

### 6.3 Yeni öğrenci ekleme

1. Koç "Yeni öğrenci" formunu doldurur: ad, kullanıcı adı, geçici şifre, sezon şablonu, hedef sınav tarihi.
2. Sistem şablondaki tüm konular için ilerleme satırlarını hazırlar, varsayılan modülleri açar.
3. Koç kaynak ve video listelerini atar.
4. Veli için davet kodu/linki üretilir; veli kendi e-postasıyla kayıt olurken KVKK aydınlatma metnini onaylar.

### 6.4 Yeni sezon

1. Owner, mevcut şablonu kopyalar ("LGS 2027" → "LGS 2028").
2. Konuları, soru sayılarını ve kuralları düzenler.
3. Kaynak ve video katalogları da isteğe bağlı olarak kopyalanır.
4. Eski sezonun öğrencileri "arşiv" durumuna alınır; verileri silinmez, raporlanabilir kalır.

## 7. Koç Uyarı Kuralları

Uyarılar veritabanında bir görünüm (view) ile hesaplanır; eşik değerleri kurum ayarlarında düzenlenebilir. Koç ana ekranında her uyarı satırında türüne uygun bir hızlı eylem bulunur (hareketsizlik → "Not yaz", net düşüşü → "Planı gözden geçir", birikmiş tekrar → "Tekrar planı kur").

| Uyarı | Varsayılan kural |
|---|---|
| Hareketsizlik | 3 gündür hiç kayıt yok |
| Hedef geride | Haftanın ortasında haftalık soru hedefinin %40'ının altında |
| Net düşüşü | Son 2 denemenin ortalaması, önceki 3 denemenin ortalamasından 5 net düşük |
| Plan uyumu düşük | Geçen hafta planın %50'sinden azı tamamlandı |
| Birikmiş tekrar | Süresi geçmiş 15'ten fazla tekrar maddesi |
| Motivasyon düşüşü | Son 5 günlük durum girişinden 3'ü "düşük" |
| Uyku | Hafta içi ortalama uyku 7 saatin altında |

## 8. Hesap Yapısı: Öğrencilerin E-postası Yoksa?

Birçok 8. sınıf öğrencisinin düzenli kullandığı bir e-postası yoktur. Önerilen çözüm:

- Öğrenci hesaplarını **koç oluşturur**. Öğrenci **kullanıcı adı + şifre** ile giriş yapar.
- Arka planda Supabase Auth için `kullaniciadi@ogrenci.<alan-adiniz>` biçiminde sentetik bir e-posta kullanılır; bu adrese hiçbir zaman e-posta gönderilmez, doğrulama kapalıdır.
- Şifre sıfırlama koç panelinden yapılır.
- Veli ve koç hesapları gerçek e-posta ile açılır ve e-posta doğrulaması zorunludur.

Yerel Supabase'de (CLI 2.117) admin API ile `ogrenci.pusula.local` alanında hesap oluşturma ve şifreli giriş deneyle doğrulandı (2026-09, 02 karar #19). Üretimde kontrol edilen alan adının alt alanı kullanılır; deney staging'de tekrarlanır.

## 9. KVKK ve Güvenlik

> Bu bölüm teknik bir kontrol listesidir, hukuki görüş değildir. Özellikle ücretli bir hizmet sunuyorsanız bir KVKK danışmanına veya avukata kontrol ettirmeniz önerilir.

- Kullanıcılar reşit olmayan çocuklar olduğu için **veli açık rızası** ve **aydınlatma metni** öğrenci verisi girilmeden önce alınmalıdır. Sistemde `consents` tablosu ile metin sürümü, onay veren kişi ve tarih kayıt altına alınır. Kâğıt üzerinde alınan onay da koç tarafından sisteme işlenebilir.
- **Veri minimizasyonu:** T.C. kimlik no, adres, sağlık bilgisi gibi alanlar hiç tutulmaz. Okul adı ve şube isteğe bağlıdır.
- **Yurt dışına aktarım:** Supabase ve Vercel sunucuları Türkiye dışındadır. Supabase projesi Türkiye'ye en yakın bölge olan Frankfurt'ta (eu-central-1) açılmalı ve aydınlatma metninde yurt dışına aktarım açıkça belirtilmelidir.
- **Silme hakkı:** Öğrenci silindiğinde tüm bağlı veriler ve depodaki fotoğraflar kalıcı olarak silinir (veritabanında `on delete cascade` + depo temizleme fonksiyonu).
- **Satır düzeyi güvenlik (RLS):** Her tabloda zorunlu. Bir öğrenci başka bir öğrencinin verisini API üzerinden bile göremez. RLS kuralları otomatik testlerle doğrulanır.
- **Gizli anahtarlar:** Supabase secret key yalnızca sunucu tarafında, sadece koç işlemleri (öğrenci hesabı oluşturma, şifre sıfırlama) için kullanılır.
- **Fotoğraflar:** Özel (private) depoda tutulur, kısa süreli imzalı linklerle gösterilir. Yüklenmeden önce tarayıcıda küçültülür.
- **Güncellemeler:** Next.js'te 2026 yazında birden fazla kritik güvenlik açığı yamalandı. Dependabot veya Renovate ile bağımlılık güncellemeleri otomatik takip edilmelidir.

## 10. Altyapı ve Maliyet

| Katman | Seçim | Ücretsiz plan notları |
|---|---|---|
| Uygulama barındırma | **Vercel** (Hobby) | Hobby planı kişisel ve ticari olmayan kullanım içindir. Koçluk ücretliyse Vercel Pro (kullanıcı başı aylık ücret) veya Cloudflare'e geçiş (OpenNext adaptörü ile) değerlendirilmelidir. Hobby planında zamanlanmış görevler (cron) günde en fazla bir kez çalışabilir. |
| Veritabanı, kimlik doğrulama, dosya deposu | **Supabase** (Free) | Proje başına 500 MB veritabanı, 1 GB dosya deposu, 50.000 aylık aktif kullanıcı, en fazla 2 aktif proje. **Otomatik yedek yok** ve 7 gün hareketsiz kalan proje duraklatılır. |
| Zamanlanmış işler | **Supabase pg_cron** | Barındırma sağlayıcısından bağımsız, dakika hassasiyetinde çalışır. |
| Yedekleme ve canlı tutma | **GitHub Actions** | Haftalık `pg_dump` yedeği (şifreli olarak özel bir depoya/artifact'e) ve günlük hafif bir istek. Özellikle yaz tatilinde projenin duraklatılmasını önler. |
| Alan adı | İsteğe bağlı | `.com.tr` veya `.com` yıllık düşük bir maliyet. İlk aşamada `vercel.app` alt alanı yeterli. |

Tahmini ölçek: 30 öğrencinin bir sezonda üreteceği metin verisi birkaç on MB'ı geçmez. Asıl sınırlayıcı kalem yanlış defteri fotoğraflarıdır: fotoğraf başına ~150 KB'a sıkıştırmayla 1 GB yaklaşık 6.500 fotoğraf eder. Bu sınıra yaklaşıldığında Supabase Pro'ya geçmek veya eski sezonun fotoğraflarını arşivlemek gerekir.

## 11. Yol Haritası

Her faz bir Git dalında geliştirilir, Vercel önizleme linkinde test edilir, sonra ana dala birleştirilir. Boyut: S (küçük), M (orta), L (büyük).

### Faz 0: Temel Kurulum (S) — ✅ 2026-09-16 (dal: `faz-0-kurulum`)
- [x] Next.js + TypeScript + Tailwind + shadcn/ui iskeleti, klasör yapısı (`02-mimari.md`)
- [x] Supabase CLI ile yerel geliştirme ortamı, ilk boş migration
- [x] ESLint, Prettier, Vitest, Playwright, GitHub Actions CI
- [x] Tasarım token'ları ve temel bileşenler (`04-tasarim-sistemi.md`); `/dev/design` sayfası
- **Kabul:** `pnpm dev` açılıyor ✅ · CI yeşil (ilk push'ta doğrulanacak) · Vercel'e deploy (depo bağlanınca) · Docker ile `pnpm db:start` + `pnpm db:types` yerelde doğrulanacak

### Faz 1: Kimlik, Roller ve Modül Altyapısı (L)

**1a. Veritabanı ve RLS — ✅ 2026-09-16 (dal: `faz-1a-veritabani`)**
- [x] Enum'lar (`user_role`, `student_status`, `parent_relation`, `consent_type`) ve `organizations`, `profiles`, `students`, `student_parents`, `invitations`, `consents`, `student_modules` tabloları (`students.curriculum_template_id` Faz 2'ye kadar nullable, FK yok)
- [x] `private` yardımcıları (`my_role`, `my_org`, `is_coach_of`, `is_parent_of`, `can_read_student`, `can_write_student`, `can_see_profile`, `is_parent_profile_in_my_org`) ve yetki sertleştirme (anon sıfır yetki, kolon düzeyi GRANT, default privileges)
- [x] RLS politikaları (03 §5.3) ve pgTAP testleri: tablo başına 5 senaryo, yetki/kolon testleri, katalog tabanlı şema koruma (225 test)
- [x] `supabase/seed.sql` (1 kurum, 1 owner, 1 koç, 3 öğrenci, 2 veli) ve `database.types.ts`

**1b. Kimlik doğrulama akışları — ✅ 2026-09-17 (dal: `faz-1b-kimlik`)**
- [x] Faz 1a sağlamlaştırma: tablo yetkileri açıkça (`faz1b_table_grants`), `090` yetki matrisi; sentetik e-posta deneyi (karar #19)
- [x] Altyapı: `lib/supabase` (client, server, admin, proxy), `src/proxy.ts` (oturum yenileme + rol claim'iyle yönlendirme), `lib/auth` (`getClaims` + profil, `requireRole`), `createAction`, `custom_access_token_hook`, `pnpm env:local`
- [x] Giriş (kullanıcı adı veya e-posta, tek genel hata), çıkış, profil-yok sayfası, rol yer tutucuları
- [x] Koç: öğrenci oluşturma (admin API + `create_student_account` RPC + telafi), şifre sıfırlama, veli davet kodu; owner: koç ataması (`assign_coach`), öğrenci silme (cascade doğrulandı); basit `/coach/students` listesi
- [x] Veli: davetle kayıt (açık kayıt + davete bağlı profil, karar #20) → e-posta doğrulama (Mailpit) → `accept_invitation` → KVKK onayı (taslak metin, sürüm `config/constants`)
- [x] Testler: birim (username, davet kodu, createAction, telafi), pgTAP (5 yeni dosya), Playwright (giriş, öğrenci oluşturma, owner yönetimi, veli daveti); CI e2e yerel Supabase + seed ile
- Ertelenen: `before_user_created` hook değerlendirmesi (karar #20)
- ~~Pilot öncesi: kâğıt onayı~~ → Faz 1c'de yapıldı.

**1c. Modül sistemi ve uygulama kabukları — ✅ 2026-09-17 (dal: `faz-1c-kabuklar`)**
- [x] Modül altyapısı: `defineModule`, `src/modules/registry.ts`, saf yardımcılar (`registry-helpers`: menü/sekme filtresi, `mergeEnabled`, `resolveToggle`), `getEnabledModules` (React cache) ve `requireModule` (kapalı modül → 404); 10 manifest (çekirdek + 9 yer tutucu), gerçek modül yok
- [x] Öğrenci kabuğu (clay): telefon/tablet alt menü + taşan (+) kayıt düğmesi (şimdilik "yakında"), masaüstü 104 px ray; `/student/today` selamlama + LGS geri sayımı; yer tutucu modül sayfaları `student/[section]`
- [x] Koç kabuğu (flat): 232 px yan menü, telefonda soldan panel; `/coach` → Öğrenciler; öğrenci detayı başlığı (sınıf, okul, geri sayım, onay rozeti) + registry sekmeleri; Modüller sekmesinde aç/kapat (bağımlılıklar sunucuda birlikte çözülür)
- [x] Veli kabuğu (clay-calm): çocuk seçimi (tek çocuk → doğrudan), `parent/[studentId]` alt menü Özet · Denemeler · Notlar
- [x] Kâğıt onayı: koç `recordPaperConsent` (tarih + belge sürümü, `recorded_by`), başlıkta "Veli onayı var / bekleniyor" rozeti; onay tamlığı kaynaktan bağımsız (02 karar #23), veli kapısı da buna göre
- [x] Ortak: `ResponsiveSheet` (CSS ile < 768 alt panel / ≥ 768 diyalog), `Sheet`, `Switch`, `EmptyState`, `NavLink`; her segmentte `loading.tsx` + `error.tsx`
- [x] Testler: birim (registry yardımcıları, `daysUntil`/`greetingFor`), e2e (üç kabuk, modül kapatma → menü + 404, kâğıt onayı; testler kendi öğrencisini açıp siler); pgTAP değişmedi (yeni RLS/RPC yok)
- [x] `pnpm screenshots` → `docs/tasarim/uygulama-1c/` (belge amaçlı, e2e dışı)
- **Kabul:** Üç rol ayrı ayrı giriş yapıp kendi boş panelini görüyor (e2e ✅); bir öğrenci başka öğrencinin satırını okuyamıyor (RLS testi ✅).

### Faz 2: Müfredat Şablonları ve Konu Takibi (M) — ✅ 2026-09-17 (dal: `faz-2-konular`)
- [x] `topic_status` enum; `curriculum_templates`, `subjects`, `topics`, `student_topic_progress` (tembel satır); `students.curriculum_template_id` FK (nullable kaldı, form zorunlu); RLS: şablon/ders/konu sistem + kendi kurumu okunur, koç/owner düzenler (karar #28); pgTAP `130`, `140` + `090` matrisi
- [x] LGS 2027 şablonu **migration** olarak (`faz2_lgs_2027_template`, sabit kimlikler, `on conflict do nothing`; karar #27); mevcut öğrencilere atanır; `create_student_account` şablon parametresi alır (eski imza kaldırıldı), `move_topic` RPC (eşit `sort_order`'da deterministik)
- [x] Öğrenci `/student/topics`: konu haritası (5 durum: doluluk + desen + ikon, `.topic-cell`), telefonda ders kartları sarmalı, masaüstünde tek ızgara; ok tuşlarıyla gezinme; hücre detayı `ResponsiveSheet` (durum + 1-5 güven; karar #30); ders başlığında tamamlanma yüzdesi; şablon yoksa boş durum
- [x] Koç: öğrenci detayında Konular sekmesi (aynı bileşen, flat, durum değiştirebilir; şablon yoksa "Şablon ata"); `/coach/templates` ders/konu listesi — konu ekle (dersin sonuna), adını değiştir, sil (onayda ilerlemesi olan öğrenci sayısı), ↑↓ taşı; alt konular girintili, haritada ünite düzeyi (karar #29). Sürükle-bırak ve şablon kopyalama yok
- [x] Bugün ekranı: `defineWidgets` / `src/modules/widgets.ts` altyapısı (yalnızca `studentToday`) ve "tamamlanan konu" kartı
- [x] Yeni öğrenci formunda şablon seçimi (sistem şablonu varsayılan)
- [x] Testler: birim (`completionPercent`), pgTAP (39 yeni), e2e (`topics.spec.ts`: öğrenci durum değiştirir → yüzde → koç görür; koç konu ekler → öğrencide görünür → siler); `pnpm screenshots --only 2` → `docs/tasarim/uygulama-2/`
- Ertelenen: `next_review_at` / tekrar aralıkları (Faz 6, tekrar modülü); şablon kopyalama (`based_on_id`) ve şablon seçici; hücre detayında soru sayısı/başarı/kaynaklar (Faz 3, 5)
- **Kabul:** Koç şablona konu ekleyince tüm öğrencilerde görünüyor (e2e ✅); öğrenci konu durumunu değiştirebiliyor (e2e ✅).

### Faz 3: Soru Takibi, Hedefler ve "Bugün" Ekranı (L) → **MVP**
- `question_logs`, `goals`, özet görünümleri
- Hızlı kayıt alt paneli (bottom sheet), kayıt geçmişi, düzenleme/silme
- Hedef atama ve ilerleme hesaplama
- Öğrenci "Bugün" ekranı; koç öğrenci listesi ve öğrenci genel bakış sayfası
- **Kabul:** Öğrenci 3 dokunuşta kayıt giriyor; hedef çubuğu anında güncelleniyor; koç listesinde son aktivite görünüyor. **Pilot başlar.**

### Faz 4: Haftalık Plan, Notlar, Duyurular (M)
- `weekly_plans`, `plan_items`, `plan_templates`, `coach_notes`, `meetings`, `announcements`
- Koç plan oluşturucu (sürükle-bırak, otomatik taslak kaydı, zayıf konu/kaynak/video paneli), plan kopyalama; öğrenci görev tamamlama → soru kaydı ön doldurma
- **Kabul:** Koç bir planı 3 öğrenciye kopyalayabiliyor; öğrencinin tamamladığı görev koç ekranına yansıyor.

### Faz 5: Kaynaklar ve Videolar (M)
- `resources`, `resource_sections`, `student_resources`, `video_playlists`, `videos`, `student_playlists`, `student_video_progress`
- YouTube Data API ile oynatma listesi içe aktarma (sunucu tarafında)
- Uygulama içi video oynatıcı ve "izlendi" işareti
- **Kabul:** Koç bir YouTube listesi linki yapıştırınca videolar geliyor; öğrencinin test tamamlaması kaynak yüzdesini güncelliyor.

### Faz 6: Denemeler, Yanlış Defteri, Tekrar, Konu Haritası (L)
- `mock_exams`, `mock_exam_results`, `mock_exam_subject_results`, `mock_exam_topic_mistakes`, `mistakes`, tekrar alanları
- Deneme giriş sihirbazı, net trend grafiği, aynı denemede öğrenci karşılaştırma
- Fotoğraflı yanlış kaydı (tarayıcıda sıkıştırma), hata nedeni analizi
- Tekrar kuyruğu ve `pg_cron` ile günlük tekrar hesaplama
- Konu haritası (ısı haritası): konu durumu + soru başarı oranı + deneme yanlışları birleşik
- **Kabul:** Deneme girildiğinde net otomatik hesaplanıyor; zayıf konular haritada öne çıkıyor.

### Faz 7: Veli Paneli, Bildirimler, Uyarılar (M)
- Veli özet paneli, görünürlük ayarları
- Uygulama içi bildirimler, koç uyarı görünümü (Bölüm 7)
- Haftalık özet üretimi (`pg_cron`), isteğe bağlı e-posta (Resend vb.)
- **Kabul:** Pazar akşamı veliye haftalık özet bildirimi düşüyor; koç panelinde uyarılar listeleniyor.

### Faz 8: Deneyimi Zenginleştirme (L, parçalı yapılabilir)
- PWA (ana ekrana ekleme, çevrimdışı açılış ekranı), web push bildirimleri
- Odak sayacı, günlük durum, kitap okuma, rozetler ve seri, hedef lise, okul sınavları
- Yazdırılabilir veli görüşmesi raporu
- **Kabul:** Her modül tek tek açılıp kapatılabiliyor ve kapalıyken iz bırakmıyor.

### Faz 9: Sağlamlaştırma (M)
- Uçtan uca testlerin kritik akışları kapsaması, erişilebilirlik denetimi
- Performans (sorgu indeksleri, görünümlerin maliyeti), hata izleme (Sentry ücretsiz plan)
- Yedekten geri yükleme tatbikatı
- **Kabul:** Yedekten sıfır bir projeye geri dönüş denendi ve belgelendi.

## 12. Kapsam Dışı (Şimdilik)

Canlı mesajlaşma, ödeme ve abonelik sistemi, yerel (native) mobil uygulama, yapay zekâ ile soru çözümü, otomatik lise taban puanı çekme (veriler elle girilecek), öğrenciler arası sosyal özellikler.

Bunlar ileride modül olarak eklenebilecek şekilde mimari açık bırakılmıştır.

## 13. Açık Kararlar

Geliştirme sırasında netleştirilecek konular. Karar verildikçe `02-mimari.md` içindeki karar kaydına işlenir.

- [ ] Barındırma: Vercel Hobby mi, Vercel Pro mu, Cloudflare mı? (Koçluğun ücretli olup olmamasına bağlı)
- [ ] Alan adı
- [ ] Veli, öğrencinin yanlış defteri fotoğraflarını görebilsin mi?
- [ ] Öğrenci kendi hedefini oluşturabilsin mi, yoksa sadece koç mu?
- [ ] Sıralama tablosu tamamen kaldırılsın mı, yoksa koç isterse açabilsin mi?
- [ ] E-posta bildirimleri Faz 7'de mi, sonra mı?
