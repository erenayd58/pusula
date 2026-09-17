import type { Metadata } from "next";
import { MailCheckIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "E-postanızı doğrulayın" };

export default function CheckEmailPage() {
  return (
    <Card elevation="lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MailCheckIcon className="size-5 text-ink-700" aria-hidden="true" />
          <CardTitle>E-postanızı doğrulayın</CardTitle>
        </div>
        <CardDescription>
          Kayıt başlatıldı. Bu adres için bir hesap açılabiliyorsa doğrulama bağlantısı gönderildi.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-ink-700">
        <p>E-postanızdaki bağlantıya dokunun; ardından davetiniz bağlanır ve onay ekranı açılır.</p>
        <p>
          E-posta gelmediyse gereksiz klasörünü kontrol edin ya da birkaç dakika sonra tekrar
          deneyin.
        </p>
      </CardContent>
    </Card>
  );
}
