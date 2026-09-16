import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoutButton } from "@/features/core";
import { getSessionUser, homeFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Profil bulunamadı" };

/** Oturumu olup `profiles` satırı olmayan kullanıcı (ör. davet kabul edilmeden silinmiş). */
export default async function ProfileMissingPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.profile) redirect(homeFor(session.profile.role));

  return (
    <Card elevation="lg">
      <CardHeader>
        <CardTitle>Hesabın var ama profilin yok</CardTitle>
        <CardDescription>{session.email ?? "Oturum açık"}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p>
          Bu hesap için Pusula&apos;da bir profil bulunamadı. Veliysen davet kodunla kaydı
          tamamlaman gerekiyor; öğrenci ya da koçsan kurumunla iletişime geç.
        </p>
      </CardContent>
      <CardFooter>
        <LogoutButton />
      </CardFooter>
    </Card>
  );
}
