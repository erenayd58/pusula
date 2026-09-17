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
import { AcceptInvitationForm, LogoutButton, parentRelationValues } from "@/features/core";
import { getSessionUser, homeFor } from "@/lib/auth";
import { normalizeInvitationCode } from "@/lib/invitations/code";

export const metadata: Metadata = { title: "Daveti kabul et" };

type Relation = (typeof parentRelationValues)[number];

function asRelation(value: unknown): Relation {
  return parentRelationValues.find((r) => r === value) ?? "mother";
}

/** Oturum açık (e-posta doğrulandı) ama profil yok ya da mevcut veli ikinci çocuğunu bağlıyor. */
export default async function AcceptInvitationPage({ searchParams }: PageProps<"/invite/accept">) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.profile && session.profile.role !== "parent") redirect(homeFor(session.profile.role));

  const { code: queryCode } = await searchParams;
  const meta = session.userMetadata;
  const initialCode = normalizeInvitationCode(
    (typeof queryCode === "string" && queryCode) ||
      (typeof meta.invitation_code === "string" ? meta.invitation_code : ""),
  );
  const initialFullName = typeof meta.full_name === "string" ? meta.full_name : "";

  return (
    <Card elevation="lg">
      <CardHeader>
        <CardTitle>Daveti kabul edin</CardTitle>
        <CardDescription>
          {session.profile
            ? "Yeni bir çocuğunuzu hesabınıza bağlamak için davet kodunu girin."
            : "E-postanız doğrulandı. Davet kodunuzu onaylayın; hesabınız öğrencinize bağlanacak."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptInvitationForm
          initialCode={initialCode}
          initialFullName={initialFullName}
          initialRelation={asRelation(meta.relation)}
          hasProfile={!!session.profile}
        />
      </CardContent>
      <CardFooter>
        <LogoutButton variant="ghost" />
      </CardFooter>
    </Card>
  );
}
