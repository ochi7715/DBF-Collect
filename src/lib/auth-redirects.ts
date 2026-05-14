import { NextResponse } from "next/server";

export function authStatusRedirect(origin: string, code: string) {
  const url = new URL("/auth/status", origin);
  url.searchParams.set("code", code);
  return NextResponse.redirect(url);
}

export function getAuthStatusCopy(code?: string | null) {
  switch (code) {
    case "callback_exchange_failed":
      return {
        title: "Email link could not be verified",
        body: "The sign-in or verification link was rejected by Supabase. It may be expired, already used, or your Supabase Auth redirect URLs may not include this site.",
      };
    case "callback_missing_code":
      return {
        title: "Email link is missing verification data",
        body: "The verification link did not include a code. Check your Supabase email template or request a new link.",
      };
    case "profile_lookup_failed":
      return {
        title: "Profile setup could not load",
        body: "The user signed in, but the app could not read the profiles table. Make sure supabase/schema.sql has been run in the Supabase SQL Editor.",
      };
    case "profile_create_failed":
      return {
        title: "Profile setup could not finish",
        body: "The user signed in, but the app could not create their profile row. Make sure the Supabase schema and RLS policies are installed.",
      };
    case "supabase_config_missing":
      return {
        title: "Supabase configuration is missing",
        body: "The app is missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in the deployment environment.",
      };
    default:
      return {
        title: "Authentication could not finish",
        body: "Please request a fresh link and try again. If this keeps happening, check your Supabase Auth URL settings.",
      };
  }
}
