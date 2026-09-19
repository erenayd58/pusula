-- Yanlış defteri (faz6b_mistakes; 10 §1.4, §1.6). 5 senaryo: öğrenci kendi kaydını yazar/okur/
-- günceller/siler, koç kendi öğrencisininkini okur ve günceller ama kayıt AÇAMAZ, başka koç ve
-- başka öğrenci 0 satır, veli yalnızca can_view_details ile görür, anon 42501. Check: solved_at ↔
-- status. Depo: bucket satırı var ve private; storage.objects politikaları (öğrenci kendi klasörüne
-- insert, başka öğrenci klasörüne ve başka kuruma 42501, koç okur, detaysız veli 0 satır; silme politikası
-- varlıkla test edilir — yerel storage şeması doğrudan delete'i engeller, gerçek silme e2e'de).
begin;
select plan(34);
select tests.seed_fixture();
select tests.seed_templates();

-- 1. Öğrenci A kendi kaydını açar. ---------------------------------------------------------------
select tests.authenticate_as('student_a');
select lives_ok(
  $$insert into public.mistakes (id, student_id, subject_id, topic_id, reason, note, created_by)
    values (tests.id('mistake_a1'), tests.id('student_a'), tests.id('subj_org_a'), tests.id('topic_org_a_1'),
            'attention', 'Üslü sayılarda işaret', tests.id('student_a'))$$,
  'öğrenci A kendi kaydını açar'
);
select lives_ok(
  $$insert into public.mistakes (id, student_id, subject_id, created_by)
    values (tests.id('mistake_a2'), tests.id('student_a'), tests.id('subj_org_a'), tests.id('student_a'))$$,
  'fotoğrafsız, konusuz kayıt da olur (neden varsayılan unknown)'
);
select is(
  (select reason from public.mistakes where id = tests.id('mistake_a2')),
  'unknown'::public.mistake_reason,
  'neden varsayılanı unknown (C9)'
);
select throws_ok(
  $$insert into public.mistakes (student_id, subject_id, created_by)
    values (tests.id('student_a'), tests.id('subj_org_a'), tests.id('coach_x'))$$,
  '42501', null,
  'created_by başkası → 42501'
);
select throws_ok(
  $$insert into public.mistakes (student_id, subject_id, created_by)
    values (tests.id('student_c'), tests.id('subj_org_a'), tests.id('student_a'))$$,
  '42501', null,
  'öğrenci A başka öğrenciye kayıt açamaz'
);
select is((select count(*) from public.mistakes), 2::bigint, 'öğrenci A kendi 2 kaydını okur');
select is(
  tests.row_count($$update public.mistakes set reason = 'time' where id = tests.id('mistake_a1') returning 1$$),
  1::bigint,
  'öğrenci A kendi kaydının nedenini günceller'
);

-- 2. solved_at ↔ status check'i. -----------------------------------------------------------------
select throws_ok(
  $$update public.mistakes set status = 'solved' where id = tests.id('mistake_a1')$$,
  '23514', null,
  'solved_at olmadan solved → 23514'
);
select throws_ok(
  $$update public.mistakes set solved_at = now() where id = tests.id('mistake_a1')$$,
  '23514', null,
  'open kayıtta solved_at → 23514'
);
select lives_ok(
  $$update public.mistakes set status = 'solved', solved_at = now() where id = tests.id('mistake_a1')$$,
  'status + solved_at birlikte → Çözdüm'
);
select lives_ok(
  $$update public.mistakes set status = 'open', solved_at = null where id = tests.id('mistake_a1')$$,
  'geri al: open + solved_at null'
);

-- 3. Koç X: okur, günceller, silebilir; kayıt açamaz. -------------------------------------------
select tests.authenticate_as('coach_x');
select is((select count(*) from public.mistakes), 2::bigint, 'koç X öğrencisinin kayıtlarını okur');
select is(
  tests.row_count($$update public.mistakes set status = 'solved', solved_at = now() where id = tests.id('mistake_a2') returning 1$$),
  1::bigint,
  'koç X durumu günceller'
);
select throws_ok(
  $$insert into public.mistakes (student_id, subject_id, created_by)
    values (tests.id('student_a'), tests.id('subj_org_a'), tests.id('coach_x'))$$,
  '42501', null,
  'koç kayıt açamaz (fotoğraf öğrencinin telefonundan)'
);
select tests.authenticate_as('coach_y');
select is((select count(*) from public.mistakes), 0::bigint, 'başka koç 0 satır');
select tests.authenticate_as('student_c');
select is((select count(*) from public.mistakes), 0::bigint, 'başka öğrenci 0 satır');
select tests.authenticate_as('owner_a');
select is((select count(*) from public.mistakes), 2::bigint, 'owner kurumun kayıtlarını okur');

