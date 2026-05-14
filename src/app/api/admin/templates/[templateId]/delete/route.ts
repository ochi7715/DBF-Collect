import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  const actor = await requireStaff();
  const admin = createSupabaseAdminClient();

  const { data: template, error: templateError } = await admin
    .from("intake_document_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (templateError || !template) throw templateError ?? new Error("Template not found");

  const { count, error: countError } = await admin
    .from("child_intake_documents")
    .select("*", { count: "exact", head: true })
    .eq("template_id", templateId);

  if (countError) throw countError;

  const hasChildDocuments = (count ?? 0) > 0;
  let action = "intake_template_deleted";
  let status = "deleted";

  if (hasChildDocuments) {
    const { error } = await admin.from("intake_document_templates").update({ is_active: false }).eq("id", templateId);
    if (error) throw error;
    action = "intake_template_deactivated";
    status = "deactivated";
  } else {
    const { error } = await admin.from("intake_document_templates").delete().eq("id", templateId);
    if (error) throw error;
  }

  await writeAuditLog({
    actorId: actor.id,
    entityType: "intake_document_template",
    entityId: templateId,
    action,
    details: {
      name: template.name,
      childDocumentCount: count ?? 0,
    },
    request,
  });

  redirect(`/admin/templates?status=${status}`);
}
