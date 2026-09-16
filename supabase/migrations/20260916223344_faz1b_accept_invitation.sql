-- Faz 1b: veli daveti kabulü (03-veri-modeli.md Bölüm 7; 02 karar #20).
-- Veli e-postasını doğrulayıp oturum açtıktan sonra çağırır. Kod geçerli, süresi dolmamış ve
-- kullanılmamışsa: profili yoksa davetin kurumunda role = 'parent' profil oluşturur, profili
-- varsa role = 'parent' ve aynı kurum olmalı (öğrenci/koç kabul edemez); student_parents
-- bağlantısını kurar; daveti kullanılmış işaretler (for update: tek kullanımlık).
-- Her başarısızlık aynı hata: 'invalid_invitation' (kod var mı / süresi mi doldu sızdırılmaz).

create or replace function public.accept_invitation(
  p_code text,
  p_full_name text,
  p_relation public.parent_relation
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_inv public.invitations%rowtype;
  v_me public.profiles%rowtype;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
begin
  if v_uid is null then
    raise exception 'invalid_invitation' using errcode = '42501';
  end if;

  select * into v_inv
  from public.invitations
  where code = v_code
    and role = 'parent'
  for update;

  if v_inv.id is null
     or v_inv.used_at is not null
     or v_inv.expires_at <= now()
     or v_inv.student_id is null then
    raise exception 'invalid_invitation' using errcode = 'P0001';
  end if;

  select * into v_me from public.profiles where id = v_uid;

  if v_me.id is null then
    if p_full_name is null or length(trim(p_full_name)) < 2 then
      raise exception 'invalid_invitation' using errcode = 'P0001';
    end if;
    insert into public.profiles (id, organization_id, role, full_name)
    values (v_uid, v_inv.organization_id, 'parent', trim(p_full_name));
  elsif v_me.role <> 'parent' or v_me.organization_id <> v_inv.organization_id then
    raise exception 'invalid_invitation' using errcode = 'P0001';
  end if;

  insert into public.student_parents (student_id, parent_id, relation)
  values (v_inv.student_id, v_uid, p_relation)
  on conflict (student_id, parent_id) do nothing;

  update public.invitations
  set used_by = v_uid, used_at = now()
  where id = v_inv.id;

  return v_inv.student_id;
end;
$$;

revoke execute on function public.accept_invitation(text, text, public.parent_relation) from public, anon;
grant execute on function public.accept_invitation(text, text, public.parent_relation) to authenticated;