-- 4. Veli: yalnızca can_view_details. -------------------------------------------------------------
select tests.authenticate_as('parent_p1');
select is((select count(*) from public.mistakes), 2::bigint, 'detaylı veli (P1) çocuğunun kayıtlarını görür');
select is(
  tests.row_count($$update public.mistakes set note = 'x' where id = tests.id('mistake_a1') returning 1$$),
  0::bigint,
  'veli güncelleyemez (0 satır)'
);
select tests.authenticate_as('parent_p2');
select is((select count(*) from public.mistakes), 0::bigint, 'detaysız veli (P2) 0 satır (C10)');

-- 5. Anon. --------------------------------------------------------------------------------------
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.mistakes$$, '42501', null, 'anon 42501');

-- 6. Depo: bucket ve storage.objects politikaları. ------------------------------------------------
select tests.authenticate_as_service_role();
select is(
  (select public from storage.buckets where id = 'mistake-images'),
  false,
  'mistake-images bucket''ı var ve private'
);
select is(
  (select file_size_limit from storage.buckets where id = 'mistake-images'),
  2097152::bigint,
  'bucket sınırı 2 MB'
);

select tests.authenticate_as('student_a');
select lives_ok(
  format($$insert into storage.objects (bucket_id, name, owner_id)
    values ('mistake-images', '%s/%s/11111111-1111-4111-8111-111111111111.webp', '%s')$$,
    tests.id('org_a'), tests.id('student_a'), tests.id('student_a')),
  'öğrenci A kendi klasörüne nesne yazar'
);
select throws_ok(
  format($$insert into storage.objects (bucket_id, name, owner_id)
    values ('mistake-images', '%s/%s/22222222-2222-4222-8222-222222222222.webp', '%s')$$,
    tests.id('org_a'), tests.id('student_c'), tests.id('student_a')),
  '42501', null,
  'başka öğrencinin klasörüne 42501'
);
select throws_ok(
  format($$insert into storage.objects (bucket_id, name, owner_id)
    values ('mistake-images', '%s/%s/33333333-3333-4333-8333-333333333333.webp', '%s')$$,
    tests.id('org_b'), tests.id('student_a'), tests.id('student_a')),
  '42501', null,
  'başka kurum klasörüne 42501'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'mistake-images'),
  1::bigint,
  'öğrenci A kendi nesnesini görür'
);
select tests.authenticate_as('coach_x');
select is(
  (select count(*) from storage.objects where bucket_id = 'mistake-images'),
  1::bigint,
  'koç X öğrencisinin nesnesini okur'
);
select tests.authenticate_as('parent_p1');
select is(
  (select count(*) from storage.objects where bucket_id = 'mistake-images'),
  1::bigint,
  'detaylı veli nesneyi okur'
);
select tests.authenticate_as('parent_p2');
select is(
  (select count(*) from storage.objects where bucket_id = 'mistake-images'),
  0::bigint,
  'detaysız veli nesneyi görmez'
);
select tests.authenticate_as('student_c');
select is(
  (select count(*) from storage.objects where bucket_id = 'mistake-images'),
  0::bigint,
  'başka öğrenci nesneyi görmez'
);
-- Yerel storage şeması doğrudan silmeyi engeller (storage.protect_delete: "Use the Storage API");
-- silme politikasının varlığı burada, gerçek silme e2e'de (öğrenci kaydı siler → nesne yok).
select tests.authenticate_as('student_a');
select is(
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
     and policyname in ('mistake_images_select', 'mistake_images_insert', 'mistake_images_delete')),
  3::bigint,
  'storage.objects üzerinde select / insert / delete politikaları tanımlı (update yok)'
);
select is(
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
     and policyname like 'mistake_images_%' and cmd = 'UPDATE'),
  0::bigint,
  'nesne güncelleme politikası yok'
);
select is(
  tests.row_count($$delete from public.mistakes where id = tests.id('mistake_a2') returning 1$$),
  1::bigint,
  'öğrenci A kendi kaydını siler'
);

select * from finish();
rollback;
