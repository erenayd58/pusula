import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/core";
import { getSessionUser, homeFor, pathForMissingProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Giriş" };

export default async function LoginPage() {
  const session = await getSessionUser();
  if (session)
    redirect(session.profile ? homeFor(session.profile.role) : pathForMissingProfile(session));

  return (
    <Card elevation="lg">
      <CardHeader>
        <CardTitle>Giriş yap</CardTitle>
        <CardDescription>
          Öğrenciysen kullanıcı adınla, koç ya da veliysen e-postanla gir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
