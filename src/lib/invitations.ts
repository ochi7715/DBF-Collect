import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TeamInvitation } from "@/lib/types";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getAppBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export function buildInvitationUrl(baseUrl: string, token: string) {
  return `${baseUrl.replace(/\/$/, "")}/invite/${token}`;
}

export async function getInvitationByToken(token: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("team_invitations")
    .select("*, teams(*, race_categories(*))")
    .eq("token", token)
    .maybeSingle();

  if (error) throw error;
  return data as TeamInvitation | null;
}

export function isInvitationExpired(invitation: Pick<TeamInvitation, "expires_at">) {
  return new Date(invitation.expires_at).getTime() < Date.now();
}
