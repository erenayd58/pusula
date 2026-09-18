# Faz 5: Strateji Katmanı Tasarımı

> Faz 5'in üç parçasının (takvim ve dönemler, hedef ve geri planlama, strateji farkındalığı) ortak tasarım belgesi. Faz 5 yeni bir sekme değildir: mevcut ekranların (plan oluşturucu, öneri motoru, Bugün, konu haritası, koç listesi) içine giren bir strateji katmanıdır; tek yeni ekran koçun bir kez dolduracağı ayar ve hedef sayfalarıdır. 08 §5'teki Faz 5 kancalarını **imza değiştirmeden** genişletir. Veri modeli bölümü onaylandığında `03-veri-modeli.md`'ye işlenir; parça oturumları bu belgeyi okuyarak başlar. Belge ile kod çelişirse dur ve sor. Ölçek kuralı: tek koç, birkaç öğrenci; RLS tavizsiz, gerisi en basit çalışan çözüm.
>
> **Durum:** tasarım onaylandı (2026-09-18, kararlar §6). **Parça 1 uygulandı** (2026-09-18, dal `faz-5a-takvim`; 03 §3/§4.2/§4.4a/§4.4b/§6/§7/§5.4 ve 02 karar #44 güncellendi). Uygulama notları: `mixOf` ayrı fonksiyon olarak yazılmadı (`periodFor(...)?.mix` yeter); `behind_school.idleDays` okulun bitirmesinden bu yana gün tutar (sebep metni "N hafta önce" bunu okur; §2'de null yazıyordu); "Sıradan dağıt" k. konuya k. payın son haftasını yazar (`ceil(k × n / count)`); hücre işareti okul haftası geçmişse (lag ≥ 1) görünür, hücre detayı "bu hafta" ve "henüz gelmedi" hallerini de yazar. **Parça 2 uygulandı** (2026-09-18, aynı dal; 03 §4.1 students kolonları, §4.4e, §5.3, §6, §7, §5.4 ve 02 karar #45 güncellendi). Uygulama notları: `v_student_subject_targets` şablonun her dersi için satır verir (`questions_target` hedef yoksa null; Parça 3 null'ları eler); `FeasibilityInput` tipi `lib/strategy/feasibility.ts`'te, goals `FeasibilityBase` (formda canlı hesap için sabit girdiler) tanımlar; `updateOrgSettings` revalidate listesine `[studentId]/target` eklenmedi (`createAction` yalnızca statik yol alır; sayfalar dinamik render); e2e `targets.spec` tek masaüstü testinde koç akışını ve öğrenci Bugün'ü doğrular (mobil proje ayrı koşmaz). Parça 2 görüntü incelemesi sonrası düzeltmeler (2026-09-18): Hedef sekmesi konu listesi ders bazında katlanabilir (`details`, özet "Türkçe · 13 konu · 4 gecikmiş · 3 bitti", gecikmişi olan ders açık); gidişat net takvim konumu (§3.1 güncel tanım; görünümler `faz5b_pace_net` ile `topics_expected / topics_behind / topics_ahead`); geri planlamada okul kelepçesi (B5 güncel). **Parça 3 uygulandı** (2026-09-18, aynı dal `faz-5a-takvim`; 02 karar #46, 01 yol haritası güncellendi; şema değişikliği yok). Uygulama notları: `getStrategyContext` konu gecikmesini `v_student_pace_facts`'ten okur (`v_topic_alert_facts.target_on` kullanılmadı; uyarı kuralları hedef tarihine bakmaz), ders soru açığının ufku `target_starts_on → exam_date` (ders hedefi "sınava kadar"); `strategyNote` ders açığı için eşik `SUBJECT_GAP_NOTE_MIN = 0,2` (küçük sapmalar her satıra not yazmasın), gecikme 7 günden azsa "N gün"; `allocateByMix` yüzdeleri toplamına göre normalize eder, kalan eşitliğinde kategori sırası (yeni, zayıf, bakım); `Placement.date` yalnızca gün `date` taşıyorsa yazılır; `SuggestionList` dönem satırını `period` prop'uyla alır (K1/K2 sayfaları `periodFor` ile geçirir; analytics kurum ayarını bileşende okumaz); e2e `strategy-suggestions.spec` tür kontrolünü K2'de yapar (K1 dikkat listesindeki bakım uyarılarını öneri listesinden eler, seed öğrencisinin yalnızca yeni konu önerisi kalırdı) ve dönemi yeni %0 / zayıf %0 / bakım %100 + öğrenci başına 2 öneriyle kurar (seed öğrencisinin zayıf uyarısı yok; kota bakımla dolar), "Önerilen planı hazırla" taze öğrencide koşar (her dersten tek öneri; ders çeşitliliğinin asıl kontrolü birim testte). Seed: Mehmet takvimin gerisinde örnek (hedef 6 hafta önce, Türkçe/Mat/Fen ilk iki konusu koçça öne alınmış ve başlanmamış → "Hedef geçti" rozeti, K1/K2 geride, öneri satırında "hedef tarihi 3 hafta geçti"). Faz kapanışı (2026-09-18): paylaşımlı durum spec'leri `e2e/shared/` + `shared-desktop` projesi (02 karar #47); `pnpm screenshots --only 5` yenilendi (+ `koc-genel-bakis-geride-1440`, `koc-hedef-gecikmis-1440` Mehmet kareleri; `koc-plan-havuz-1440` öneri notuyla). 01 yol haritası bu belgeyle birlikte yeniden numaralandı (Faz 5 strateji, 6 denemeler ve yanlış defteri, 7 kaynaklar ve videolar, 8 veli paneli ve bildirimler, 9 ekstralar, 10 sağlamlaştırma); 03 §4.5 ve 08'deki "Faz 5: `section`, `video`" notları artık Faz 7'yi anlatır, o fazın oturumunda düzeltilir.

## 0. Özet ve parça sırası

| Parça | Modül | Ne bitirir | Dal |
|---|---|---|---|
| 1 | `core`, `topics` (+ `analytics` kuralı) | Kurum ayarı `strategy` (sezon dönemleri + karışım, eşikler) ve ayar formu bölümü; `topics.school_finish_on`; şablon editörü "Takvim" görünümü + toplu doldurma; konu haritasında okul işareti; `behind_school` uyarı türü | `faz-5a-takvim` |
| 2 | `goals` (+ `schedule`, `topics` kartı) | `student_subject_targets`, `student_topic_targets`, `students` hedef ve uyanık aralık kolonları, `set_student_targets` RPC; saf geri planlama / dağıtım / gerçekçilik / gidişat hesapları; "Hedef" sekmesi; gidişat görünümleri; K1 "Takvim" sütunu, K2 ders bazlı tablo, Bugün cümlesi + ince çubuk | `faz-5b-hedef` |
| 3 | `analytics`, `planner` | `buildSuggestions.strategy`, dönem karışımı kotası, `priorityScore` sınav yakınlığı / hedef gecikmesi / ders açığı, `distributeTasks` ders çeşitliliği + çok haftalık anahtar, sorgu katmanında strateji bağlamı | `faz-5c-oneri` |

Bağımlılık: Parça 3 → Parça 1 ve 2. Parça 2, Parça 1'in okul tarihlerini sıralama için kullanır ama onsuz da çalışır (sıra-sıra dağılım). Import yönü: `planner → analytics`, `planner → schedule`, `goals → analytics` (yeni; analytics goals'u import etmez, döngü yok), `topics → (yok)`. Saf strateji fonksiyonları birden fazla modülün ortak malı olduğu için `src/lib/strategy/` altındadır (karar #42'deki `lib/plan/task-title` kalıbı): yapısal tipler alır, hiçbir `features/*` dosyasını import etmez, hepsi birim testli.

**Kapsam dışı:** kitap/video görevleri, denemeler, yanlış defteri, bildirimler, yapay zekâ, otomatik yayınlama, MEB verisinin otomatik çekilmesi (takvim elle doldurulur), veli ekranında gidişat (Faz 8 veli özeti). Kapsam dışı bir öğe tasarımda görünse bile eklenmez; önce sor.

## 1. Veri modeli (03'e eklenecek hali)

### 1.1 Enum

```sql
alter type public.topic_alert_kind add value 'behind_school';   -- karar #32 kalıbı; Parça 1
```

`topicAlertKindLabels` + "Okulun gerisinde". `suggestion_dismissals.kind` aynı enum'u kullandığı için "Şimdi değil" bu tür için de çalışır.

### 1.2 Kurum ayarı `strategy` (Parça 1)

`organizations.settings`'e yeni anahtar; migration `faz5a_strategy_settings` mevcut kurumlara yalnızca eksik anahtarı yazar (`settings = defaults || settings`) ve `private.default_org_settings()`'i günceller. Uygulama `features/core/lib/org-settings.ts` zod şemasıyla okur.

```json
{
  "strategy": {
    "periods": [],
    "proximity_days": 120,
    "school_lag_weeks": 2,
    "topic_minutes_default": 90,
    "pace_window_days": 28,
    "topics_finish_weeks_before_exam": 8
  }
}
```

| Anahtar | Anlamı |
|---|---|
| `periods` | Sezon dönemleri, 0–6 satır: `{ "name": "Yeni konu öğrenme", "starts_on": "2026-09-14", "ends_on": "2027-03-20", "mix": { "new_topic": 50, "weak": 30, "review": 20 } }`. `mix` yüzde, toplamı 100. Tarih aralıkları çakışamaz; boşluk olabilir (o günler dönemsiz). Boş liste = Faz 4 davranışı (karışım kotası yok, sınav yakınlığı çarpanı yine çalışır) |
| `proximity_days` | Sınav yakınlığı rampası: `examProximity = clamp01(1 − kalanGün / proximity_days)` (120 gün kala 0, sınav günü 1) |
| `school_lag_weeks` | Okul bitişinden bu kadar hafta sonra hâlâ bitmemiş konu `behind_school` üretir (tolerans) |
| `topic_minutes_default` | `topics.estimated_minutes` boşsa bir konunun toplam çalışma dakikası (gerçekçilik hesabı) |
| `pace_window_days` | Hız penceresi: son bu kadar günde biten konu sayısından haftalık hız |
| `topics_finish_weeks_before_exam` | Hedef formunda "konuları bitirme tarihi" varsayılanı: sınav − bu kadar hafta (tekrar ve deneme dönemine pay) |

**Varsayılan dönemler** migration'a gömülmez (karar B3): `lib/strategy/periods.ts: suggestSeasonPeriods(examDate)` saf fonksiyonu sınav tarihine göre üç dönem önerir; ayar formundaki "Varsayılanları öner" düğmesi listeyi bununla doldurur, owner düzenleyip kaydeder. LGS 2027 (sınav 2027-06-13) için öneri:

| # | Ad | Aralık (kural) | LGS 2027 örneği | Karışım (yeni / zayıf / bakım) |
|---|---|---|---|---|
| 1 | Yeni konu öğrenme | sınav − 39 hafta (pazartesiye yuvarlanır) → sınav − 12 hafta − 1 gün | 14 Eyl 2026 – 20 Mar 2027 | 50 / 30 / 20 |
| 2 | İkinci tur ve pekiştirme | sınav − 12 hafta → sınav − 5 hafta − 1 gün | 21 Mar – 8 May 2027 | 20 / 40 / 40 |
| 3 | Deneme ve eksik kapatma | sınav − 5 hafta → sınav günü | 9 May – 13 Haz 2027 | 0 / 50 / 50 |

Sınav tarihi kaynağı: kurumun (ilk) şablonunun `curriculum_templates.exam_date`'i; yoksa düğme devre dışı ve ipucu "Şablonun sınav tarihi yok". Yerel `supabase/seed.sql` demo kuruma bu üç dönemi **dolu** yazar (e2e ve ekran görüntüleri için); üretimde owner bir kez doldurur. Dönem tanımlı değilken K1'de uyarı gösterilmez; yalnızca ayar sayfasında nötr not ("Sezon dönemleri tanımlı değil; öneriler dönem karışımı olmadan çalışıyor").

### 1.3 Parça 1: Müfredat takvimi

```sql
alter table public.topics add column school_finish_on date;   -- okulda tahmini bitiş; ünite düzeyi konularda dolu, alt konular üstünden okur
-- indeks gerekmez (şablon başına ~54 satır); RLS/grant değişmez: koç ve owner sistem şablonunu düzenler (karar #28)
```

**Tarih mi, göreli hafta numarası mı?** (karar B1, tartışma)

| Ölçüt | Göreli hafta (`school_week smallint`, sezon başına 1..n) | Tarih (`school_finish_on date`) |
|---|---|---|
| Ek veri | Sezon başlangıç tarihi (şablon ya da kurum) ve ara tatil eşlemesi gerekir; "22. hafta" hangi takvim günü, tatil sayılıyor mu belirsiz | Yok; tek kolon |
| Karşılaştırma | Bugünün hafta numarasına çevrilmeli (aynı eşleme) | `today − school_finish_on` doğrudan; SQL'de filtre ve görünüm kolonu kolay |
| Toplu doldurma | Hafta numarası dağıtmak kolay ama ara tatili atlamak eşleme ister | Aralığa eşit dağıtım + isteğe bağlı atlanacak aralık; 54 konu 30 saniyede |
| Yeni sezon | "Taşınabilir" görünür ama gerçek takvim (tatiller, başlangıç) her yıl değişir; koç yine gözden geçirir | Şablon kopyasında tarihler yıl farkı kadar kaydırılır (`copy_curriculum_template`, Faz 6+); ya da 30 saniyede yeniden dağıtılır |
| Gösterim | "22. hafta" koça bir şey söylemez | Hafta olarak gösterilir: "12–18 Ekim haftası"; gecikme hafta çözünürlüğünde (`weekStart` ile) |

**Karar: tarih.** Kolon haftanın herhangi bir günü olabilir; arayüz haftayı gösterir, toplu doldurma pazartesi yazar, "okul bu konuyu 3 hafta önce bitirdi" `floor((weekStart(bugün) − weekStart(tarih)) / 7)` ile hesaplanır.

**Sınırlama:** `topics.school_finish_on` şablon düzeyindedir; aynı şablonu kullanan tüm öğrenciler aynı okul takvimini paylaşır. Farklı okullardaki öğrenciler için bu bir yaklaşıklıktır; `school_lag_weeks` toleransı bunun içindir. İleride öğrenci bazlı kaydırma (`students.school_calendar_offset_days`) eklenebilir (§5 kancası); bu fazda yok.

`v_topic_alert_facts` görünümüne iki kolon **sona eklenir** (`create or replace`): `school_finish_on` (konudan) ve `target_on` (Parça 2'nin `student_topic_targets`'ından; Parça 1'de tablo yoksa bu kolon Parça 2 migration'ında eklenir). Parça 1 uyarı kuralı yalnızca `school_finish_on` kullanır.

### 1.4 Parça 2: Öğrenci hedefi

```sql
alter table public.students
  add column topics_finish_by date,        -- konuları bitirme hedef tarihi (yalnızca set_student_targets yazar)
  add column target_starts_on date,        -- hedefin başlangıcı; gerçekleşen soru bu günden itibaren sayılır
  add column wake_start time,              -- boşsa kurum ayarı schedule.wake_start (karar B10)
  add column wake_end time;                -- check: ikisi birlikte boş ya da dolu ve wake_end > wake_start
-- kolon düzeyi grant listesine yalnızca wake_start, wake_end eklenir (koç Program sekmesinden yazar);
-- topics_finish_by / target_starts_on API'den doğrudan yazılamaz → niyet RPC'de açık (03 §5.3 seçenek (a))

student_subject_targets (
  student_id uuid not null references students(profile_id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  questions int not null check (questions > 0),   -- sınava kadar bu derste çözülecek soru
  created_at, updated_at,
  primary key (student_id, subject_id)
)
-- index (subject_id)

student_topic_targets (
  student_id uuid not null references students(profile_id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  target_on date not null,                          -- bu konunun bitirilmesi hedeflenen gün
  created_by uuid references profiles(id) on delete set null,
  created_at, updated_at,
  primary key (student_id, topic_id)
)
-- index (topic_id), (created_by)
```

**Konu hedef tarihleri saklanır** (karar B4): her açılışta bugünden yeniden hesaplansaydı bitmemiş konular kalan süreye yeniden yayılır ve öğrenci hiçbir zaman "takvimin gerisinde" olmazdı; saklı tarih sabit bir çıpa verir ve koç tek tek düzenleyebilir. Toplam soru hedefi saklanmaz: `sum(student_subject_targets.questions)`.

**RLS:** iki tablo da standart öğrenci verisi kalıbı (03 §5.2): öğrenci S, koç S I U D (`is_coach_of`; `created_by` kendisi), veli S, owner tümü. Tablo yetkisi `authenticated` S I U D (politikalar daraltır; öğrencinin doğrudan yazması 42501 değil 0 satır/with check hatası — pgTAP her ikisini de denetler).

**RPC (`faz5b_target_rpcs`):**

| Fonksiyon | Tür | Ne yapar |
|---|---|---|
| `set_student_targets(p_student_id uuid, p_topics_finish_by date, p_starts_on date, p_subject_targets jsonb, p_topic_targets jsonb)` | security definer; ilk satır `is_coach_of` | Tek transaction: `students.topics_finish_by / target_starts_on` günceller; `student_subject_targets` satırlarını payload ile değiştirir (`[{subject_id, questions}]`; payload'da olmayan ders silinir); `student_topic_targets` upsert (`[{topic_id, target_on}]`) ve payload'da olmayan satırlar silinir (yeniden üretimde bitmişler dahil tüm ünite konuları payload'dadır; şablondan kalkan konunun satırı temizlenir). Konu/ders öğrencinin şablonunda değilse `invalid_target` hatası, hiçbir şey yazılmaz. Döner `{subjects int, topics int}` |

Tek konunun tarihini düzenlemek RPC gerektirmez: koç `student_topic_targets` satırını RLS ile günceller (`updateTopicTarget` eylemi, tek tablo). Haftalık hedef önerisi (karar B13) mevcut `goals` yoluyla yazılır (`setGoals`), otomatik değil.

**Görünümler (`faz5b_pace_views`, hepsi `security_invoker`):**

| Görünüm | Kolonlar | Kullanım |
|---|---|---|
| `v_student_pace_facts` | student_id, organization_id, coach_id, subject_id, subject_name, subject_short_name, subject_color, subject_sort_order, topic_id, topic_name, topic_sort_order, status (satır yoksa `not_started`), completed_at, target_on, school_finish_on | Gidişat hesabı (`topicPace`, saf): topics Bugün kartı, K2 ders tablosu, "Hedef" sekmesi konu listesi, strateji bağlamı |
| `v_student_subject_targets` | student_id, subject_id, questions_target, questions_done (`question_logs`, `log_date >= target_starts_on`), topics_total, topics_done, topics_expected (`target_on <= bugün`, bitmiş olsun olmasın) | K2 "Ders bazlı gidişat" tablosu; strateji ders açığı |
| `v_coach_student_overview` (replace, sona ekle) | + `has_targets` (`topics_finish_by` dolu), `topics_total`, `topics_done`, `topics_expected`, `topics_behind` = greatest(0, expected − done), `topics_ahead` = greatest(0, done − expected) | K1 "Takvim" sütunu tek sorguda |

"Bitmiş" her yerde `status in ('completed','mastered')` (topics `isDone` ile aynı). Öğrenci satırı yoksa `not_started`. Hafta/gün hesapları `(now() at time zone 'Europe/Istanbul')::date` (karar #36).

### 1.5 Parça 3

Tablo ve görünüm yok; strateji bağlamı 1.3–1.4'teki görünümlerden ve kurum ayarından sorgu katmanında kurulur.

### 1.6 pgTAP

| Dosya | Kapsam |
|---|---|
| `200_strategy_settings.test.sql` | `strategy` anahtarı varsayılanları (`periods` boş, sayılar), mevcut değer kazanır (`defaults || settings`) |
| `205_topic_school_dates.test.sql` | Koç sistem şablonunda `school_finish_on` yazar, öğrenci/veli yazamaz (0 satır), başka kurumun şablonu görünmez; `v_topic_alert_facts.school_finish_on` dolu gelir |
| `210_student_targets.test.sql` | İki tablo 5 senaryo; RPC: koç kendi öğrencisine yazar, başka koç `42501`, öğrenci çağıramaz; geçersiz konu → `invalid_target` ve hiçbir satır yok (atomiklik); yeniden üretimde payload dışı satırlar silinir; `students.topics_finish_by` doğrudan UPDATE `42501` (kolon grant'ı yok), `wake_*` koç yazar, check (`wake_end > wake_start`, birlikte boş/dolu) |
| `215_pace_views.test.sql` | `v_student_pace_facts` RLS (koç kendi öğrencisi, öğrenci kendisi, veli çocuğu, anon `42501`); `v_student_subject_targets` sayımları `target_starts_on`'dan itibaren; overview `topics_overdue / topics_ahead` bugüne göre |
| `090_schema_guards` | 2 tablo, 2 görünüm, RPC execute grant'ı, `students` kolon listesi (+ `wake_start`, `wake_end`) |
| `110_cascade` | Hedef satırları öğrenciyle silinir; `created_by` koç silinince `set null` |

## 2. Parça sınırları

### Parça 1: Takvim ve dönemler (`core`, `topics`, `analytics`)

**Dosyalar**

- Migration: `faz5a_strategy_settings` (§1.2), `faz5a_topic_school_dates` (§1.3 kolon + `set_topic_school_dates` RPC + `v_topic_alert_facts` `school_finish_on`; enum değeri `behind_school`); testler `200`, `205` (RPC: koç yazar, öğrenci `42501`/0 satır, tek ifadede atomik); `090` (RPC execute); `db:types`.
- `src/lib/strategy/periods.ts` (+test): `periodFor`, `suggestSeasonPeriods`, `mixOf`. `src/lib/strategy/school-calendar.ts` (+test): `distributeEvenly`, `schoolLagWeeks`.
- `features/core`: `org-settings.ts` şeması `strategy` (dönem satırı şeması: ad 1–40, tarih `YYYY-MM-DD`, `ends_on >= starts_on`, çakışma kontrolü `superRefine`, karışım toplamı 100), `org-settings-form.tsx` yeni bölümler: "Sezon dönemleri" (1–6 satırlı liste editörü: ad, başlangıç, bitiş, üç yüzde; "Satır ekle", "Sil", "Varsayılanları öner" — `suggestSeasonPeriods(examDate)`; şablonun sınav tarihi sayfadan prop gelir) ve "Strateji" (5 sayı alanı). Owner düzenler, koç salt okunur (karar A5). Dönem tanımsızsa nötr not.
- `features/topics`: `schemas.ts` (`setTopicSchoolDatesSchema`: `{ rows: [{ topicId, schoolFinishOn: date | null }] }` en fazla 100), `server/actions.ts: setTopicSchoolDates` (koç/owner; `set_topic_school_dates(p_rows jsonb)` RPC'si — **security invoker**, `move_topic` kalıbı: `update public.topics t set school_finish_on = r.on from jsonb_to_recordset(p_rows) as r(topic_id uuid, "on" date) where t.id = r.topic_id`, tek ifade → atomik, RLS uygulanır; güncellenen satır sayısı payload'dan azsa `NOT_ALLOWED`; migration'da `grant execute … to authenticated`), `server/queries.ts: getTemplateEditor` + `schoolFinishOn`, `getTopicMap` + hücreye `schoolFinishOn`, `types.ts` (`TemplateTopic.schoolFinishOn`, `TopicMapCell.schoolFinishOn`), `components/template-calendar.tsx` (istemci; `/coach/templates?view=calendar`; ders başına bölüm: başlık formu "Başlangıç · Bitiş · Ara tatil (isteğe bağlı: başlangıç–bitiş) · Sıradan dağıt · Temizle", altında ünite konuları satır satır `input type="date"` (hafta etiketi yanında: "12–18 Ekim"); "Sıradan dağıt" istemcide `distributeEvenly` ile hesaplar, dersin tüm satırlarını tek `setTopicSchoolDates` çağrısıyla yazar; tek satır düzenlemesi de aynı eylemle (tek satır). Varsayılan aralık: 1. dönemin `starts_on`–`ends_on`'u (dönem yoksa boş). Alt konular listelenmez, üstünden okur (karar #29)), `components/topic-cell.tsx` (okul işareti: `schoolFinishOn` geçmiş **ve** konu bitmemişse hücrenin üst sağ köşesinde küçük üçgen çentik (`.topic-cell--school-passed`, `currentColor` ink, ders rengi değil; bilgi renkle verilmez: `aria-label`'a "okulda işlendi" eklenir); öğrenci bitirmiş ve okul henüz gelmemişse işaret yok, detayda metin), `components/topic-detail-sheet.tsx` (satır "Okulda: 12–18 Ekim haftası · 3 hafta önce" / "Okul bu konuya henüz gelmedi" / tarih yoksa satır yok).
- Şablon sayfası başlığına iki görünüm bağlantısı: "Konular" (mevcut editör) · "Takvim" (`?view=calendar`); telefon: takvim görünümü de tek sütun çalışır (tarih alanı 44 px).
- `features/analytics/lib/alerts.ts`: `behind_school` kuralı; `alertReason`: "Okul bu konuyu 3 hafta önce bitirdi"; `KIND_PRIORITY` (behind_school = 2, neglected_subject ve sonrakiler kayar); `groupAlerts`: `notStarted` grubu yerine yeni `behind` grubu (K1 dikkat listesi `behind_school`'u gösterir — `not_started`'tan farklı olarak dikkat gerektirir; Konular sekmesinde "Okulun gerisinde" listesi; öğrenci Bugün kartında (`pickStudentNudge`) **gösterilmez**: karar A7'nin ruhu, okul karşılaştırması öğrenciye baskı yapar). `priority.ts: KIND_BASE_SCORE.behind_school = 0.75`; `suggestions.ts: TASK_KIND.behind_school = "topic_study"`; planner `alert-pool.ts` yeni kategori `behind` ("Okulun gerisinde", öneriler ile zayıf konular arasında; `TaskPoolCategoryId` + `"behind"`, `buildTaskPool` sırası güncellenir).
- `content/labels.ts`: `topicAlertKindLabels.behind_school`, havuz kategori başlığı.
- e2e `curriculum-calendar.spec.ts`: koç takvim görünümünde 6 derste "Sıradan dağıt" + bir satırı elle değiştirir → 54 konunun tarihi dolu (sayfa yeniden açılınca kalır) → tarihi geçmiş ve başlanmamış konu seed öğrencisinin haritasında işaretli, hücre detayında "Okulda … hafta önce" satırı → K1 "Dikkat gerektirenler"de "Okulun gerisinde"; owner ayarlarda "Varsayılanları öner" → 3 satır → kaydeder → sayfa yeniden açılınca kalır.

**Saf fonksiyonlar:**

```ts
// src/lib/strategy/periods.ts
export type PeriodMix = { new_topic: number; weak: number; review: number };   // yüzde, toplam 100
export type SeasonPeriod = { name: string; starts_on: string; ends_on: string; mix: PeriodMix };
export function periodFor(periods: readonly SeasonPeriod[], date: string): SeasonPeriod | null;  // aralığı kapsayan ilk dönem; yoksa null
export function suggestSeasonPeriods(examDate: string): SeasonPeriod[];   // §1.2 tablosu; ilk başlangıç pazartesiye yuvarlanır
export function examProximity(daysToExam: number, proximityDays: number): number;   // clamp01(1 − days / proximityDays); geçmiş sınav → 1

// src/lib/strategy/school-calendar.ts
export function distributeEvenly(input: {
  count: number; from: string; to: string;           // YYYY-MM-DD
  skip?: { from: string; to: string } | null;        // ara tatil: bu aralığa düşen pazartesiler atlanır
}): string[];   // `count` pazartesi, [from, to] içine eşit aralıkla; count > uygun pazartesi sayısı ise pazartesiler tekrar eder (aynı hafta birden fazla konu)
export function schoolLagWeeks(schoolFinishOn: string, today: string): number;   // floor((weekStart(today) − weekStart(schoolFinishOn)) / 7); gelecek → negatif
```

**`behind_school` kuralı (`evaluateTopic`, sıra):** `knowledge_gap → low_accuracy → behind_school → stale → forgetting_risk → review_due → not_started`. Koşul: `status ∉ {completed, mastered}` (karar B8: bitmemiş konuların hepsi, `studying` dahil) ve `schoolLagWeeks(school_finish_on, today) >= school_lag_weeks`. `idleDays = null`, `delayDays = (lagWeeks − school_lag_weeks) × 7`, `threshold = null`. Testler: tolerans sınırı (tam eşikte üretilir), tarih boşsa üretilmez, bitmiş konuda üretilmez, `studying` konuda üretilir, öncelik (başarı kuralı varsa o kazanır), "Şimdi değil" ile 14 gün gizlenir (Faz 4 testi kalıbı).

**Kabul:** 54 konunun okul takvimi tek oturumda doldurulur (e2e: 6 "Sıradan dağıt" + bir elle düzeltme, yeniden açılınca kalır); seed öğrencisinde en az bir "Okulun gerisinde" uyarısı K1'de görünür, haritada işaret ve hücre detayında okul satırı (e2e); ayar formunda dönemler önerilir/kaydedilir (e2e), çakışan aralık form hatası (birim, zod); `periodFor`, `suggestSeasonPeriods`, `distributeEvenly` (atlama aralığı, eşit yayılım, sığmayan sayı), `schoolLagWeeks`, `behind_school` kuralı birim testli; `pnpm check` + `pnpm db:test` yeşil.

### Parça 2: Hedef ve geri planlama (`goals`, `schedule`, `topics`)

**Dosyalar**

- Migration: `faz5b_student_targets` (§1.4 kolonlar, 2 tablo, grant + politikalar, `students` kolon grant'ı), `faz5b_target_rpcs` (`set_student_targets`), `faz5b_pace_views` (2 görünüm + overview kolonları + `v_topic_alert_facts.target_on`); testler `210`, `215`; `090`, `110`; `db:types`.
- `src/lib/strategy/back-plan.ts` (+test): `backPlanTopics`. `split.ts` (+test): `splitQuestions`. `feasibility.ts` (+test): `feasibility`, `feasibilityText`. `pace.ts` (+test): `topicPace`, `subjectPace`, `paceSentence`, `paceLabel`.
- `features/goals`: `module.ts` + `coachStudentTabs: [{ segment: "target", label: "Hedef", order: 35 }]` (Genel bakış 0 · Konular · Plan 40 arasına), `dependsOn` + `"topics"`; `schemas.ts` (`setStudentTargetsSchema`: `topicsFinishBy` (bugünden sonra, sınavdan önce ya da eşit), `startsOn`, `subjects: [{subjectId, questions ≥ 0}]` en az bir ders > 0, `topics: [{topicId, targetOn}]`; `updateTopicTargetSchema`; `weeklyGoalFromTargetSchema`), `types.ts` (`StudentTargets`, `SubjectTargetRow`, `TopicTargetRow`, `FeasibilityInput`), `server/queries.ts` (`getStudentTargets(studentId)`: `students` kolonları + iki tablo + şablonun dersleri (`exam_question_count`) + `v_student_pace_facts`; `getWeeklyAvailableMinutes(studentId)` → schedule index'inden `getTypicalWeekAvailability`), `server/actions.ts` (`setStudentTargets` → RPC; `updateTopicTarget` (tek satır, RLS); `applyWeeklyGoalSuggestion` → mevcut `setGoals`ı çağırır, `weekly` değeri koçun onayladığı sayı), `components/target-form.tsx` (istemci; alanlar: "Konuları bitirme tarihi" (varsayılan `exam_date − topics_finish_weeks_before_exam` hafta; sınav tarihi yoksa alan boş ve kaydet kapalı + ipucu "Önce sınav tarihini gir"), "Başlangıç" (varsayılan bugün), "Toplam soru" + ders satırları (varsayılan `splitQuestions(total, examQuestionCount)`; toplam değişince dağılım yeniden önerilir, ders alanı elle değişince toplam ders toplamı olur; toplam tutarsızlığı yok çünkü toplam türetilir), gerçekçilik cümlesi (`feasibilityText`, canlı; nötr `ink-700` + `Info` ikonu, uyarı rengi yok), "Takvimi oluştur ve kaydet" → `backPlanTopics` istemcide hesaplanır, önizleme listesi (ders başına konu → hafta) gösterilir, onayla RPC; mevcut hedef varsa "Yeniden oluştur" onay penceresi "Konu tarihleri yeniden dağıtılacak; elle değiştirdiklerin kaybolur"), `components/topic-target-list.tsx` (ders başına konu satırı: ad, durum, hedef hafta (`input type="date"`, `updateTopicTarget`), okul haftası (varsa), gecikmişse nötr rozet "Hedef geçti"), `components/weekly-goal-suggestion.tsx` ("Haftalık hedefi buna göre öner" düğmesi → `ceil(kalan soru / kalan hafta)` gösterilir "Önerilen haftalık hedef: 320 soru (şu an 300)" → "Uygula" → `applyWeeklyGoalSuggestion`; otomatik değil, karar B13), `components/subject-pace-table.tsx` (K2 "Ders bazlı gidişat": ders · bitirilen / planlanan konu (bugüne kadar hedeflenen) · soru gerçekleşen / hedef · tahmini bitiş (`subjectPace.projectedFinishOn`; hız 0 → "—" ve ipucu "son 4 haftada bu derste konu bitmedi")), `components/pace-tile.tsx` (K2 özet kutusu: "54 konunun 9'u · takvimin 3 konu gerisinde · bu hızla sınava 6 konu eksik"; hedef yoksa "Hedef kurulmadı → Hedef sekmesi").
- `features/schedule`: `students.wake_*` okuma/yazma: `getWakeWindow(studentId)` (öğrenci değeri yoksa kurum ayarı; `availabilityForWeek({ wake })` çağrıları bunu geçirir — imza aynı, 08 §5), `setWakeWindow` eylemi (koç; boş bırakmak kurum varsayılanına döner), `components/wake-window-form.tsx` (Program sekmesi başlığında "Uyanık aralık: 08:00–22:00 (kurum varsayılanı) · Düzenle"; öğrenci ekranında salt metin), `getTypicalWeekAvailability(studentId)` (istisnasız bir hafta: gerçekçilik hesabının müsait süresi).
- `features/topics`: Bugün kartı (`student-today-widget.tsx`) genişler (karar B7): hedef varsa ikinci satır `paceSentence` ("54 konunun 9'u bitti · takvimin 3 konu gerisindesin") ve altında ince çubuk (`ProgressBar`, doluluk `done/total`, çubuk üzerinde ince çentik `expectedByToday/total` "takvim" — CSS değeri ham sayı, 04 §12.1); hedef yoksa mevcut kart. Uyarı rengi yok; fosforlu yalnızca `done === total`. Veri `v_student_pace_facts` (görünümle modüller arası okuma, karar #37). `getTopicMap` hücreye `targetOn` da verir; hücre detayında "Hedef: 19–25 Ekim haftası" satırı.
- `features/core`: `StudentListRow` + `hasTargets`, `topicsTotal`, `topicsDone`, `topicsOverdue`, `topicsAhead`; `StudentTable` "Takvim" sütunu (`paceLabel`: `−3 konu` / `+2 konu` / `Uyumlu` / `—`; işaret U+2212, `formatSigned`; telefon kartında satır).
- K2 Genel bakış: `PaceTile` özet kutusu satırına, `SubjectPaceTable` plan kutusunun altına (goals açıksa); "Hedef" sekmesi sayfası `app/(coach)/coach/students/[studentId]/target/page.tsx` (+ loading/error): `TargetForm` + `TopicTargetList` + `WeeklyGoalSuggestion`.
- e2e `targets.spec.ts` (masaüstü koç + mobil öğrenci): koç Hedef sekmesinde toplam soru girer → dağılım dolu → "Takvimi oluştur ve kaydet" → konu listesi tarihli → gerçekçilik cümlesi görünür → Program sekmesinde meşguliyet ekleyince cümledeki boş saat düşer → öğrenci Bugün'de gidişat cümlesi ve çubuk → K1 "Takvim" sütunu ve K2 tablo dolu → haftalık hedef önerisi "Uygula" → hedef halkası yeni değeri gösterir.

**Saf fonksiyonlar:**

```ts
// src/lib/strategy/back-plan.ts
export function backPlanTopics(input: {
  topics: readonly { topicId: string; subjectId: string; subjectSortOrder: number; topicSortOrder: number;
                     schoolFinishOn: string | null; done: boolean; completedAt: string | null }[];
  startsOn: string; finishBy: string;
}): { topicId: string; targetOn: string }[];
// tüm ünite konuları (bitmişler dahil; Faz 5 kapanış düzeltmesi); sıra: schoolFinishOn dolu olanlar tarih sırasıyla önce, sonra dersler arası sıra-sıra
// (Türkçe 1, Mat 1, Fen 1, …, Türkçe 2, …); [startsOn, finishBy] arasına eşit yayılım (i × gün / n, pazartesiye
// yuvarlanmaz; gün çözünürlüğü); okul kelepçesi (karar B5, güncel): okul tarihi olan konunun hedefi
// max(yayılım, okul tarihi), finishBy ile sınırlı — sıralama ve diğer konuların yayılımı değişmez, koç tek tek öne alabilir;
// bitmiş konu sıradaki yuvasını alır (yayılım n = tüm konular); hedefi completedAt varsa o gün (aralığa kırpılır), yoksa yuva
// tarihi → beklenen sayımına doğal girer, "Hedef yok" satırı kalmaz, ders tablosunda bugüne kadar hedeflenen ≥ bitti;
// finishBy < startsOn → boş dizi (form zaten engeller)

// src/lib/strategy/split.ts
export function splitQuestions(total: number, subjects: readonly { subjectId: string; examQuestionCount: number | null }[])
  : { subjectId: string; questions: number }[];   // sınav soru sayısına orantılı, en büyük kalan yöntemi; toplam tam total; ağırlığı olmayan ders 0

// src/lib/strategy/feasibility.ts
export function feasibility(input: {
  remainingTopicMinutes: number;      // Σ bitmemiş konu (estimated_minutes ?? topic_minutes_default)
  weeksToFinish: number;              // bugün → topics_finish_by (en az 1)
  remainingQuestions: number;         // Σ hedef − gerçekleşen (negatifse 0)
  minutesPerQuestion: number;         // kurum planner.minutes_per_question (öğrenci temposu varsa o; Parça 2'de kurum değeri)
  weeksToExam: number;                // bugün → exam_date (en az 1)
  weeklyAvailableMinutes: number;     // istisnasız hafta × day_capacity_ratio
}): { requiredMinutesPerWeek: number; availableMinutesPerWeek: number; fits: boolean };
export function feasibilityText(f: ReturnType<typeof feasibility>): string;
// "Bu hedef haftada yaklaşık 18 saat çalışma gerektiriyor; öğrencinin programında haftada 12 saat boş var."
// sığıyorsa: "Bu hedef programa sığıyor: haftada yaklaşık 9 saat gerekiyor, 12 saat boş var." (formatDuration; yargı yok)

// src/lib/strategy/pace.ts
export type PaceTopic = { topicId: string; subjectId: string; done: boolean; completedAt: string | null; targetOn: string | null };
export type TopicPace = {
  total: number; done: number; expectedByToday: number;   // hedefi bugün ya da öncesi olan konular (bitmiş olsun olmasın)
  overdue: number;                                        // net geride: max(0, beklenen − bitmiş)
  ahead: number;                                          // net ileride: max(0, bitmiş − beklenen)
  velocityPerWeek: number;                                // son pace_window_days'de biten × 7 / pencere
  projectedDoneByExam: number; shortfall: number;         // max(0, kalan − hız × kalan hafta)
  projectedFinishOn: string | null;                       // bugün + kalan / günlük hız; hız 0 → null
};
export function topicPace(topics: readonly PaceTopic[], input: { today: string; examOn: string | null; windowDays: number }): TopicPace;
export function subjectPace(topics: readonly PaceTopic[], subjectId: string, input): TopicPace;   // aynı hesap, ders alt kümesi
export function paceSentence(p: TopicPace, hasTargets: boolean): string;
// "54 konunun 9'u bitti · takvimin 3 konu gerisindesin" | "… · takvimin 2 konu ilerisindesin" | "… · takvimle uyumlusun"
// hedef yoksa "54 konunun 9'u bitti"; overdue > 0 ise geride, ahead > 0 ise ileride, ikisi de 0 ise uyumlu (net; ikisi aynı anda > 0 olamaz)
export function paceLabel(p: Pick<TopicPace, "overdue" | "ahead">, hasTargets: boolean): string;   // K1: "−3 konu" · "+2 konu" · "Uyumlu" · "—"
```

Testler: sıralama (okul tarihi önce, sıra-sıra), eşit yayılım uçları, bitmiş konu yuva alır ve completedAt günü / yuva tarihi (aralığa kırpma, İstanbul günü); dağılımın toplamı ve kalan yöntemi; gerçekçilik sığıyor/sığmıyor ve hafta tabanı 1; gidişat: geride/ileride/uyumlu/hedefsiz, hız 0, pencere sınırı, sınav tarihi yok (shortfall 0, projected null).

**Kabul:** Koç hedefi kurunca 54 konu tarihi yazılır (pgTAP + e2e); gerçekçilik cümlesi program değişince değişir (e2e); öğrenci Bugün'de tek cümle + ince çubuk, uyarı rengi yok (e2e + ekran görüntüsü); K1 "Takvim" sütunu ve K2 tablo dolu (e2e); haftalık hedef önerisi düğmeyle uygulanır (e2e); saf fonksiyonların her dalı birim testli; `pnpm check` + `pnpm db:test` yeşil.

### Parça 3: Strateji farkındalığı (`analytics`, `planner`)

**Dosyalar**

- Migration yok.
- `src/lib/strategy/mix.ts` (+test): `allocateByMix`, `mixCategoryOf`.
- `features/analytics`: `types.ts` (`StudentStrategy`), `lib/priority.ts` (isteğe bağlı alanlar), `lib/suggestions.ts` (`strategy?` parametresi, kota, `strategyNote`), `lib/distribute.ts` (ders çeşitliliği, `date?` anahtarı), `server/queries.ts: getStrategyContext(studentIds?)` (kurum ayarı + `students.exam_date` + `v_student_pace_facts` + `v_student_subject_targets` → `Map<studentId, StudentStrategy>`; React `cache`), `getSuggestions` bunu kurup `buildSuggestions`'a geçirir; `components/suggestion-list.tsx` başlık altına dönem adı ("Dönem: İkinci tur ve pekiştirme · karışım yeni %20 / zayıf %40 / bakım %40"; dönem yoksa satır yok) ve öğe satırına `strategyNote` (ink-500).
- `features/planner`: `prepareSuggestedPlan` değişmez (öneriler stratejiyle gelir; `distributeTasks` çeşitlilik kuralı içeride); havuz `suggestions` kategorisinde `strategyNote` `reason`'a eklenir.
- e2e `strategy-suggestions.spec.ts`: owner dönemleri "Deneme ve eksik kapatma"ya çekince (bugünü kapsayan tek dönem, yeni %0) seed öğrencisinin K1 önerilerinde "Başlanmamış"/"Okulun gerisinde" türü kalmaz, başlıkta dönem adı; geri alınca gelir; "Önerilen planı hazırla" sonucu aynı gün sütununda aynı dersten iki görev yok.

**Saf fonksiyonlar (imzalar Faz 4'ten değişmez, alanlar isteğe bağlı):**

```ts
// features/analytics/types.ts
export type StudentStrategy = {
  daysToExam: number | null;                       // students.exam_date; yoksa null → examProximity 0
  mix: PeriodMix | null;                           // periodFor(periods, today)?.mix
  topicDelayDays: ReadonlyMap<string, number>;     // konu → hedef tarihi aşan gün (student_topic_targets; bitmemiş)
  subjectGap: ReadonlyMap<string, number>;         // ders → 0–1: (bugüne kadar beklenen soru − gerçekleşen) / beklenen; beklenen = hedef × geçen gün / toplam gün
};

// src/lib/strategy/mix.ts
export type MixCategory = "new_topic" | "weak" | "review";
export function mixCategoryOf(kind: TopicAlertKind): MixCategory;
// new_topic: not_started, behind_school · weak: knowledge_gap, low_accuracy, neglected_subject · review: review_due, forgetting_risk, stale
export function allocateByMix(max: number, mix: PeriodMix): Record<MixCategory, number>;   // en büyük kalan; toplam = max

// features/analytics/lib/priority.ts — yeni alanlar isteğe bağlı; verilmezse Faz 4 sonucu birebir
export function priorityScore(input: {
  examQuestionCount; maxExamQuestionCount; delayDays; kind; accuracy; threshold;
  examProximity?: number;        // 0–1
  targetDelayDays?: number;      // hedef tarihi aşan gün; gecikme = max(delayDays, targetDelayDays)
  subjectGap?: number;           // 0–1; ders = clamp01(examQ / maxExamQ × (1 + subjectGap))
}): number;
// taban = 100 × (0.4·ders + 0.3·zayıflık + 0.3·gecikme)
// yakınlık çarpanı: taban × (1 + PROXIMITY_SWING × examProximity × yön); yön = +1 (weak, review kategorileri), −1 (new_topic)
// PROXIMITY_SWING = 0.25; sonuç 0–100'e kırpılır, yuvarlanır

// features/analytics/lib/suggestions.ts
export function buildSuggestions(input: {
  alerts; plannedTopicIds; plannedSubjectIds; dismissed; settings; maxExamQuestionCount; today;
  strategy?: ReadonlyMap<string, StudentStrategy>;   // öğrenci → bağlam; yoksa Faz 4 davranışı
}): Suggestion[];
// Suggestion + strategyNote?: string ("hedef tarihi 2 hafta geçti" · "bu derste soru hedefinin gerisinde")
// filtre → puan (strateji alanlarıyla) → öğrenci başına: mix varsa allocateByMix(max_per_student, mix) kotası kategori
// bazında puan sırasıyla dolar, dolmayan kota kalan en yüksek puanlılara açılır; mix yoksa Faz 4 kesimi

// features/analytics/lib/distribute.ts
export type DistributeDay = { dayOfWeek: number; availableMinutes: number; date?: string };   // date verilirse anahtar odur (çok hafta)
export type ExistingItem = { dayOfWeek: number | null; subjectId: string | null; minutes: number; date?: string };
export type Placement = { dayOfWeek: number | null; date?: string; suggestion: Suggestion };
// gün seçimi: sığan ve ders sınırını aşmayan günler arasında (o gün aynı dersten görev sayısı ↑, kalan kapasite ↓,
// dizi sırası ↑) — ders çeşitliliği kuralı (karışık pratik); Faz 4 testlerinde beklenen gün değişen senaryolar
// (aynı ders iki öneri) güncellenir. Tek hafta kullanımı sürer; çok haftalık ufuk `date` anahtarıyla hazırdır (08 §5)
```

`getStrategyContext` hesapları: `daysToExam = daysUntil(exam_date)`; `topicDelayDays` yalnızca `target_on < today` ve bitmemiş konular; `subjectGap` hedef yoksa boş Map; `mix` kurum dönemlerinden (`periodFor`). Strateji bağlamı `getSuggestions` çağıran her yerde (K1, K2, plan oluşturucu havuzu, "Önerilen planı hazırla") aynı; ek sorgu iki görünüm (`in student_id`).

**Kabul:** Aynı uyarı kümesi farklı dönemde farklı karışım verir (birim: yeni %0 dönemde `not_started`/`behind_school` önerisi yalnızca kota boş kalırsa ve diğer kategoriler tükenmişse); sınava 30 gün kala aynı puanlı yeni konu önerisi zayıf konunun altına düşer (birim); hedef tarihi geçmiş konu gecikme puanı alır (birim); `distributeTasks` aynı güne aynı dersten üst üste görev koymaz, `date` anahtarıyla iki hafta dağıtır (birim); `strategy` verilmeyince Faz 4 öneri testleri aynen geçer; e2e yukarıdaki akış; `pnpm check` yeşil.

## 3. Ortak yapılar

### 3.1 `src/lib/strategy/` haritası

| Dosya | Fonksiyonlar | Kullanan |
|---|---|---|
| `periods.ts` | `periodFor`, `suggestSeasonPeriods`, `examProximity` | core (ayar formu), analytics (bağlam), goals (hedef formu varsayılanı değil; sınav tarihi yeter) |
| `school-calendar.ts` | `distributeEvenly`, `schoolLagWeeks` | topics (takvim görünümü, hücre detayı), analytics (`behind_school`) |
| `back-plan.ts`, `split.ts` | `backPlanTopics`, `splitQuestions` | goals |
| `feasibility.ts` | `feasibility`, `feasibilityText` | goals |
| `pace.ts` | `topicPace`, `subjectPace`, `paceSentence`, `paceLabel` | topics (Bugün kartı), core (K1 sütunu), goals/analytics (K2) |
| `mix.ts` | `mixCategoryOf`, `allocateByMix` | analytics |

Hepsi yapısal tip alır (`features/*` import etmez), tarih hesapları `lib/dates` ile (İstanbul, hafta pazartesi), metinler `lib/format` ile. Tanımlar tek yerde (net takvim konumu; 2026-09-18 düzeltmesi): **bitmiş** = `completed | mastered`; **beklenen** = hedefi bugün ya da öncesi olan konular (bitmiş olsun olmasın; geri planlama bitmişlere de hedef verdiği — `completed_at` günü — için yeniden üretimden sonra bitmişler beklenene girer; hedefinden önce bitirilen ya da hedefsiz bitmiş konu takvimin önündedir, beklenene girmez); **geride** = max(0, beklenen − bitmiş); **ileride** = max(0, bitmiş − beklenen); **hız** = son `pace_window_days`'de biten konu × 7 / pencere. Konu bazlı "hedefi geçti" (hedefi bugün ya da öncesi ve bitmemiş) yalnızca Hedef sekmesindeki listede rozet ve ders özetindeki "N gecikmiş" sayısıdır; gidişat cümlesi, K1 sütunu ve K2 kutusu net konumu kullanır ("9 konu bitmiş ama 4 konu geride" gibi çelişkili durum yok). K2 ders tablosu sütunu "Konu (bitti / bugüne kadar hedeflenen)": ikinci sayı beklenen; bitmişler hedefli olduğu için ≥ bitti. Faz 5 kapanış düzeltmesi (2026-09-18): önceki sürüm bitmiş konulara hedef vermiyordu → "4 / 0" satırları, listede "Hedef yok", her bitmiş konu ileride sayılıyordu ("takvimin 9 konu ilerisinde").

### 3.2 Yazım ve renk

Öğrenci: "sen", tek cümle, suçlayıcı dil yok ("gerisindesin" durum bildirir, "geride kaldın" gibi yargı yok); uyarı/hata rengi yok; fosforlu yalnızca tüm konular bitince. Koç: nötr ve sayısal ("−3 konu", "haftada 18 saat gerekiyor, 12 saat boş"); gerçekçilik cümlesi bilgi ikonuyla `ink-700`, uyarı rengi kullanılmaz (sistem uyarısı değil). Ders rengi yalnızca ders satırlarındaki rozet; gidişat çubuğu, takvim sütunu ve özet kutusu ders rengi kullanmaz (04 §4.2). Sayılar `lib/format` (`formatSigned` ile U+2212, `formatDuration`, `formatWeekRange`).

### 3.3 Havuz kategorileri

`TaskPoolCategoryId = "suggestions" | "behind" | "weak" | "not_started" | "review_due" | "frequent"` (Faz 7: `resources`, `videos`); sıra: öneriler, okulun gerisinde, zayıf konular, hiç başlanmamış, tekrar zamanı, sık kullanılan. `behind` boş metni: "Okul takvimi doldurulmadıysa bu kategori boş kalır (Şablonlar → Takvim)."

## 4. Kurum ayarı ve yeniden doğrulama

`getOrgSettings().strategy` core'dan; topics, goals, analytics index üzerinden alır. `updateOrgSettings` `revalidatePath` listesi + `/coach/templates`, `/coach/students/[studentId]/target`. `setStudentTargets` / `updateTopicTarget` / `applyWeeklyGoalSuggestion` → `/student/today`, `/student/topics`, `/coach/students`, `/coach/students/[studentId]` (+ `target`), `/coach/plans`. `setTopicSchoolDates` → mevcut `TEMPLATE_PATHS` (+ `/coach/students`, uyarılar için). `setWakeWindow` → program ve plan sayfaları.

## 5. Faz 6+ kancası

| Yapı | Faz 5 | Sonraki ek |
|---|---|---|
| `topics.school_finish_on` | Şablon düzeyi tek takvim | `students.school_calendar_offset_days` (öğrenci bazlı kaydırma: `schoolLagWeeks` girdisine eklenir, imza aynı); `copy_curriculum_template` tarihleri yıl farkı kadar kaydırır |
| `StudentStrategy.subjectGap` | Soru hedefi açığı | Deneme yanlışları (`mock_wrong_total`, Faz 6) ders açığına ikinci bileşen olarak; ağırlık kurum ayarına |
| `v_topic_alert_facts.target_on` | `behind_school` yalnızca okul tarihi | Tekrar modülü (`v_review_queue`) gelince `review_due` oradan; hedef gecikmesi `TopicAlert.delayDays`'e taşınabilir |
| `paceSentence` | Öğrenci Bugün | Veli özeti (Faz 8, "siz" dili: "Elif 54 konunun 9'unu bitirdi"); haftalık özet üretimi |
| `distributeTasks({ days: [{ date }] })` | Anahtar hazır, tek hafta | Geri planlama ufku: `student_topic_targets` haftalarına göre çok haftalık taslak ("Sonraki 4 haftayı hazırla"), `plan_templates` |
| `periods` (kurum ayarı) | Tek sezon | Sezon başına dönem (şablona bağlı tablo) yalnızca çok kurum/çok şablon olursa |
| `feasibility.minutesPerQuestion` | Kurum değeri | `v_student_subject_pace` ders temposu (Faz 4 verisi hazır) |

## 6. Kararlar (2026-09-18, onaylandı)

Parça oturumları bu kararları verili kabul eder; faz sonunda 02 karar kaydına özetlenir.

| # | Konu | Karar | Değerlendirilen alternatif |
|---|---|---|---|
| B1 | Okul takvimi alanı | `topics.school_finish_on date`; hafta olarak gösterilir, gecikme hafta çözünürlüğünde (§1.3 tartışması) | Sezon başına göreli hafta numarası + başlangıç tarihi ve ara tatil eşlemesi |
| B2 | Sezon dönemleri | `organizations.settings.strategy.periods` (JSON, mevcut ayar formunda liste editörü) | `season_periods` tablosu (RLS + pgTAP + şablona bağ) |
| B3 | Varsayılan dönemler | Migration `periods: []`; `suggestSeasonPeriods(examDate)` saf önerisi ayar formunda "Varsayılanları öner"; seed yerel kuruma dolu yazar | Migration'a sabit LGS 2027 tarihleri |
| B4 | Konu hedef tarihleri | `student_topic_targets` tablosunda saklı; koç tek tek düzenler; yeniden üretim onaylı | Her açılışta hesaplamak (öğrenci hep "uyumlu" görünür) |
| B5 | Geri planlama sırası | Okul tarihi dolu konular tarih sırasıyla önce, kalanlar dersler arası sıra-sıra; **okul kelepçesi** (2026-09-18 güncellemesi): okul tarihi olan konunun hedefi okul tarihinden önce olamaz (`max(yayılım, okul)`, bitiş tarihiyle sınırlı); koç tek tek düzenleyerek öne alabilir | Ders ders blok; kelepçesiz yayılım (ilk sürüm: hedef 31 Ağustos, okul 19 Ekim gibi tutarsız çiftler üretiyordu) |
| B6 | "Hedef" sekmesi | `goals` modülünün `coachStudentTabs` girdisi (`target`, order 35); yeni modül kimliği yok | `strategy` modülü (ayrı aç/kapat) |
| B7 | Öğrenci gidişat | topics Bugün kartı genişler (cümle + ince çubuk + takvim çentiği); hedef yoksa mevcut kart | Ayrı analytics/goals kartı |
| B8 | `behind_school` kapsamı | Bitmemiş konuların hepsi (`studying` dahil), tolerans `school_lag_weeks` = 2; öğrenci Bugün kartında gösterilmez | Yalnızca `not_started` |
| B9 | Sınav yakınlığı | `examProximity = clamp01(1 − kalanGün / proximity_days)`; çarpan `1 ± 0.25 × proximity` (zayıf/bakım +, yeni −); gecikme `max(uyarı, hedef)`; ders `× (1 + açık)` | Ağırlıkları dönemle değiştirmek; ayrı "sınav yakınlığı" terimi |
| B10 | Uyanık aralık | `students.wake_start / wake_end` nullable, boşsa kurum ayarı; zorunlu değil; koç Program sekmesinden yazar | `student_modules.settings`; zorunlu alan |
| B11 | Yol haritası | Faz 5 strateji, 6 denemeler ve yanlış defteri, 7 kaynaklar ve videolar, 8 veli paneli ve bildirimler, 9 ekstralar, 10 sağlamlaştırma; 01 buna göre düzenlendi | Strateji katmanını "Faz 4.5" saymak |
| B12 | Veli görünürlüğü | Kapsam dışı; veli özeti Faz 8 | Veli özetine gidişat cümlesi şimdi |
| B13 | Haftalık hedef türetme | Otomatik değil: koç "Haftalık hedefi buna göre öner"e basar, önerilen değeri görür, "Uygula" ile `setGoals` | Hedef kaydında otomatik güncelleme |
| B14 | Dönem editörü | 1–6 satırlı liste (ad, tarih aralığı, üç yüzde), çakışma yok, boşluk serbest | Sabit üç adlandırılmış satır |
| B15 | e2e | Üç spec: `curriculum-calendar`, `targets`, `strategy-suggestions`; ekran görüntüleri `docs/tasarim/uygulama-5/`. Faz kapanışı (2026-09-18): kurum ayarını değiştiren `curriculum-calendar` ve `strategy-suggestions` `e2e/shared/` altında `shared-desktop` projesinde seri koşar (02 karar #47) | Tek birleşik spec |
| B16 | Konuları bitirme tarihi varsayılanı | `exam_date − strategy.topics_finish_weeks_before_exam` (8 hafta; tekrar ve deneme payı); koç değiştirir; gerçekçilik bu tarihe göre | Dönem 1'in bitişi |
| B17 | Okul takvimi paylaşımı | Şablon düzeyi tek takvim; farklı okullar için sınırlama belgede; öğrenci bazlı kaydırma Faz 6+ (§5) | Öğrenci başına takvim tablosu şimdi |
