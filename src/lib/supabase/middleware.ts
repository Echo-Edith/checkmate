import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/env";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

const PROTECTED_PREFIXES = ["/dashboard", "/profile"];
const GUEST_ONLY_PATHS = ["/login", "/register", "/forgot-password"];

/**
 * Refreshes the Supabase session on every request and enforces route protection.
 * getUser() validates the token with Supabase (unlike getSession(), which trusts cookies).
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Lets server components (the maintenance gate) know which page is being opened.
  request.headers.set("x-pathname", request.nextUrl.pathname);
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseConfig();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isGuestOnly = GUEST_ONLY_PATHS.includes(pathname);

  const redirectTo = (target: string, search?: string): NextResponse => {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = target;
    redirectUrl.search = search ?? "";
    const redirect = NextResponse.redirect(redirectUrl);
    // Keep any refreshed session cookies on the redirect response.
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  if (!user && isProtected) {
    return redirectTo("/login", `?next=${encodeURIComponent(pathname)}`);
  }
  if (user && isGuestOnly) {
    return redirectTo("/dashboard");
  }

  return response;
}
