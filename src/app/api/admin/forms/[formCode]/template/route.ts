import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const formCodeSchema = z.enum(["A1", "A2", "B1", "B2", "C", "D"]);

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: Request, { params }: { params: Promise<{ formCode: string }> }) {
  const actor = await requireStaff();
  const { formCode } = await params;
  const parsed = formCodeSchema.parse(formCode);
  const formData = await request.formData();
  const file = formData.get("template");

  if (!(file instanceof File)) redirect("/admin/templates?status=template-missing");
  if (file.size > MAX_FILE_BYTES) redirect("/admin/templates?status=template-too-large");
  if (!ALLOWED_TYPES.has(file.type)) redirect("/admin/templates?status=template-type");

  const admin = createSupabaseAdminClient();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `forms/${parsed}-${Date.now()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage.from("form-templates").upload(path, Buffer.from(arrayBuffer), {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { error: updateError } = await admin
    .from("document_forms")
    .update({
      template_file_path: path,
      template_file_name: safeName,
      template_mime_type: file.type,
      template_file_size_bytes: file.size,
      updated_at: new Date().toISOString(),
    })
    .eq("code", parsed);
  if (updateError) throw updateError;

  await writeAuditLog({
    actorId: actor.id,
    entityType: "document_form",
    action: "document_form_template_uploaded",
    details: {
      code: parsed,
      fileName: safeName,
      fileSize: file.size,
      mimeType: file.type,
    },
    request,
  });

  redirect("/admin/templates?status=template-updated");
}
