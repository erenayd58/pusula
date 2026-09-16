-- Faz 1a: RLS politikaları (03-veri-modeli.md Bölüm 5.3 matrisi).
-- Tüm politikalar `to authenticated`; anon'un tablo yetkisi yok (faz1a_privileges).
-- private.is_coach_of owner'ı da kapsar; bu yüzden "Owner: tümü" satırları çoğu
-- yerde ayrı politika gerektirmez.
-- Kolon kısıtları (profiles, students) politikalarda değil, kolon düzeyi GRANT'ta.

-- organizations -----------------------------------------------------------------
-- Herkes kendi kurumunu okur; sadece owner günceller. I/D yok.

create policy organizations_select on public.organizations
  for select to authenticated
  using (id = private.my_org());

create policy organizations_update on public.organizations
  for update to authenticated
  using (id = private.my_org() and private.my_role() = 'owner')
  with check (id = private.my_org() and private.my_role() = 'owner');

-- profiles ----------------------------------------------------------------------
-- Görünürlük private.can_see_profile; güncelleme kendisi veya owner (kurum içi).
-- INSERT yok (Faz 1b'de secret key), DELETE yok.

create policy profiles_select on public.profiles
  for select to authenticated
  using (private.can_see_profile(id));

create policy profiles_update on public.profiles
  for update to authenticated
  using (
    id = (select auth.uid())
    or (private.my_role() = 'owner' and organization_id = private.my_org())
  )
  with check (
    id = (select auth.uid())
    or (private.my_role() = 'owner' and organization_id = private.my_org())
  );

-- students ----------------------------------------------------------------------
-- Öğrenci, koç/owner ve veli okur; koç/owner günceller (kurum dışına taşınamaz).
-- INSERT/DELETE yok: öğrenci oluşturma ve silme Faz 1b'de secret key ile,
-- veritabanı yetki kontrolünden sonra.

create policy students_select on public.students
  for select to authenticated
  using (private.can_read_student(profile_id));

create policy students_update on public.students
  for update to authenticated
  using (private.is_coach_of(profile_id))
  with check (private.is_coach_of(profile_id) and organization_id = private.my_org());

-- student_parents -----------------------------------------------------------------
-- Öğrenci ve veli kendi bağlantısını okur; koç/owner yönetir. Bağlanan veli aynı
-- kurumda role = 'parent' bir profil olmalı.

create policy student_parents_select on public.student_parents
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or parent_id = (select auth.uid())
    or private.is_coach_of(student_id)
  );

create policy student_parents_insert on public.student_parents
  for insert to authenticated
  with check (
    private.is_coach_of(student_id)
    and private.is_parent_profile_in_my_org(parent_id)
  );

create policy student_parents_update on public.student_parents
  for update to authenticated
  using (private.is_coach_of(student_id))
  with check (
    private.is_coach_of(student_id)
    and private.is_parent_profile_in_my_org(parent_id)
  );

create policy student_parents_delete on public.student_parents
  for delete to authenticated
  using (private.is_coach_of(student_id));

-- invitations ---------------------------------------------------------------------
-- Öğrenci ve veli görmez. Koç: kendi oluşturdukları (S I D); veli daveti sadece
-- kendi öğrencisi için, koç daveti sadece owner. Owner: kurumdaki tümü (S I U D).

create policy invitations_select on public.invitations
  for select to authenticated
  using (
    organization_id = private.my_org()
    and (created_by = (select auth.uid()) or private.my_role() = 'owner')
  );

create policy invitations_insert on public.invitations
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and organization_id = private.my_org()
    and (
      (role = 'parent' and private.is_coach_of(student_id))
      or (role = 'coach' and private.my_role() = 'owner')
    )
  );

create policy invitations_update on public.invitations
  for update to authenticated
  using (organization_id = private.my_org() and private.my_role() = 'owner')
  with check (organization_id = private.my_org() and private.my_role() = 'owner');

create policy invitations_delete on public.invitations
  for delete to authenticated
  using (
    organization_id = private.my_org()
    and (created_by = (select auth.uid()) or private.my_role() = 'owner')
  );

-- consents ------------------------------------------------------------------------
-- Okuma: öğrenci, koç/owner, veli. Ekleme: veli kendi adına (given_by = kendisi,
-- recorded_by boş) veya koç/owner kayıt eden olarak (recorded_by = kendisi).
-- UPDATE/DELETE yok (onay kaydı değişmez; geri çekme Faz 1b'de fonksiyonla).

create policy consents_select on public.consents
  for select to authenticated
  using (private.can_read_student(student_id));

create policy consents_insert on public.consents
  for insert to authenticated
  with check (
    (
      private.is_parent_of(student_id)
      and given_by = (select auth.uid())
      and recorded_by is null
    )
    or (
      private.is_coach_of(student_id)
      and recorded_by = (select auth.uid())
    )
  );

-- student_modules -----------------------------------------------------------------
-- Öğrenci ve veli okur; koç/owner yönetir.

create policy student_modules_select on public.student_modules
  for select to authenticated
  using (private.can_read_student(student_id));

create policy student_modules_insert on public.student_modules
  for insert to authenticated
  with check (private.is_coach_of(student_id));

create policy student_modules_update on public.student_modules
  for update to authenticated
  using (private.is_coach_of(student_id))
  with check (private.is_coach_of(student_id));

create policy student_modules_delete on public.student_modules
  for delete to authenticated
  using (private.is_coach_of(student_id));
