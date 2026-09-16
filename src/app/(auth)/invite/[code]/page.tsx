import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterParentForm } from "@/features/core";
import { getSessionUser } from "@/lib/auth";
import { isWellFormedInvitationCode, normalizeInvitationCode } from "@/lib/invitations/code";

export const metadata: Metadata = { title: "Veli kaydı" };

/**
 * Davet linki: /invite/<kod>. Kodun varlığı burada sorgulanmaz (anon veritabanı okuyamaz);
 * kayıt işlemi sunucuda doğrular. Oturumu olan kullanıcı kabul sayfasına gider.
 */
export default async function InviteCodePage({ params }: PageProps<"/invite/[code]">) {
  const { code: raw } = await params;
  const code = normalizeInvitationCode(raw);
  if (!isWellFormedInvitationCode(code)) redirect("/invite");

  const session = await getSessionUser();
  if (session) redirect(`/invite/accept?code=${code}`);

  return (
    <Card elevation="lg">
      <CardHeader>
        <CardTitle>Veli hesabı oluşturun</CardTitle>
        <CardDescription>
          Davet kodu: <span className="font-mono tracking-widest text-ink-900">{code}</span>.
          Kayıttan sonra e-postanıza doğrulama bağlantısı gelir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterParentForm code={code} />
      </CardContent>
    </Card>
  );
}
