import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteCodeForm } from "@/features/core";

export const metadata: Metadata = { title: "Veli daveti" };

const LINK_ERROR =
  "Doğrulama bağlantısı geçersiz ya da süresi dolmuş. Davet kodunuzla yeniden kayıt olun.";

export default async function InvitePage({ searchParams }: PageProps<"/invite">) {
  const { error } = await searchParams;
  return (
    <Card elevation="lg">
      <CardHeader>
        <CardTitle>Veli kaydı</CardTitle>
        <CardDescription>
          Koçunuzun verdiği 8 karakterli davet kodunu yazın. Zaten hesabınız varsa önce giriş yapın.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InviteCodeForm initialError={error === "link" ? LINK_ERROR : undefined} />
      </CardContent>
    </Card>
  );
}
