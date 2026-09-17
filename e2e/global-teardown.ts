import { deleteE2ETopics } from "./fixtures/db";

/** Güvenlik ağı: yarıda kalan testlerin şablonda bıraktığı "E2E Konu …" satırlarını siler. */
export default async function globalTeardown() {
  const count = await deleteE2ETopics();
  if (count > 0) console.log(`globalTeardown: ${count} artık "E2E Konu" silindi.`);
}
