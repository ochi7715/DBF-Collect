import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile, Team } from "@/lib/types";

type AuditInput = {
  actorId?: string | null;
  teamId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  details?: Record<string, unknown>;
  request?: Request | null;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  team_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  request_method: string | null;
  request_path: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: Pick<Profile, "id" | "email" | "full_name" | "role"> | null;
  teams?: Pick<Team, "id" | "name" | "status"> | null;
};

type AuditLogFilters = {
  action?: string;
  entityType?: string;
  teamId?: string;
  actorId?: string;
  limit?: number;
};

export async function writeAuditLog(input: AuditInput) {
  try {
    const supabase = createSupabaseAdminClient();
    const requestHeaders = input.request?.headers ?? null;
    const fallbackHeaders = requestHeaders ? null : await getHeaderStore();
    const ip =
      getHeader(requestHeaders, fallbackHeaders, "x-forwarded-for")?.split(",")[0]?.trim() ??
      getHeader(requestHeaders, fallbackHeaders, "x-real-ip") ??
      getHeader(requestHeaders, fallbackHeaders, "cf-connecting-ip") ??
      null;
    const userAgent = getHeader(requestHeaders, fallbackHeaders, "user-agent");
    const requestUrl = getRequestUrl(input.request);

    const { error } = await supabase.from("audit_logs").insert({
      actor_id: input.actorId ?? null,
      team_id: input.teamId ?? null,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      action: input.action,
      details: input.details ?? {},
      ip_address: ip,
      request_method: input.request?.method ?? null,
      request_path: requestUrl?.pathname ?? null,
      user_agent: userAgent,
    });

    if (error) {
      console.error("Audit log failed", error);
    }
  } catch (error) {
    console.error("Audit log failed", error);
  }
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("audit_logs")
    .select("*, profiles:actor_id(id, email, full_name, role), teams(id, name, status)")
    .order("created_at", { ascending: false })
    .limit(Math.min(filters.limit ?? 100, 250));

  if (filters.action) query = query.eq("action", filters.action);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.teamId) query = query.eq("team_id", filters.teamId);
  if (filters.actorId) query = query.eq("actor_id", filters.actorId);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as AuditLog[];
}

async function getHeaderStore() {
  try {
    return await headers();
  } catch {
    return null;
  }
}

function getHeader(requestHeaders: Headers | null, fallbackHeaders: Awaited<ReturnType<typeof getHeaderStore>>, name: string) {
  return requestHeaders?.get(name) ?? fallbackHeaders?.get(name) ?? null;
}

function getRequestUrl(request?: Request | null) {
  if (!request?.url) return null;

  try {
    return new URL(request.url);
  } catch {
    return null;
  }
}
