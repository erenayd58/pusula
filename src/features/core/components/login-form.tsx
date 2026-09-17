"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "./form-error";
import { login, type LoginState } from "../server/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div>
        <Label htmlFor="identifier">Kullanıcı adı veya e-posta</Label>
        <Input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          aria-invalid={state.error ? true : undefined}
        />
      </div>
      <div>
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
        />
      </div>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </Button>
    </form>
  );
}
