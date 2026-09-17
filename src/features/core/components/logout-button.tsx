import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "../server/actions";

/**
 * Sunucu bileşeni: form + Server Action; JavaScript olmadan da çalışır.
 * `iconOnly` dar yerler için (öğrenci rayı): metin `aria-label`a taşınır.
 */
export function LogoutButton({
  variant = "secondary",
  iconOnly = false,
}: {
  variant?: "secondary" | "ghost";
  iconOnly?: boolean;
}) {
  return (
    <form action={logout}>
      <Button
        type="submit"
        variant={variant}
        size={iconOnly ? "icon" : "default"}
        aria-label={iconOnly ? "Çıkış yap" : undefined}
        title={iconOnly ? "Çıkış yap" : undefined}
      >
        <LogOutIcon aria-hidden="true" />
        {iconOnly ? null : "Çıkış yap"}
      </Button>
    </form>
  );
}
