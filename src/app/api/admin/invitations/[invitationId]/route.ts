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
  const profile = await requireStaff();
  const formData = await request.formData();
  const parsed = invitationActionSchema.parse({
    action: formData.get("action"),
    returnTo: formData.get("returnTo")?.toString() ?? "/admin/caregivers",
  });

  const admin = createSupabaseAdminClient();
  const { data: invitation, error } = await admin
    .from("caregiver_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("status", "pending")
    .select("id, child_id, email")
    .single();

  if (error) throw error;

  await writeAuditLog({
    actorId: profile.id,
    childId: invitation.child_id,
    entityType: "caregiver_invitation",
    entityId: invitation.id,
    action: "caregiver_invitation_revoked",
    details: { email: invitation.email },
  });

  redirect(safeRedirect(parsed.returnTo, "/admin/caregivers"));
}
