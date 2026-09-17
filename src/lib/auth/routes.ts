import type { Role } from "@/types";

/**
 * Rol ↔ rota eşlemesi (02-mimari Bölüm 4.3). proxy.ts ve requireRole aynı tabloyu kullanır.
 * Rota segmentleri İngilizcedir.
 */
export const ROLE_HOME: Record<Role, string> = {
  owner: "/coach",
  coach: "/coach",
  student: "/student",
  parent: "/parent",
};

/** Rolün girebildiği bölge önekleri. */
const ROLE_SECTIONS: Record<Role, readonly string[]> = {
  owner: ["/coach"],
  coach: ["/coach"],
  student: ["/student"],
  parent: ["/parent", "/consent"],
};

/** Oturum gerektiren bölgeler; proxy oturumsuz isteği /login'e yollar. */
const PROTECTED_PREFIXES = ["/student", "/coach", "/parent", "/consent", "/invite/accept"];

/** Oturumu olan kullanıcının görmemesi gereken sayfalar (girişe/ana sayfaya yönlendirilir). */
const GUEST_ONLY_PATHS = ["/login"];

export function homeFor(role: Role): string {
  return ROLE_HOME[role];
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isGuestOnlyPath(pathname: string): boolean {
  return GUEST_ONLY_PATHS.includes(pathname);
}

/** Rol bu yola girebilir mi? Rol bölgesi dışındaki yollar (ör. /invite/accept) herkese açıktır. */
export function roleMayVisit(role: Role, pathname: string): boolean {
  const owner = (Object.keys(ROLE_SECTIONS) as Role[]).find((r) =>
    ROLE_SECTIONS[r].some((p) => pathname === p || pathname.startsWith(`${p}/`)),
  );
  if (!owner) return true;
  return ROLE_SECTIONS[role].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isRole(value: unknown): value is Role {
  return value === "owner" || value === "coach" || value === "student" || value === "parent";
}
