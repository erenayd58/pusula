"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parentRelationLabels } from "@/content/labels";
import { parentRelationValues } from "../schemas";
import { registerParent, type RegisterParentState } from "../server/invitation-actions";
import { FieldError } from "./field-error";
import { FormError } from "./form-error";
import { NativeSelect } from "./native-select";

const initialState: RegisterParentState = {};

export function RegisterParentForm({ code }: { code: string }) {
  const [state, formAction, pending] = useActionState(registerParent, initialState);
  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="code" value={code} />

      <div>
        <Label htmlFor="fullName">Adınız soyadınız</Label>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          aria-invalid={!!fieldError("fullName")}
        />
        <FieldError message={fieldError("fullName")} />
      </div>

      <div>
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={!!fieldError("email")}
        />
        <p className="mt-1.5 text-micro-lg text-ink-500">
          Doğrulama bağlantısı bu adrese gönderilir.
        </p>
        <FieldError message={fieldError("email")} />
      </div>

      <div>
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!fieldError("password")}
        />
        <FieldError message={fieldError("password")} />
      </div>

      <div>
        <Label htmlFor="relation">Yakınlığınız</Label>
        <NativeSelect id="relation" name="relation" defaultValue="mother" required>
          {parentRelationValues.map((value) => (
            <option key={value} value={value}>
              {parentRelationLabels[value]}
            </option>
          ))}
        </NativeSelect>
        <FieldError message={fieldError("relation")} />
      </div>

      <FormError message={state.error} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Kayıt başlatılıyor…" : "Kayıt ol"}
      </Button>
    </form>
  );
}
