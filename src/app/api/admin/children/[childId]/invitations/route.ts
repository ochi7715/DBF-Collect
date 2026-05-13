import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { buildInvitationUrl, getAppBaseUrl, normalizeEmail } from "@/lib/invitations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const invitationSchema = z.object({
  email: z.string().trim().email(),
  relationship: z.string().trim().max(80).optional(),
  canViewDocuments: z.boolean(),
  canUploadDocuments: z.boolean(),
});

export async function POST(request: Request, { params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const profile = await requireStaff();
  const formData = await request.formData();
  const parsed = invitationSchema.parse({
    email: formData.get("email"),
    relationship: formData.get("relationship")?.toString() ?? "",
    canViewDocuments: formData.has("canViewDocuments") || formData.has("canUploadDocuments"),
    canUploadDocuments: formData.has("canUploadDocuments"),
  });

  const admin = createSupabaseAdminClient();
  const email = normalizeEmail(parsed.email);
  const { data: invitation, error } = await admin
    .from("caregiver_invitations")
    .insert({
      email,
      child_id: childId,
      relationship: parsed.relationship || null,
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
    childId,
    entityType: "caregiver_invitation",
    entityId: invitation.id,
    action: "caregiver_invited",
    details: {
      email,
      relationship: parsed.relationship || null,
      canViewDocuments: parsed.canViewDocuments,
      canUploadDocuments: parsed.canUploadDocuments,
      delivery,
    },
  });

  const query = new URLSearchParams({ invitation: invitation.id, delivery });
  redirect(`/admin/children/${childId}?${query.toString()}`);
}
