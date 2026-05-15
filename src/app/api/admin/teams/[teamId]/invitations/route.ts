import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { buildInvitationUrl, getAppBaseUrl, normalizeEmail } from "@/lib/invitations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const invitationSchema = z.object({
  email: z.string().trim().email(),
  contactRole: z.enum(["captain", "manager", "co_captain"]),
  canViewDocuments: z.boolean(),
  canUploadDocuments: z.boolean(),
});

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const profile = await requireStaff();
  const formData = await request.formData();
  const parsed = invitationSchema.parse({
    email: formData.get("email"),
    contactRole: formData.get("contactRole"),
    canViewDocuments: formData.has("canViewDocuments") || formData.has("canUploadDocuments"),
    canUploadDocuments: formData.has("canUploadDocuments"),
  });

  const admin = createSupabaseAdminClient();
  const email = normalizeEmail(parsed.email);
  const { data: invitation, error } = await admin
    .from("team_invitations")
    .insert({
      email,
      team_id: teamId,
      contact_role: parsed.contactRole,
      invited_by: profile.id,
      can_view_documents: parsed.canViewDocuments,
      can_upload_documents: parsed.canUploadDocuments,
    })
    .select("id, token")
    .single();

  if (error) throw error;

  let delivery = "link-created";
  const invitationUrl = buildInvitationUrl(await getAppBaseUrl(), invitation.token);
  try {
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: invitationUrl,
    });
    if (!inviteError) delivery = "email-sent";
  } catch {
    delivery = "link-created";
  }

  await writeAuditLog({
    actorId: profile.id,
    teamId,
    entityType: "team_invitation",
    entityId: invitation.id,
    action: "team_contact_invited",
    details: {
      email,
      contactRole: parsed.contactRole,
      canViewDocuments: parsed.canViewDocuments,
      canUploadDocuments: parsed.canUploadDocuments,
      delivery,
    },
    request,
  });

  const query = new URLSearchParams({ invitation: invitation.id, delivery });
  redirect(`/admin/teams/${teamId}?${query.toString()}`);
}
