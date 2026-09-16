# Bulut Kurulumu (Supabase + Vercel)

> Tek koç, birkaç öğrenci, ücretsiz plan. Şema yalnızca migration'larla gider; dashboard'da sadece Auth ayarları yapılır.

## 1. Supabase projesi

- [supabase.com](https://supabase.com) → New project → bölge **Frankfurt (eu-central-1)**, güçlü bir veritabanı şifresi (parola yöneticisine kaydet).
- Yerelde bağla ve migration'ları uygula:
  ```bash
  pnpm exec supabase login
  pnpm exec supabase link --project-ref <proje-ref>
  pnpm exec supabase db push
  ```
- **Seed bulutta çalıştırılmaz** (`seed.sql` yalnızca yerel demo verisidir; `db push` seed uygulamaz).
- Her yeni migration'dan sonra: `pnpm db:reset && pnpm db:test` yerelde yeşilse `pnpm exec supabase db push`.

## 2. Dashboard → Authentication

- **Hooks → Customize Access Token (JWT) Claims**: `public.custom_access_token_hook` seç, etkinleştir. (Açılmazsa giriş yine çalışır; proxy sadece oturum kontrolü yapar, rol yönlendirmesini layout yapar.)
- **Sign In / Providers → Email**: "Confirm email" **kapalı**. Veliler davet koduyla geldiği için e-posta doğrulaması gerekmez; kayıttan sonra doğrudan `/consent` açılır. (Uygulama doğrulama açıkken de çalışır; o zaman özel SMTP ve `supabase/templates/confirmation.html` şablonu gerekir.)
- **URL Configuration**: Site URL = `https://<uygulama-alan-adi>`; Redirect URLs'e `https://<uygulama-alan-adi>/**` (önizleme için `https://*-<vercel-takim>.vercel.app/**`).
- Rate limit ve şifre uzunluğu varsayılan kalabilir.

## 3. Vercel ortam değişkenleri

Supabase → Project Settings → API Keys'ten (yeni anahtarlar):

| Değişken | Değer |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` (sadece sunucu; "Sensitive" işaretle) |
| `STUDENT_EMAIL_DOMAIN` | `ogrenci.<alan-adi>` (bu adrese e-posta gitmez) |
| `NEXT_PUBLIC_SITE_URL` | `https://<uygulama-alan-adi>` |

Production ve Preview için ayrı Supabase projesi yoksa aynı değerler ikisine de girilir. `MAILPIT_URL` bulutta yok.

## 4. İlk owner ve koç hesabı

En basiti Supabase dashboard + SQL Editor, iki adım:

1. **Authentication → Users → Add user**: e-posta + şifre, "Auto Confirm User" işaretli. Oluşan kullanıcının UUID'sini kopyala.
2. **SQL Editor** (bir kez):
   ```sql
   insert into public.organizations (id, name, slug)
   values (gen_random_uuid(), 'Kurum Adı', 'kurum') returning id;

   insert into public.profiles (id, organization_id, role, full_name)
   values ('<auth-user-uuid>', '<organization-id>', 'owner', 'Ad Soyad');
   ```
   Tek koçlu kurumda owner aynı zamanda koçtur; ayrı koç istenirse aynı iki adım `role = 'coach'` ile tekrarlanır. Öğrenci ve veliler uygulamadan eklenir (`/coach/students`).

## 5. İlk kontrol

- `/login` ile owner girişi → `/coach` açılıyor mu?
- Bir test öğrencisi oluştur, kullanıcı adıyla giriş yap, sonra sil.
- Veli daveti üret, kendi e-postanla kayıt ol → `/consent` → `/parent`.
