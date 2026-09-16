# LGS 2027 Şablonu (Seed Verisi)

> **Önemli:** Bu liste, 2026-2027 öğretim yılında okutulan mevcut 8. sınıf programına göre hazırlanmış bir başlangıç taslağıdır. 2027 LGS mevcut düzende yapılacak olsa da, üretime almadan önce MEB'in yayımladığı güncel kazanım listesiyle ve sınav kılavuzuyla karşılaştırılmalıdır. Liste veritabanında olduğu için sonradan koç panelinden düzenlenebilir.
>
> MEB, Maarif Modeli'ne uyumlu yeni soru modelinin 2028 LGS'de uygulanacağını açıklamıştır. 2027-2028 grubu için bu şablon kopyalanıp düzenlenecektir.

## 1. Şablon

```json
{
  "name": "LGS 2027",
  "exam_type": "LGS",
  "grade": 8,
  "season": "2026-2027",
  "scoring": {
    "wrong_penalty": 3,
    "sections": [
      { "code": "sozel",  "name": "Sözel bölüm",  "duration_minutes": 75, "subjects": ["TUR", "INK", "DIN", "ING"] },
      { "code": "sayisal", "name": "Sayısal bölüm", "duration_minutes": 80, "subjects": ["MAT", "FEN"] }
    ]
  }
}
```

## 2. Dersler

`color` alanı `04-tasarim-sistemi.md` Bölüm 4.2'deki token önekidir.

| code | name | short_name | color | icon (lucide) | exam_section | exam_question_count | sort_order |
|---|---|---|---|---|---|---|---|
| TUR | Türkçe | Türkçe | subject-tr | BookOpenText | sozel | 20 | 1 |
| MAT | Matematik | Mat | subject-math | Sigma | sayisal | 20 | 2 |
| FEN | Fen Bilimleri | Fen | subject-sci | FlaskConical | sayisal | 20 | 3 |
| INK | T.C. İnkılap Tarihi ve Atatürkçülük | İnkılap | subject-hist | Landmark | sozel | 10 | 4 |
| DIN | Din Kültürü ve Ahlak Bilgisi | Din | subject-rel | BookHeart | sozel | 10 | 5 |
| ING | İngilizce | İng | subject-eng | Languages | sozel | 10 | 6 |

## 3. Konular

> Tasarım dosyalarındaki konu adları (ör. "Paragrafta Yapı", "Olasılık") sadece görsel örnektir. Şablon için esas alınacak liste burasıdır; o da MEB listesiyle doğrulanmalıdır.

Ünite düzeyi konular aşağıdadır. Alt konular (`parent_id`) isteğe bağlıdır; Matematik için örnek olarak verilmiştir. `semester` değerleri okulların ders planına göre değişebildiği için boş bırakılmış, koç tarafından doldurulacaktır.

### Türkçe (beceri temelli, üniteden bağımsız)

1. Sözcükte Anlam (gerçek, mecaz, terim anlam; deyim ve atasözü)
2. Cümlede Anlam
3. Paragrafta Anlam
4. Fiilimsiler
5. Cümlenin Ögeleri
6. Fiilde Çatı
7. Cümle Türleri
8. Yazım Kuralları
9. Noktalama İşaretleri
10. Anlatım Bozuklukları
11. Metin Türleri
12. Söz Sanatları
13. Görsel Okuma ve Sözel Mantık (grafik, tablo, akıl yürütme)

### Matematik

1. Çarpanlar ve Katlar
   - Pozitif tam sayıların çarpanları
   - Asal çarpanlara ayırma
   - EBOB ve EKOK
   - Aralarında asal sayılar
2. Üslü İfadeler
3. Kareköklü İfadeler
4. Veri Analizi
5. Basit Olayların Olma Olasılığı
6. Cebirsel İfadeler ve Özdeşlikler
7. Doğrusal Denklemler
8. Eşitsizlikler
9. Üçgenler
10. Eşlik ve Benzerlik
11. Dönüşüm Geometrisi
12. Geometrik Cisimler

### Fen Bilimleri

1. Mevsimler ve İklim
2. DNA ve Genetik Kod
3. Basınç
4. Madde ve Endüstri
5. Basit Makineler
6. Enerji Dönüşümleri ve Çevre Bilimi
7. Elektrik Yükleri ve Elektrik Enerjisi

### T.C. İnkılap Tarihi ve Atatürkçülük

1. Bir Kahraman Doğuyor
2. Millî Uyanış: Bağımsızlık Yolunda Atılan Adımlar
3. Millî Bir Destan: Ya İstiklal Ya Ölüm!
4. Atatürkçülük ve Çağdaşlaşan Türkiye
5. Demokratikleşme Çabaları
6. Atatürk Dönemi Türk Dış Politikası
7. Atatürk'ün Ölümü ve Sonrası

### Din Kültürü ve Ahlak Bilgisi

1. Kader İnancı
2. Zekât ve Sadaka
3. Din ve Hayat
4. Hz. Muhammed'in Örnekliği
5. Kur'an-ı Kerim ve Özellikleri

### İngilizce

1. Friendship
2. Teen Life
3. In the Kitchen
4. On the Phone
5. The Internet
6. Adventures
7. Tourism
8. Chores
9. Science
10. Natural Forces

## 4. Varsayılan Kurum Ayarları

```json
{
  "review_intervals": [1, 3, 7, 15, 30],
  "leaderboard_enabled": false,
  "student_can_create_goals": false,
  "alerts": {
    "inactive_days": 3,
    "weekly_goal_midweek_percent": 40,
    "net_drop_threshold": 5,
    "plan_completion_min_percent": 50,
    "overdue_reviews_max": 15,
    "low_mood_days": 3,
    "min_sleep_hours": 7
  },
  "default_goals": [
    { "metric": "questions", "period": "daily", "target_value": 100 },
    { "metric": "study_minutes", "period": "weekly", "target_value": 900 }
  ]
}
```

## 5. Varsayılan Rozetler

| code | Ad | Kural |
|---|---|---|
| first_log | İlk adım | İlk soru kaydı |
| q_1000 | Bin soru | Toplam 1.000 soru |
| q_5000 | Beş bin soru | Toplam 5.000 soru |
| streak_7 | Bir hafta | 7 gün seri |
| streak_30 | Bir ay | 30 gün seri |
| plan_perfect_week | Tam hafta | Bir haftalık planın %100'ü |
| subject_all_topics | Ders bitti | Bir dersin tüm konuları "tamamlandı" veya "oturdu" |
| mistakes_10_solved | Yanlıştan öğren | 10 yanlış defteri sorusu "çözüldü" |
