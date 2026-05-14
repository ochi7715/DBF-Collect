import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uploadSchema = z.object({
  documentId: z.string().uuid(),
});

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const parsed = uploadSchema.safeParse({ documentId: formData.get("documentId") });
  if (!parsed.success) return NextResponse.json({ error: "Invalid document id" }, { status: 400 });

  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File is required" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "File must be 10 MB or smaller" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

  const { data: doc, error: docError } = await supabase
    .from("child_intake_documents")
    .select("id, child_id, template_id, intake_document_templates(requires_upload)")
    .eq("id", parsed.data.documentId)
    .single();

  if (docError || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const template = Array.isArray(doc.intake_document_templates) ? doc.intake_document_templates[0] : doc.intake_document_templates;
  if (!template?.requires_upload) {
    return NextResponse.json({ error: "This checklist item does not accept uploads" }, { status: 400 });
  }

  const { data: allowed, error: allowedError } = await supabase.rpc("can_upload_child_documents", { target_child_id: doc.child_id });
  if (allowedError || !allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${doc.child_id}/${parsed.data.documentId}-${Date.now()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from("intake-documents")
    .upload(path, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { error: updateError } = await admin
    .from("child_intake_documents")
    .update({
      status: "uploaded",
      uploaded_by: user.id,
      file_path: path,
      file_name: safeName,
      mime_type: file.type,
      file_size_bytes: file.size,
      review_notes: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.documentId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await writeAuditLog({
    actorId: user.id,
    childId: doc.child_id,
    entityType: "child_intake_document",
    entityId: parsed.data.documentId,
    action: "document_uploaded",
    details: { fileName: safeName, fileSize: file.size, mimeType: file.type },
    request,
  });

  return NextResponse.json({ ok: true });
}
