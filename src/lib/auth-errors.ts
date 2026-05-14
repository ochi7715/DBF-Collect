const NETWORK_AUTH_MESSAGE =
  "Could not reach Supabase Auth. Check NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and redeploy after changing Vercel environment variables.";

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "Failed to fetch" || error.message.includes("fetch")) {
      return NETWORK_AUTH_MESSAGE;
    }
    return error.message;
  }

  return "Authentication failed. Please try again.";
}
