import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AuditInput = {
  actorId?: string | null;
  childId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  details?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditInput) {
  const supabase = createSupabaseAdminClient();
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const { error } = await supabase.from("audit_logs").insert({
    actor_id: input.actorId ?? null,
    child_id: input.childId ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    details: input.details ?? {},
    ip_address: ip,
  });

  if (error) {
    console.error("Audit log failed", error);
  }
}
