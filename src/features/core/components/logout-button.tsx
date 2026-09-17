import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "../server/actions";

/** Sunucu bileşeni: form + Server Action; JavaScript olmadan da çalışır. */
export function LogoutButton({ variant = "secondary" }: { variant?: "secondary" | "ghost" }) {
  return (
    <form action={logout}>
      <Button type="submit" variant={variant}>
        <LogOutIcon aria-hidden="true" />
        Çıkış yap
      </Button>
    </form>
  );
}
