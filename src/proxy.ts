import type { NextRequest } from "next/server";
import { homeFor, isGuestOnlyPath, isProtectedPath, isRole, roleMayVisit } from "@/lib/auth/routes";
import { redirectWithCookies, updateSession } from "@/lib/supabase/proxy";

/**
 * Oturum yenileme + rol bazlı yönlendirme (02-mimari Bölüm 4.3, katman 1: kullanıcı deneyimi,
 * güvenlik değil). Rol, custom_access_token hook'unun JWT'ye yazdığı
 * `app_metadata.user_role` claim'inden okunur; claim yoksa (hook kapalı ya da profil henüz yok)
 * karar layout'taki requireRole'e bırakılır.
 */
export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!claims) {
    if (isProtectedPath(pathname)) return redirectWithCookies(response, request, "/login");
    return response;
  }

  const role = claims.app_metadata?.user_role;
  if (!isRole(role)) return response;

  if (pathname === "/" || isGuestOnlyPath(pathname)) {
    return redirectWithCookies(response, request, homeFor(role));
  }
  if (!roleMayVisit(role, pathname)) {
    return redirectWithCookies(response, request, homeFor(role));
  }
  return response;
}

export const config = {
  matcher: [
    // Statik dosyalar, görsel optimizasyonu ve yaygın görsel uzantıları hariç.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
