import "server-only";

import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/auth/get-session-user";
import { homeFor } from "@/lib/auth/routes";
import type { Profile, Role } from "@/types";

export type AuthenticatedUser = SessionUser & { profile: Profile };

/** Profili olmayan oturumun gideceği yer: davet kodu taşıyorsa kabul sayfası, yoksa hata sayfası. */
export function pathForMissingProfile(session: SessionUser): string {
  return typeof session.userMetadata.invitation_code === "string"
    ? "/invite/accept"
    : "/profile-missing";
}

/** Oturumlu ve profilli kullanıcı; yoksa yönlendirir. Rol kısıtı yok. */
export async function requireUser(): Promise<AuthenticatedUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.profile) redirect(pathForMissingProfile(session));
  return { ...session, profile: session.profile };
}

/**
 * Sunucu tarafında kesin rol kontrolü (02-mimari Bölüm 4.3, katman 2). Rol uymuyorsa kullanıcı
 * kendi ana sayfasına gider; oturum yoksa /login.
 */
export async function requireRole<R extends Role>(
  ...roles: R[]
): Promise<AuthenticatedUser & { profile: Profile & { role: R } }> {
  const user = await requireUser();
  if (!hasRole(user.profile, roles)) redirect(homeFor(user.profile.role));
  return { ...user, profile: user.profile };
}

function hasRole<R extends Role>(profile: Profile, roles: R[]): profile is Profile & { role: R } {
  return (roles as Role[]).includes(profile.role);
}
