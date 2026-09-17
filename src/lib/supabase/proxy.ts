import { createServerClient } from "@supabase/ssr";
import type { JwtPayload } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * proxy.ts için oturum yenileme: istek çerezlerinden istemci kurar, `getClaims()` ile token'ı
 * doğrular (gerekirse yeniler) ve yenilenen çerezleri hem isteğe hem yanıta yazar.
 * Yanıt nesnesi proxy tarafından döndürülmelidir; aksi halde yenilenen oturum kaybolur.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const claims: JwtPayload | null = data?.claims ?? null;

  return { response, claims };
}

/** Yönlendirme yanıtı, yenilenen oturum çerezlerini koruyarak. */
export function redirectWithCookies(from: NextResponse, request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
