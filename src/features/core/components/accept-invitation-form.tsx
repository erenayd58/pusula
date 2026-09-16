"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parentRelationLabels } from "@/content/labels";
import { parentRelationValues } from "../schemas";
import { acceptInvitation } from "../server/invitation-actions";
import { FormError } from "./form-error";
import { NativeSelect } from "./native-select";

type Relation = (typeof parentRelationValues)[number];

/**
 * E-posta doğrulandıktan sonra daveti kabul. Kod ve ad kayıtta verilen metadata'dan ön dolu
 * gelir; profil zaten varsa (ikinci çocuk) ad sorulmaz.
 */
export function AcceptInvitationForm({
  initialCode,
  initialFullName,
  initialRelation,
  hasProfile,
}: {
  initialCode: string;
  initialFullName: string;
  initialRelation: Relation;
  hasProfile: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [fullName, setFullName] = useState(initialFullName);
  const [relation, setRelation] = useState<Relation>(initialRelation);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await acceptInvitation({
        code,
        fullName: hasProfile ? undefined : fullName,
        relation,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/consent");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div>
        <Label htmlFor="code">Davet kodu</Label>
        <Input
          id="code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={!!error}
          className="tracking-widest"
        />
      </div>

      {hasProfile ? null : (
        <div>
          <Label htmlFor="fullName">Adınız soyadınız</Label>
          <Input
            id="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
      )}

      <div>
        <Label htmlFor="relation">Yakınlığınız</Label>
        <NativeSelect
          id="relation"
          value={relation}
          onChange={(e) => setRelation(e.target.value as Relation)}
        >
          {parentRelationValues.map((value) => (
            <option key={value} value={value}>
              {parentRelationLabels[value]}
            </option>
          ))}
        </NativeSelect>
      </div>

      <FormError message={error} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Bağlanıyor…" : "Daveti kabul et"}
      </Button>
    </form>
  );
}
