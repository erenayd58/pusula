import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsentForm, listChildrenNeedingConsent } from "@/features/core";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "KVKK onayı" };

/** Veli: aydınlatma metni + açık rıza. Onayı eksik çocuk yoksa veli paneline geçer. */
export default async function ConsentPage() {
  const { userId } = await requireRole("parent");
  const children = await listChildrenNeedingConsent(userId);
  if (children.length === 0) redirect("/parent");

  return (
    <Card elevation="lg">
      <CardHeader>
        <CardTitle>Kişisel verilerin korunması</CardTitle>
        <CardDescription>
          Çocuğunuzun verileri işlenmeden önce aydınlatma metnini okumanız ve açık rıza vermeniz
          gerekir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ConsentForm students={children} />
      </CardContent>
    </Card>
  );
}
