import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const contactSchema = z.object({
  contactRole: z.enum(["captain", "manager", "co_captain"]),
  isAuthorized: z.boolean(),
  canViewDocuments: z.boolean(),
  canUploadDocuments: z.boolean(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string; contactId: string }> }
) {
  const { teamId, contactId } = await params;
  const profile = await requireStaff();
  const formData = await request.formData();
  const parsed = contactSchema.parse({
    contactRole: formData.get("contactRole"),
    isAuthorized: formData.has("isAuthorized"),
    canViewDocuments: formData.has("canViewDocuments") || formData.has("canUploadDocuments"),
    canUploadDocuments: formData.has("canUploadDocuments"),
  });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("team_contacts")
    .update({
      contact_role: parsed.contactRole,
      is_authorized: parsed.isAuthorized,
      can_view_documents: parsed.canViewDocuments,
      can_upload_documents: parsed.canUploadDocuments,
    })
    .eq("id", contactId)
    .eq("team_id", teamId);

  if (error) throw error;

  await writeAuditLog({
    actorId: profile.id,
    teamId,
    entityType: "team_contact",
    entityId: contactId,
    action: "team_contact_access_updated",
    details: parsed,
    request,
  });

  redirect(`/admin/teams/${teamId}`);
}
