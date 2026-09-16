import { expect } from "@playwright/test";

/**
 * Yerel Mailpit (supabase status → MAILPIT_URL). GoTrue'nun gönderdiği doğrulama e-postasını
 * bulur ve şablondaki /auth/confirm bağlantısını çıkarır.
 */
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type SearchResponse = { messages: { ID: string }[] };
type Message = { Text: string; HTML: string };

export async function findConfirmationLink(email: string, siteUrl: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await fetch(
          `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`,
        );
        const { messages } = (await search.json()) as SearchResponse;
        const id = messages[0]?.ID;
        if (!id) return null;
        const message = (await (
          await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)
        ).json()) as Message;
        const body = message.HTML || message.Text;
        const match =
          body.match(/href="([^"]*\/auth\/confirm[^"]*)"/) ??
          body.match(/(https?:\/\/\S*\/auth\/confirm\S*)/);
        link = match?.[1]?.replace(/&amp;/g, "&");
        return link ?? null;
      },
      { message: `${email} için doğrulama e-postası bekleniyor`, timeout: 15_000 },
    )
    .not.toBeNull();
  // Şablondaki {{ .SiteURL }} config.toml'daki site_url'dir; testin baseURL'ine çevrilir.
  return link!.replace(/^https?:\/\/[^/]+/, siteUrl);
}
