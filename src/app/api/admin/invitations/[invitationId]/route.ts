import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { safeRedirect } from "@/lib/utils";

const invitationActionSchema = z.object({
  action: z.enum(["revoke"]),
  returnTo: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  const { invitationId } = await params;
  const actor = await requireStaff();
  const formData = await request.formData();
  const parsed = invitationActionSchema.parse({
    action: formData.get("action"),
    returnTo: formData.get("returnTo")?.toString() ?? "/admin/team-contacts",
  });

  const admin = createSupabaseAdminClient();
  const { data: invitation, error } = await admin
    .from("team_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("status", "pending")
    .select("id, team_id, email")
    .single();

  if (error) throw error;

  await writeAuditLog({
    actorId: actor.id,
    teamId: invitation.team_id,
    entityType: "team_invitation",
    entityId: invitation.id,
    action: "team_invitation_revoked",
    details: { email: invitation.email, action: parsed.action },
    request,
  });

  redirect(safeRedirect(parsed.returnTo, "/admin/team-contacts"));
}
