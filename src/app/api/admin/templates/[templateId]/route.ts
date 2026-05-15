import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { ensureMemberFormCForAllMembers, ensureTeamDocumentRequirementsForAllTeams } from "@/lib/documents";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const formSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  scope: z.enum(["team", "member"]),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  dropboxTemplateId: z.string().trim().max(200).optional(),
  requiresUpload: z.boolean(),
  requiresSignature: z.boolean(),
  isActive: z.boolean(),
});

export async function POST(request: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  const actor = await requireStaff();
  const formData = await request.formData();
  const parsed = formSchema.parse({
    name: formData.get("name"),
    description: formData.get("description")?.toString() ?? "",
    scope: formData.get("scope")?.toString() ?? "team",
    sortOrder: formData.get("sortOrder")?.toString() ?? "10",
    dropboxTemplateId: formData.get("dropboxTemplateId")?.toString() ?? "",
    requiresUpload: formData.has("requiresUpload"),
    requiresSignature: formData.has("requiresSignature"),
    isActive: formData.has("isActive"),
  });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("document_forms")
    .update({
      name: parsed.name,
      description: parsed.description || null,
      scope: parsed.scope,
      sort_order: parsed.sortOrder,
      dropbox_template_id: parsed.dropboxTemplateId || null,
      requires_upload: parsed.requiresUpload,
      requires_signature: parsed.requiresSignature,
      is_active: parsed.isActive,
    })
    .eq("code", templateId);

  if (error) throw error;

  if (templateId === "C") {
    await ensureMemberFormCForAllMembers();
  } else {
    await ensureTeamDocumentRequirementsForAllTeams();
  }

  await writeAuditLog({
    actorId: actor.id,
    entityType: "document_form",
    action: "document_form_updated",
    details: {
      code: templateId,
      ...parsed,
    },
    request,
  });

  redirect("/admin/templates?status=updated");
}
