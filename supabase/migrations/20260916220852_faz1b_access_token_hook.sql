-- Faz 1b: custom_access_token hook (02-mimari karar #21).
-- Auth sunucusu her token üretiminde bu fonksiyonu supabase_auth_admin rolüyle çağırır;
-- profiles.role değeri `app_metadata.user_role` claim'i olarak eklenir. Claim yalnızca
-- proxy.ts'deki rol bazlı yönlendirme (kullanıcı deneyimi) içindir; yetki kararları her
-- istekte veritabanından okunan profile ve RLS'ye dayanır.
-- Yerelde config.toml [auth.hook.custom_access_token] ile, üretimde Dashboard → Auth → Hooks
-- ile açılır. Hook kapalıysa claim gelmez; proxy sadece oturum kontrolü yapar.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_claims jsonb;
begin
  select role into v_role
  from public.profiles
  where id = (event->>'user_id')::uuid;

  if v_role is null then
    return event;                              -- profil yok: claim eklenmez
  end if;

  v_claims := coalesce(event->'claims', '{}'::jsonb);
  if v_claims->'app_metadata' is null then
    v_claims := jsonb_set(v_claims, '{app_metadata}', '{}'::jsonb);
  end if;
  v_claims := jsonb_set(v_claims, '{app_metadata,user_role}', to_jsonb(v_role::text));

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

-- Sadece Auth sunucusu çağırabilir.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- Hook, profiles'ı okur: tablo yetkisi + RLS politikası (supabase_auth_admin RLS'ye tabidir).
grant select on table public.profiles to supabase_auth_admin;

create policy profiles_auth_admin_select on public.profiles
  for select to supabase_auth_admin
  using (true);
