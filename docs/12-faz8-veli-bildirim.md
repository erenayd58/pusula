# Faz 8: Veli Paneli ve Bildirimler

> Tasarım belgesi (2026-09-20, onaylandı). Kararlar §7'de; faz sonunda 02 karar kaydına #50 olarak özetlenir. **Tek parça**: §2 uygulama sırasıdır, parça sınırı yoktur. Ölçek kuralı: tek koç, birkaç öğrenci — en basit çalışan çözüm; RLS tavizsiz. Görsel referans: `docs/tasarim/ekran-goruntuleri/veli-telefon.png` (V1); 04 §8.3 kuralları geçerli (plan uyumu çubuğu ve net değişimi `ink`, "Mesajlar" → "Notlar").

**Neden:** veli Özet sayfası yalnızca son deneme kartını çiziyor (Faz 6b `parentSummary` kalıbı); `coach-notes` ve `announcements` modülleri yalnızca manifest (tablo yok; 03 §4.4c taslak); `notifications` klasörü boş; 01 §7 uyarı listesinin öğrenci düzeyi satırları (hareketsizlik, hedef geride, net düşüşü, plan uyumu düşük, birikmiş tekrar) K1'de yok; pg_cron kurulmadı.

## 0. Kapsam ve ilkeler

**Kapsam:** (1) veli paneli V1 (Özet kartları modüllerden, Notlar sekmesi, görünürlük ayarı); (2) bildirim altyapısı (`notifications`, zil, liste, okundu, tercihler, olay bazlı 5 tür); (3) pg_cron (günlük tekrar hatırlatması + hareketsizlik, pazar haftalık özet); (4) 01 §7 öğrenci düzeyi koç uyarıları (eşikler kurum ayarında, K1/K2, hızlı eylem); (5) e-posta kararı (§5). **Ön koşul:** `coach_notes` ve `announcements` tabloları + asgari arayüzleri (not olmadan "veliye açık not" kartı, duyuru olmadan "duyuru" bildirimi olmaz; 03 §4.4c taslakları sadeleştirilerek uygulanır).

