"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isWellFormedInvitationCode, normalizeInvitationCode } from "@/lib/invitations/code";
import { INVITATION_CODE_MESSAGE } from "../schemas";
import { FormError } from "./form-error";

/** Davet kodunu yazıp /invite/<kod> sayfasına geçer; asıl doğrulama kayıt işleminde yapılır. */
export function InviteCodeForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialError);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeInvitationCode(code);
    if (!isWellFormedInvitationCode(normalized)) {
      setError(INVITATION_CODE_MESSAGE);
      return;
    }
    router.push(`/invite/${normalized}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div>
        <Label htmlFor="code">Davet kodu</Label>
        <Input
          id="code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={!!error}
          className="tracking-widest"
        />
      </div>
      <FormError message={error} />
      <Button type="submit" className="w-full">
        Devam et
      </Button>
    </form>
  );
}
