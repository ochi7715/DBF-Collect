import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { authStatusRedirect } from "@/lib/auth-redirects";
import { safeRedirect } from "@/lib/utils";

type CookieToSet = { name: string; value: string; options: CookieOptions };

function createAuthCallbackClient(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const authError = requestUrl.searchParams.get("error");
  const next = safeRedirect(requestUrl.searchParams.get("next"), "/portal");

  if (authError) {
    return authStatusRedirect(requestUrl.origin, "callback_exchange_failed");
  }

  const response = NextResponse.redirect(new URL(next, requestUrl.origin));
  const supabase = createAuthCallbackClient(request, response);
  if (!supabase) return authStatusRedirect(requestUrl.origin, "supabase_config_missing");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return authStatusRedirect(requestUrl.origin, "callback_exchange_failed");
    return response;
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return authStatusRedirect(requestUrl.origin, "callback_exchange_failed");
    return response;
  }

  return authStatusRedirect(requestUrl.origin, "callback_missing_code");
}
