"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith("http")) throw new Error();
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a full URL like https://your-project.supabase.co");
  }

  return createBrowserClient(url, anonKey);
}
