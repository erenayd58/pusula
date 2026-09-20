import {
  deleteE2EAnnouncements,
  deleteE2EMockExams,
  deleteE2EPlaylists,
  deleteE2EResources,
  deleteE2EStudents,
  deleteE2ETemplates,
  deleteE2ETopics,
} from "./fixtures/db";

/**
 * Güvenlik ağı: yarıda kalan testlerin şablonda bıraktığı "E2E Konu …" satırlarını ve
 * `uniqueUsername` kalıbındaki öğrencileri (cascade ile tüm verisi) siler. Yalnızca yerel
 * Supabase'de çalışır (adminClient URL'yi denetler).
 */
export default async function globalTeardown() {
  const topics = await deleteE2ETopics();
  if (topics > 0) console.log(`globalTeardown: ${topics} artık "E2E Konu" silindi.`);
  const students = await deleteE2EStudents();
  if (students > 0) console.log(`globalTeardown: ${students} artık e2e öğrencisi silindi.`);
  const exams = await deleteE2EMockExams();
  if (exams > 0) console.log(`globalTeardown: ${exams} artık "E2E Deneme" silindi.`);
  const resources = await deleteE2EResources();
  if (resources > 0) console.log(`globalTeardown: ${resources} artık "E2E Kaynak" silindi.`);
  const playlists = await deleteE2EPlaylists();
  if (playlists > 0) console.log(`globalTeardown: ${playlists} artık "E2E Liste" silindi.`);
  const templates = await deleteE2ETemplates();
  if (templates > 0) console.log(`globalTeardown: ${templates} artık "E2E Şablon" silindi.`);
  const announcements = await deleteE2EAnnouncements();
  if (announcements > 0)
    console.log(`globalTeardown: ${announcements} artık "E2E duyuru" silindi.`);
}
