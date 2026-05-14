import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { ensureTemplateForExistingChildren } from "@/lib/documents";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const templateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
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
  const parsed = templateSchema.parse({
    name: formData.get("name"),
    description: formData.get("description")?.toString() ?? "",
    sortOrder: formData.get("sortOrder")?.toString() ?? "10",
    dropboxTemplateId: formData.get("dropboxTemplateId")?.toString() ?? "",
    requiresUpload: formData.has("requiresUpload"),
    requiresSignature: formData.has("requiresSignature"),
    isActive: formData.has("isActive"),
  });

  const admin = createSupabaseAdminClient();
  const { data: before, error: beforeError } = await admin
    .from("intake_document_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (beforeError || !before) throw beforeError ?? new Error("Template not found");

  const { error } = await admin
    .from("intake_document_templates")
    .update({
      name: parsed.name,
      description: parsed.description || null,
      sort_order: parsed.sortOrder,
      dropbox_template_id: parsed.dropboxTemplateId || null,
      requires_upload: parsed.requiresUpload,
      requires_signature: parsed.requiresSignature,
      is_active: parsed.isActive,
    })
    .eq("id", templateId);

  if (error) throw error;

  if (parsed.isActive) {
    await ensureTemplateForExistingChildren(templateId);
  }

  await writeAuditLog({
    actorId: actor.id,
    entityType: "intake_document_template",
    entityId: templateId,
    action: "intake_template_updated",
    details: {
      before: {
        name: before.name,
        requiresUpload: before.requires_upload,
        requiresSignature: before.requires_signature,
        isActive: before.is_active,
        dropboxTemplateId: before.dropbox_template_id,
        sortOrder: before.sort_order,
      },
      after: parsed,
    },
    request,
  });

  redirect("/admin/templates?status=updated");
}
