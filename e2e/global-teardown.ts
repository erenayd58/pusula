import { deleteE2EStudents, deleteE2ETopics } from "./fixtures/db";

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
}
