import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { sendDropboxTemplateSignatureRequest } from "@/lib/dropbox-sign";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const profile = await requireStaff();
  const formData = await request.formData();
  const documentId = formData.get("documentId")?.toString();
  if (!documentId) throw new Error("Missing documentId");

  const admin = createSupabaseAdminClient();
  const { data: doc, error } = await admin
    .from("child_intake_documents")
    .select("*, children(*), intake_document_templates(*)")
    .eq("id", documentId)
    .single();

  if (error || !doc) throw new Error("Document not found");
  const template = doc.intake_document_templates;
  if (!template?.requires_signature || !template.dropbox_template_id) {
    throw new Error("This document template is not configured for Dropbox Sign");
  }

  const { data: caregiverRows } = await admin
    .from("child_caregivers")
    .select("profiles(*)")
    .eq("child_id", doc.child_id)
    .eq("is_authorized", true)
    .limit(1);

  const caregiver = caregiverRows?.[0]?.profiles as any;
  if (!caregiver?.email) throw new Error("No authorized caregiver email found");

  const response = await sendDropboxTemplateSignatureRequest({
    templateId: template.dropbox_template_id,
    subject: `${template.name} for ${doc.children.first_name} ${doc.children.last_name}`,
    message: "Please review and sign this intake document.",
    signers: [
      {
        role: "Caregiver",
        name: caregiver.full_name ?? caregiver.email,
        emailAddress: caregiver.email,
      },
    ],
    metadata: {
      child_id: doc.child_id,
      document_id: doc.id,
    },
  });

  const signatureRequestId = response.signature_request.signature_request_id;
  const status = response.signature_request.is_complete ? "signed" : "sent_for_signature";

  const { error: updateError } = await admin
    .from("child_intake_documents")
    .update({
      status,
      dropbox_signature_request_id: signatureRequestId,
      dropbox_signature_status: response.signature_request.signatures?.[0]?.status_code ?? null,
      reviewed_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (updateError) throw updateError;

  await writeAuditLog({
    actorId: profile.id,
    childId: doc.child_id,
    entityType: "child_intake_document",
    entityId: documentId,
    action: "dropbox_signature_sent",
    details: { signatureRequestId, caregiverEmail: caregiver.email },
    request,
  });

  redirect(`/admin/documents/${documentId}`);
}
