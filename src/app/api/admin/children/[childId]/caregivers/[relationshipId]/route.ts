import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const relationshipSchema = z.object({
  relationship: z.string().trim().max(80).optional(),
  isAuthorized: z.boolean(),
  canViewDocuments: z.boolean(),
  canUploadDocuments: z.boolean(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ childId: string; relationshipId: string }> }
) {
  const { childId, relationshipId } = await params;
  const profile = await requireStaff();
  const formData = await request.formData();
  const parsed = relationshipSchema.parse({
    relationship: formData.get("relationship")?.toString() ?? "",
    isAuthorized: formData.has("isAuthorized"),
    canViewDocuments: formData.has("canViewDocuments") || formData.has("canUploadDocuments"),
    canUploadDocuments: formData.has("canUploadDocuments"),
  });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("child_caregivers")
    .update({
      relationship: parsed.relationship || null,
      is_authorized: parsed.isAuthorized,
      can_view_documents: parsed.canViewDocuments,
      can_upload_documents: parsed.canUploadDocuments,
    })
    .eq("id", relationshipId)
    .eq("child_id", childId);

  if (error) throw error;

  await writeAuditLog({
    actorId: profile.id,
    childId,
    entityType: "child_caregiver",
    entityId: relationshipId,
    action: "caregiver_access_updated",
    details: parsed,
  });

  redirect(`/admin/children/${childId}`);
}