**Kapsam dışı:** push/PWA (Faz 9; `push_subscriptions` yok), canlı mesajlaşma, tekrar sistemi (`mark_reviewed`, `review_stage`, yanlış tekrarı) ve ısı haritası (Faz 6b sonra), soru kartları, görüşme kayıtları/aksiyon maddeleri (`meetings`), e-posta gönderimi (E1), yazdırılabilir veli raporu (Faz 9), Faz 6/7 kancalarındaki ek bildirim türleri ("koç deneme ekledi", "kaynak/liste atadı", "öğrenci kaynak ekledi" — §6; enum'a değer eklemek yeter).

**İlkeler:** bildirim metni veritabanında değil uygulamada üretilir (tür + `data` → `lib/format` ile Türkçe, role göre "sen/siz"); tetikleyiciler ve cron yalnızca **olgu** yazar. Bildirim üretimi tek fonksiyondan geçer (`private.notify`: tercih + tekrar önleme). Veli ekranında karşılaştırma, sıralama, uyarı rengi, suçlayıcı dil yok; tek etkileşim hafta seçmek ve okumak. Koç uyarıları saf TS kuralıyla (`evaluateStudentAlerts`, birim testli) canlı hesaplanır; cron yalnızca bildirim üretir.

## 1. Veri modeli

### 1.1 Koç notları ve duyurular (`faz8a_notes_announcements`)

```sql
create type note_visibility as enum ('coach_only', 'student', 'parent', 'student_and_parent');

coach_notes (
  id uuid pk,
  student_id uuid not null references students(profile_id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,   -- 03 taslağında not null; koç silinince not kalsın
  body text not null,                       -- 1–1000
  visibility note_visibility not null default 'coach_only',
  is_pinned boolean not null default false,
  created_at, updated_at
)
-- index (student_id, created_at desc), (author_id)

announcements (
  id uuid pk,
  organization_id uuid not null references organizations(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  title text not null,                      -- 1–80
  body text not null,                       -- 1–1000
  audience jsonb not null,                  -- {"roles": ["student","parent"], "student_ids": null | [uuid…]}; check: roles boş değil, ⊆ {student, parent}
  created_at                                -- 03 taslağındaki published_at yok: duyuru taslaksız, yazılınca gider (E3)
)
-- index (organization_id, created_at desc), (author_id)
```

**RLS.** `coach_notes`: öğrenci S (`student_id = auth.uid()` ve `visibility in ('student','student_and_parent')`); veli S (`is_parent_of(student_id)` ve `visibility in ('parent','student_and_parent')`); koç S I U D (`is_coach_of`; insert `author_id = auth.uid()`); tablo yetkisi `authenticated` S I U D. `announcements`: koç/owner S I D (`organization_id = my_org()` ve `my_role() in ('coach','owner')`; insert `author_id` kendisi; U yok — düzenleme yok); **öğrenci ve veli tabloyu okumaz**, duyuru metni bildirime kopyalanır (E3; 03 §5.3 matrisindeki "S (hedef kitlede ise)" satırı bu karara göre düzeltilir). Koç `student_ids` verdiğinde yalnızca kendi öğrencileri hedeflenir (tetikleyici `is_coach_of` kalıbıyla süzer; owner kurumun tümü).

### 1.2 Bildirimler (`faz8b_notifications`)

```sql
create type notification_type as enum (
  'plan_published',      -- öğrenci: koç planı yayınladı
  'note_added',          -- öğrenci ve/veya veli: koç görünür not yazdı
  'announcement',        -- öğrenci / veli
  'mock_result_added',   -- koç: öğrenci deneme sonucu girdi
  'student_note',        -- koç: öğrenci görev notu ya da hafta değerlendirmesi yazdı
  'review_due',          -- öğrenci (günlük cron): tekrar zamanı gelen konular
  'student_inactive',    -- koç (günlük cron): hareketsizlik
  'weekly_summary'       -- öğrenci / veli / koç (pazar cron)
);

notifications (
  id uuid pk,
  recipient_id uuid not null references profiles(id) on delete cascade,
  student_id uuid references students(profile_id) on delete cascade,   -- ilgili öğrenci; koç haftalık özetinde null
  type notification_type not null,
  data jsonb not null default '{}',         -- türe göre olgular (§3.1); metin burada değil
  read_at timestamptz,
  created_at
)
-- index (recipient_id, read_at, created_at desc), (student_id)
-- 03 §4.7'deki title/body/link kolonları YOK (E2): metin ve bağlantı `notificationText(type, data, role)` ile uygulamada

profiles.notification_prefs jsonb not null default '{}'   -- {"weekly_summary": false} → kapalı; anahtar yoksa açık
```

**RLS.** `notifications`: her rol S (`recipient_id = auth.uid()`), U (aynı; kolon düzeyi grant yalnızca `read_at`), I/D **yok** (yalnızca `private.notify` yazar; silme cron saklama süresiyle). `profiles` kolon düzeyi UPDATE grant listesine `notification_prefs` eklenir. `090` matrisi buna göre.

**`private.notify(p_recipient uuid, p_type notification_type, p_student uuid, p_data jsonb, p_dedupe interval default null) returns uuid`** — security definer, `set search_path = ''`, hiçbir role execute verilmez (tetikleyici ve cron'dan çağrılır). Alıcının `notification_prefs->>p_type = 'false'` ise yazmaz; `p_dedupe` doluysa aynı `(recipient, type, student_id)` için `created_at > now() − p_dedupe` satır varsa yazmaz; yoksa ekler ve id döner (null = yazılmadı).

**Tetikleyiciler** (`private.*`, security definer, `after` satır düzeyi):

| Tetikleyici | Tablo / koşul | Alıcı | `data` |
|---|---|---|---|
| `notify_plan_published` | `weekly_plans` update; `old.status = 'draft' and new.status = 'published'` (ilk yayın; sonraki canlı düzenlemeler bildirmez) | öğrenci | `{plan_id, week_start, items_count, has_message}` |
| `notify_note_added` | `coach_notes` insert; `visibility <> 'coach_only'` (görünürlük sonradan değişirse bildirim yok) | `student` → öğrenci; `parent` → tüm velileri; `student_and_parent` → ikisi | `{note_id, author_name, excerpt (ilk 120 karakter)}` |
| `notify_announcement` | `announcements` insert | `audience.roles` ∋ student → hedef öğrenciler (aktif, `student_ids` null ise koçun/owner'ın tümü); ∋ parent → o öğrencilerin velileri (her veli çocuk başına bir satır; `student_id` dolu) | `{announcement_id, title, body}` |
| `notify_mock_result` | `mock_exam_results` insert; `new.created_by = new.student_id` (koç kendi girdiğinde bildirim yok) | koç (`students.coach_id`) | `{result_id, taken_on, title (katalog ya da custom_title), is_branch}` — net alt satırlar sonra yazıldığı için burada yok |
| `notify_student_note` | `plan_items` update: `student_note` boştan doluya; `weekly_plans` update: `student_reflection` boştan doluya | koç | `{plan_id, week_start, item_id?, item_title?, excerpt, kind: 'item' \| 'reflection'}` |

### 1.3 Öğrenci düzeyi uyarı olguları (`faz8c_student_alerts`)

Kurum ayarı yeni üst düzey anahtar **`student_alerts`** (sığ birleştirme yeter; `alerts` içine girmez):

```json
{ "inactivity_days": 3,
  "goal_behind": { "from_isodow": 3, "min_percent": 40 },
  "net_drop": 5,
  "low_plan_percent": 50,
  "overdue_reviews_max": 15,
  "inactivity_notify_days": 7 }
```

**`v_review_queue`** (03 §6'da planlı; şimdi yalnızca `item_type = 'topic'`, Faz 6b `mistake` ekler): `v_topic_alert_facts` üzerinden, TS `review_due` kuralının birebir SQL'i — bitmiş (`completed | mastered`) ve `completed_at` dolu konu; `m` = `alerts.review_due_days` içinde `completed_at`'ten bu yana geçen güne ≤ en büyük değer; `due_on = completed_at::date + m`; `last_topic_log_date >= due_on` ya da `last_reviewed_at::date >= due_on` ise kuyrukta değil. Kolonlar: `student_id, organization_id, coach_id, item_type, item_id, subject_id, subject_name, subject_short_name, subject_color, topic_name, due_on, overdue_days (bugün − due_on, ≥ 0)`. `security_invoker`. Kullanım: günlük hatırlatma, K1 "Birikmiş tekrar", `v_coach_student_overview.overdue_reviews`. TS `evaluateTopicAlerts.review_due` kuralı bu fazda değişmez; pgTAP aynı fixture'da iki tanımın örtüştüğünü doğrular (E6).

**`v_coach_student_overview`** (drop + create, Faz 5b/6a kalıbı, kolon sona): `+ overdue_reviews int` (kuyrukta `due_on <= bugün` sayısı). K1 tablosuna "Birikmiş tekrar" sütunu (04 §8.4).

Öğrenci düzeyi uyarılar **tablo/görünüm değil**: `evaluateStudentAlerts(rows, thresholds, today)` saf TS (§3.2) `listStudents()` satırlarından hesaplar; olgu kolonları hazır (`last_log_date`, `week_goal_percent`, `net_delta`, `plan_percent_last_week`, `overdue_reviews`).

### 1.4 Zamanlanmış işler (`faz8d_cron`)

```sql
create extension if not exists pg_cron with schema pg_catalog;   -- yerel CLI ve bulut aynı (shared_preload_libraries hazır)
```

03 §5.1 "eklenti notu": `cron.*` fonksiyonları PUBLIC execute'suz doğar; iş `postgres` olarak çalışır, grant gerekmez. Üç fonksiyon `private.*`, security definer, execute verilmez, `postgres` çağırır (RLS'yi geçer):

| Fonksiyon | cron (UTC; İstanbul sabit UTC+3, yaz saati yok) | Ne yapar |
|---|---|---|
| `private.send_daily_reminders()` | `30 4 * * *` (07:30) | Aktif ve `topics` modülü açık her öğrenci için `v_review_queue` sayısı > 0 ise `review_due` (`data {count, topics: ilk 3 ad}`; dedupe 20 saat). Ardından saklama: `created_at < now() − 90 gün` bildirimleri siler (teknik sabit, eşik değil) |
| `private.detect_inactivity()` | `0 18 * * *` (21:00) | Aktif öğrencide `last_log_date` dolu ve `bugün − last_log_date >= student_alerts.inactivity_days` ise koça `student_inactive` (`{days}`; dedupe `inactivity_notify_days`). Hiç kaydı olmayan yeni öğrenci kurulum uyarısında (`no_logs`) zaten var, burada üretilmez |
| `private.generate_weekly_summaries()` | `0 17 * * 0` (Pazar 20:00) | Bu ISO haftası (pazartesi–pazar 20:00) için aktif her öğrenci: `questions`, `study_minutes` (`v_student_daily_summary`), `plan_done / plan_total / plan_percent` (`v_plan_completion`, yayınlanmış), `topics_done_week` (`completed_at` bu hafta), `last_net` (varsa) → öğrenciye ve her velisine `weekly_summary` (`{week_start, …}`); her koça tek toplu satır (`student_id` null; `{week_start, students: [{student_id, name, questions, plan_percent}], totals}`) |

`select cron.schedule('pusula_daily_reminders', '30 4 * * *', $$select private.send_daily_reminders()$$)` biçiminde üç iş; ad tekil, `cron.schedule(name, …)` tekrar koşulan migration'da günceller. 02 §10 tablosu bu üç satırla değiştirilir (`refresh_review_queue` gereksiz: kuyruk canlı görünüm). Yerelde de kurulur (zararsız); pgTAP fonksiyonları doğrudan çağırır, `cron.job` satırlarını sayar.

## 2. Uygulama sırası (tek parça)

Katman sırası korunur: migration → pgTAP → politikalar → tipler → queries/actions → arayüz → testler. Her adım sonunda `pnpm check`; şema adımlarında `pnpm db:reset` + `pnpm db:test`.

### Adım 1 — Şema ve testler
- Migration'lar: `faz8a_notes_announcements`, `faz8b_notifications`, `faz8c_student_alerts`, `faz8d_cron` (§1). Kolon düzeyi grant'lar, `private.default_org_settings()` + mevcut kurumlara `student_alerts`.
- pgTAP: `260_coach_notes` (5 senaryo + görünürlük matrisi), `265_announcements` (koç kendi kurumu S I D, U 42501, `audience` check 23514, öğrenci/veli 42501), `270_notifications` (kendi satırı S, `read_at` U, başka kolon 42501, insert/delete 42501, başkasının satırı 0, anon 42501; `notify` tercih + dedupe; her tetikleyici; `profiles.notification_prefs` kendi satırı), `275_review_queue_cron` (kuyruk kuralı; overview `overdue_reviews`; RLS; üç cron fonksiyonu; `cron.job` 3 satır), `090`, `110`.
- `pnpm db:types`.

### Adım 2 — Saf katman (birim testli)
- `features/notifications/lib/text.ts`: `notificationText({ type, data, role, studentName }) → { title, body, href }` (§3.1).
- `features/analytics/lib/student-alerts.ts`: `evaluateStudentAlerts`, `studentAlertReason`, `studentAlertAction` (§3.2).
- `lib/strategy/pace.ts`: `paceSentence(p, hasTargets, { audience: 'student' | 'parent', name })` — imza uyumlu ek parametre; veli: "Ayşe 54 konunun 9'unu bitirdi · takvimin 3 konu gerisinde" (yargısız).

### Adım 3 — `coach-notes` modülü
- `schemas.ts`, `types.ts` (`CoachNote`), `server/queries.ts` (`listNotes(studentId)` — RLS süzer; `getLastParentNote`; `getPinnedNote`), `server/actions.ts` (`createNote`, `updateNote`, `deleteNote`, `togglePin`; koç/owner).
- Bileşenler: `note-form.tsx` (gövde + görünürlük çipleri `radiogroup`: "Sadece ben" / "Öğrenci" / "Veli" / "Öğrenci ve veli"; sabitle), `note-list.tsx` (`audience` prop: koç sürümü düzenle/sil/sabitle, öğrenci/veli salt okunur; sabitlenmiş önce, sonra tarih azalan), `pinned-note-card.tsx` (K2 Genel bakış), `widgets.ts` → `parentSummary` `ParentLastNoteWidget` (order 70; not yoksa kart yok).
- Rotalar: K2 `coach/students/[studentId]/notes` (`?new=1` formu açık; K1 "Not yaz" hızlı eylemi), öğrenci `student/notes` (manifest `nav.student` order 60, mobil değil; "Ben"e bağlantı), veli `parent/[studentId]/notes`.

### Adım 4 — `announcements` modülü
- `createAnnouncementSchema` (title 1–80, body 1–1000, roles ⊆ {student, parent} en az bir, studentIds null | uuid[]), `listAnnouncements`, `createAnnouncement`, `deleteAnnouncement`; `announcement-form.tsx` (hedef çipleri "Öğrenciler" / "Veliler", "Tüm öğrenciler" / seçim), `announcement-list.tsx`; rota `coach/announcements`. Öğrenci/veli duyuruyu bildirim listesinde okur (E3).

### Adım 5 — `notifications` modülü ve zil
- `module.ts` (`core: true`, nav yok — E4), `server/queries.ts` (`getUnreadCount()` React `cache`; `listNotifications(limit 50)`; `getNotificationPrefs()`), `server/actions.ts` (`markRead`, `markAllRead`, `setNotificationPrefs`; üç rol).
- Bileşenler: `notification-bell.tsx` (sunucu: sayı + `Link`; `aria-label` sayı ile; rozet `ink-900`, uyarı rengi yok; 0 ise rozet yok), `notification-list.tsx` (türe göre lucide ikon, başlık, gövde, tarih; okunmamış kalın + nokta; satır `Link` → `href`, istemci tıklamada okundu; "Tümünü okundu işaretle"; boş: "Henüz bildirim yok."), `notification-prefs-form.tsx` (rolün türleri için `Switch` listesi; anında kaydeder).
- Kabuk yerleşimi: koç `CoachSidebar` marka satırı sağı + telefon üst barı; öğrenci telefon üst barı sağ + `StudentRail`; veli üst bar (çıkışın solu). Bağlantı `/{role}/notifications`.
- Rotalar: `student/notifications`, `coach/notifications`, `parent/notifications` (statik segment) — liste + altta "Bildirim tercihleri"; `loading.tsx` + `error.tsx`.

### Adım 6 — Veli paneli (V1)
- `define-module.ts`: `ParentSummaryWidgetProps = ModuleWidgetProps & { weekStart: string }`. Özet sayfası `?week=` (`resolveWeekParam`) okur, kartlara verir; `[studentId]/layout.tsx` başlığı yalnızca ad, hafta seçici (‹ 14 – 20 Eylül ›, gelecek hafta yok) Özet sayfasının başında (E5). `getParentNav(enabled, { details })`: `SegmentItem.requiresDetails?: true` olan sekme yalnızca `can_view_details` velide (E8).
- Kartlar (`order`): `planner` `ParentPlanWidget` 10 ("Ayşe bu hafta planının %80'ini tamamladı." + `ProgressBar` `ink-900`; plan yoksa "Bu hafta yayınlanmış plan yok."); `question-log` `ParentWeekStatsWidget` 20 (iki `StatTile`: soru, süre) ve `ParentSubjectWeekWidget` 50 (ders bazlı çubuklar); `topics` `ParentPaceWidget` 30 (gidişat cümlesi); `mock-exams` mevcut kart 40; `resources` `ParentResourceWidget` 60 ("3 kitapta %42") ve `videos` `ParentVideoWidget` 61 ("12 videonun 5'i izlendi") (E9); `coach-notes` 70. Hepsi `clay-sm`, "siz" dili, fosforlu/uyarı/ders-dışı ders rengi yok.
- Veli görünürlüğü: `core` K2 Genel bakış "Veliler" kartı (`listStudentParents`: ad, ilişki, bağlanma tarihi; `Switch` "Yanlış defterini görebilir" → `setParentDetails`). `mistakes` manifestine `nav.parent` `mistakes` (`requiresDetails: true`) + `parent/[studentId]/mistakes` (salt okunur liste, fotoğraf imzalı URL; C10 kapanır).

### Adım 7 — Koç uyarıları (01 §7)
- `org-settings.ts` `student_alerts`; `OrgSettingsForm` "Öğrenci uyarıları" bölümü.
- `analytics`: `StudentAlertFacts`, `StudentAlert { studentId, kind, value }`; `getStudentAlerts(studentId?)`; `student-alert-list.tsx` (uyarı rengi kenar + ikon, sebep, hızlı eylem `Link`); K1'de dikkat bölümünün üstünde, K2 Genel bakış'ta o öğrencinin satırları.
- `core` `StudentListRow.overdueReviews`; K1 tablo "Birikmiş tekrar" sütunu.
- Hızlı eylemler: `inactive` → "Not yaz" (`/notes?new=1`); `goal_behind` → "Hedefi aç" (`#goals`); `net_drop`, `low_plan` → "Planı gözden geçir" (`/plan`); `overdue_reviews` → "Tekrar planı kur" (`/plan`).

### Adım 8 — Seed, e2e, görüntüler, belgeler
- Seed: Ayşe için 3 not, 1 duyuru, örnek bildirimler; Zeynep'e 5 gün önce tek kayıt (`inactive`); Mehmet'in geçen hafta planı %33 (`low_plan`).
- e2e: `notifications.spec.ts`, `parent-summary.spec.ts`, `shared/student-alerts.spec.ts`. Cron fonksiyonları yalnızca pgTAP.
- `pnpm screenshots --only 8` → `docs/tasarim/uygulama-8/`. Belgeler §8.

**Kabul:** Pazar akşamı (pgTAP'ta fonksiyon çağrısıyla) veliye, öğrenciye ve koça haftalık özet düşer; koç plan yayınlayınca öğrencinin zilinde sayı artar ve okununca sıfırlanır (e2e); veli Özet'te plan uyumu, soru/süre, gidişat, son net, ders dağılımı, kaynak/video ve son not kartları "siz" diliyle, geçen haftaya geçilebiliyor (e2e + görüntü); koç veli görünürlüğünü açınca velide Yanlışlar sekmesi görünüyor (e2e + pgTAP kapı); K1'de beş öğrenci düzeyi uyarı kurum ayarındaki eşikle listeleniyor ve hızlı eylem bağlantıları çalışıyor (e2e + birim); `check`, `db:test`, `test:e2e`, `build` yeşil.

**Uygulama notu (2026-09-20, tamamlandı):** §1–§2 dosya listesi uygulandı; farklar ve ekler: `getNotificationPrefs` oturum profilinden okur (`getSessionUser`; RLS'de başka profiller de göründüğü için `profiles … limit(1)` yanlış satırı veriyordu — e2e yakaladı). `notificationPrefsSchema` zod `partialRecord`. `announcements` tetikleyicisi koçu kendi öğrencileriyle sınırlar (`author` rolü owner değilse `coach_id = author_id`). Veli kabuğu başlığı "Ayşe'nin haftası" + "Koç: …" (hafta aralığı Özet'teki seçiciye taşındı; `parent-invite.spec` metni güncellendi). `ParentWeekSelector` ve `ParentVisibilityCard` `features/core` içinde. `MistakeList` `audience: "parent"` (koç gibi salt okunur, fotoğraf diyaloğu). `question-log`: `getWeekSubjectDistribution(studentId, week: Date | string)` hafta anahtarı da alır, `getWeekTotals(studentId, weekKey)` eklendi. Veli soru/süre kutuları `StatTile` yerine `clay-sm` kart (kuyu görünümü V1'e uymuyor). K1 tablosu "Birikmiş tekrar" sütunu (0 → "—"). `notifications` modülü `core: true` olduğu için K2 Modüller listesinde kilitli satır olarak görünür (E4). Seed'de zaman damgaları `(date + time) at time zone` parantezli (operatör önceliği). Bildirim kabuk yerleşimi: koç yan menü marka satırı + telefon üst barı, öğrenci telefon üst barı + ray alt yuvası, veli üst bar. pgTAP `270`/`275` yerel seed'in bildirimlerini/öğrencilerini sayımlardan çıkarır (silme/arşivleme, rollback ile geri). e2e: `notifications.spec` iki projede ayrı adlı öğrenciyle (duyuru onay kutusu ada göre), `shells.spec` veli "Notlar" gerçek sayfa, `mistakes.spec` veli "Yanlışlar" var; `videos.spec` yerelde `YOUTUBE_API_KEY` doluyken "Başlık (isteğe bağlı)" etiketi yüzünden takılır (D17: e2e anahtarsız koşar; sunucu `YOUTUBE_API_KEY=` ile başlatılınca geçer — Faz 7'den kalan ortam notu). Ekran görüntüleri `docs/tasarim/uygulama-8/` (13).

## 3. Ortak yapılar

### 3.1 Bildirim metni (`features/notifications/lib/text.ts`, saf, birim testli)

```ts
export type NotificationRole = "student" | "coach" | "parent";
export function notificationText(input: { type: NotificationType; data: unknown; role: NotificationRole; studentId: string | null; studentName: string | null }): { title: string; body: string; href: string };
```

| Tür | Öğrenci ("sen") | Veli ("siz") | Koç (nötr) |
|---|---|---|---|
| `plan_published` | "Haftalık planın hazır" · "14 – 20 Eylül için 12 görev" → `/student/plan?week=` | — | — |
| `note_added` | "Koçun not yazdı" · alıntı → `/student/notes` | "Koç Ayşe için not yazdı" · alıntı → `/parent/{id}/notes` | — |
| `announcement` | başlık · gövde → bildirim listesi | aynı | — |
| `mock_result_added` | — | — | "Ayşe deneme sonucu girdi" · "Kafa Dengi 6 · 14 Eylül" → `/coach/students/{id}/exams/{resultId}` |
| `student_note` | — | — | "Ayşe görev notu bıraktı" / "haftasını değerlendirdi" · alıntı → `/coach/students/{id}/plan?week=` |
| `review_due` | "3 konunun tekrar zamanı geldi" · "Üslü İfadeler, Basınç, …" → `/student/topics` | — | — |
| `student_inactive` | — | — | "Zeynep 5 gündür kayıt girmedi" → `/coach/students/{id}` |
| `weekly_summary` | "Haftan böyle geçti" · "612 soru çözdün, 14 sa 20 dk çalıştın; planının %80'i tamam." → `/student/today` | "Ayşe'nin haftası" · "Ayşe bu hafta 612 soru çözdü ve 14 sa 20 dk çalıştı; planının %80'ini tamamladı." → `/parent/{id}?week=` | "Haftalık özet" · "3 öğrenci · 1.240 soru · plan uyumu ort. %62" → `/coach/students` |

Sayılar `formatCount` / `formatDuration` / `formatPercent` (NBSP); veri eksikse cümle o parçayı atlar. `data` şemaları zod ile `schemas.ts`'de (`safeParse`; bozuk veri → nötr "Bildirim").

### 3.2 Öğrenci düzeyi uyarı kuralları (`features/analytics/lib/student-alerts.ts`, saf)

```ts
export function evaluateStudentAlerts(rows: readonly StudentAlertFacts[], t: OrgSettings["student_alerts"], today: string): StudentAlert[];
export function studentAlertReason(a: StudentAlert): string;      // "5 gündür kayıt yok" · "Haftalık hedefin %25'i" · "Son denemede −6,33 net" · "Geçen hafta planın %33'ü" · "18 tekrar birikti"
export function studentAlertAction(a: StudentAlert): { label: string; href: string };
```

| Tür | Kural (01 §7) | Olgu |
|---|---|---|
| `inactive` | `last_log_date` dolu ve `bugün − last_log_date >= inactivity_days` (3) | overview |
| `goal_behind` | `isodow(bugün) >= goal_behind.from_isodow` (3 = çarşamba) ve haftalık hedef var ve `week_goal_percent < min_percent` (40) | overview |
| `net_drop` | `net_delta <= −net_drop` (5) — E7: son − önceki (Faz 6 kolonları) | overview |
| `low_plan` | geçen hafta yayınlanmış plan var ve `plan_percent_last_week < low_plan_percent` (50) | overview |
| `overdue_reviews` | `overdue_reviews > overdue_reviews_max` (15) | `v_review_queue` |

Sıra: `inactive → net_drop → low_plan → goal_behind → overdue_reviews`; öğrenci başına birden fazla olabilir. Aktif olmayan öğrenci dışarıda. Motivasyon ve uyku satırları Faz 9 (`checkins`).

### 3.3 Bileşenler ve yazım

- `NotificationBell`, `NotificationList`, `NotificationPrefsForm`, `NoteForm`, `NoteList`, `PinnedNoteCard`, `AnnouncementForm`, `AnnouncementList`, `StudentAlertList`, `ParentWeekSelector`, `ParentVisibilityCard`; 04 §10 envanterine eklenir.
- Veli: "siz", üçüncü tekil ad ("Ayşe … tamamladı"), karşılaştırma/sıralama yok, plan çubuğu ve net değişimi `ink`, uyarı/hata/fosforlu yok, boş durumlar bilgi cümlesi (veli salt okunur). Öğrenci: "sen"; bildirim gövdeleri kısa; tekrar hatırlatması nötr. Koç: nötr, sayısal; uyarı rengi yalnızca uyarı satırı kenarı; bildirim rozeti `ink`.
- Erişilebilirlik: zil 44 px dokunma hedefi, `aria-label` sayı ile; liste satırları `Link`; okunmamış nokta + sr-only "okunmadı"; tercih anahtarları `Switch` etiketli; hafta seçici ok düğmeleri etiketli, klavye.

## 4. Kurum ayarı ve yeniden doğrulama

`getOrgSettings().student_alerts` core'dan; analytics index üzerinden alır. Not eylemleri → `/coach/students`, `/student/notes`, `/student/profile`, `/parent`; duyuru → `/coach/announcements`; `markRead` / `markAllRead` / `setNotificationPrefs` → üç bildirim sayfası + `/student/today`, `/coach/students`, `/parent`; `setParentDetails` → `/coach/students`, `/parent`. Dinamik sayfalar `createAction` statik yol sınırı nedeniyle listede değil (11 §5 kalıbı).

## 5. E-posta kararı (E1)

Bağlam: Supabase'in yerleşik e-posta servisi yalnızca proje ekibi adreslerine, saatte 2 mesaj — üretimde kullanılamaz (veli e-posta doğrulaması zaten kapalı, 02 §9).

| Ölçüt | (a) E-postasız: yalnızca uygulama içi bildirim | (b) Resend bağlamak |
|---|---|---|
| Kurulum | Yok | Resend hesabı, alan adı (şu an `vercel.app`; kendi alan adı gerekir), DNS'te SPF + DKIM (+ DMARC önerilir), API anahtarı Vercel'de |
| Gönderim yolu | — | pg_cron → `pg_net` ile Vercel route handler'ı (`/api/cron/email`, gizli anahtarla) → Resend API; ya da GitHub Actions haftalık iş. Şablon TS'de (`notificationText` yeniden kullanılır) |
| Ücretsiz katman | — | Resend: 3.000 e-posta/ay, 100/gün, 1 alan adı (2026 itibarıyla; değişebilir). Bu ölçekte fazlasıyla yeter |
| Bakım | — | Teslim edilebilirlik (spam), bounce takibi, anahtar rotasyonu, alan adı yenileme; Resend kesintisi uygulama içi bildirimi etkilemez |
| KVKK | Veri uygulama içinde | Veli e-postası ve çocuk adı ABD merkezli üçüncü tarafa gider → aydınlatma metnine yurt dışı aktarım satırı, veli tercihiyle açılır |
| Kullanıcı etkisi | Veli uygulamayı açmadıkça özeti görmez; Faz 9 push bunu kapatır | Pazar akşamı gelen kutusunda özet |
| Maliyet | 0 | 0 ₺ + alan adı + ~1 gün iş |

**Karar: (a).** Tek koç / birkaç öğrenci ve veli; veli özeti uygulama içinde + Faz 9 PWA/push planlı; alan adı ve KVKK metni henüz yok. Tasarım e-postayı kapatmaz: `notifications` satırı kaynak, e-posta yalnızca teslim kanalı (ileride `notification_prefs.email: true` + `email_sent_at` + route handler; Resend kurulumu 07 §3'e, `RESEND_API_KEY`, aydınlatma metni `aydinlatma-v1`).

## 6. Faz 9+ kancası

| Yapı | Faz 8 | Sonraki ek |
|---|---|---|
| `notifications` + `private.notify` | Uygulama içi | Faz 9 web push: `push_subscriptions` (03 §4.7), `notify` sonrası `pg_net` ile push endpoint'i; e-posta kanalı (§5) |
| `notification_type` | 8 değer | `add value`: `resource_assigned`, `playlist_assigned`, `mock_result_by_coach`, `student_resource_added` (10/11 kancaları); `checkin_low` (Faz 9) |
| `v_review_queue` | `item_type = 'topic'` | Faz 6b tekrar sistemi: `'mistake'` satırları, `mark_reviewed`, `review_stage`; TS `review_due` kuralı görünümden okur |
| `evaluateStudentAlerts` | 5 kural | `mood_low`, `sleep_low` (Faz 9 `daily_checkins`); eşikler aynı ayar anahtarında |
| `weekly_summary.data` | Sayılar | Faz 9 yazdırılabilir veli raporu aynı veriden; odak sayacı süresi `study_minutes`'a katılır |
| `coach_notes` | Not + sabitleme | `meetings` (görüşme kaydı, aksiyon maddeleri) ayrı tablo |
| `announcements` | Anında gönderim | Zamanlanmış/taslak duyuru (`published_at`) gerekirse |
| `SegmentItem.requiresDetails` | Yanlışlar sekmesi | Faz 9 `checkins` veli sekmesi aynı bayrakla |
| `ParentSummaryWidgetProps.weekStart` | Hafta seçici | Faz 9 kartları (odak süresi, okuma, seri) aynı prop'la |
| `notification_prefs` | Tür başına aç/kapat | Kanal başına (`email`, `push`) — jsonb değeri nesneye genişler |

## 7. Kararlar (2026-09-20, onaylandı)

| # | Konu | Karar | Değerlendirilen alternatif |
|---|---|---|---|
| E1 | E-posta | **E-postasız** (§5) | Resend |
| E2 | Bildirim metni | **Yalnızca `type + data`, metin `notificationText` ile uygulamada**: sayı/tarih biçimi ve "sen/siz" `lib/format` kuralına uyar, birim testli, e-posta/push aynı fonksiyonu kullanır; 03 §4.7 güncellenir | `title/body/link` DB'de, SQL'de Türkçe metin |
| E3 | Duyuru okuma yüzeyi | **Öğrenci/veli duyuruyu bildirim listesinde okur; tablo koç/owner'a açık; metin `data`'ya kopyalanır**; duyuru düzenlenemez (sil + yeniden yaz), geç katılan eski duyuruyu görmez | Ek liste sayfaları + "hedef kitlede ise" RLS yardımcısı |
| E4 | `notifications` modülü | **`core: true`** (bildirim profil düzeyi; tercihler tür bazında) | Öğrenci bazında açılıp kapanan modül |
| E5 | Veli hafta seçici | **Özet'te `?week=` ile ‹ ›** (geçmiş haftalar), `weekStart` widget prop'u | Yalnızca bu hafta |
| E6 | Tekrar kuyruğu | **`v_review_queue` SQL görünümü** (TS kuralının kopyası, pgTAP örtüşme; Faz 6b'de TS görünümü okur) | Cron'da sade kural |
| E7 | Net düşüşü | **`net_delta <= −eşik`** (son − önceki; eşik 5); 01 §7 satırı güncellenir | 01 §7 "son 2 ort. − önceki 3 ort." |
| E8 | Veli yanlış defteri | **Anahtar + velide "Yanlışlar" sekmesi** (`requiresDetails`, salt okunur; C10 kapanır) | Yalnızca anahtar |
| E9 | Kaynak/video veli kartları | **Bu fazda** | Ertele |
| E10 | Öğrenci notları girişi | **`nav.student` "Notlar" (ray) + "Ben" bağlantısı + bildirim** | Yalnızca "Ben" |

Verili kabul edilenler (istemden): tek parça; veli dili "siz", karşılaştırma yok; yanlış defteri varsayılan kapalı; bildirim tercihleri tür başına aç/kapat; cron UTC ifadeleri İstanbul'a göre; her uyarı kurum ayarından eşiklenir.

## 8. Belge güncellemeleri (uygulama sırasında)

- **01**: §5 modül tablosu (5/6/13/14 → 8 ✅; 7/8 "Faz 8 kartı" ✅), §7 (net düşüşü satırı E7, hızlı eylem eşlemesi), §11 Faz 8 + kabul, §13 açık kararlar.
- **02**: §2 klasör ağacı, §3.2 `ParentSummaryWidgetProps` / `SegmentItem.requiresDetails`, §10 cron tablosu, §11 karar #50.
- **03**: §3 enum'lar, §4.1 `profiles.notification_prefs`, §4.4c → §4.7 uygulanan şema, §5.1, §5.3 matris, §5.4 testler, §6 (`v_review_queue`, overview `overdue_reviews`), §7, §9 seed.
- **04**: §8.3, §8.4, §10 envanter, §14.
- **06**: Faz 8 istemi uygulandı notu. **07**: §2 pg_cron notu. **08 §5 / 09 §5 / 10 §5 / 11 §6**: Faz 8 satırlarına "✅ 12'de".
