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
    .from("dragon_boat_documents")
    .select("*, teams(*), team_members(*), document_forms(*)")
    .eq("id", documentId)
    .single();

  if (error || !doc) throw new Error("Document not found");
  const form = doc.document_forms;
  if (!form?.requires_signature || !form.dropbox_template_id) {
    throw new Error("This document form is not configured for Dropbox Sign");
  }

  const { data: contactRows } = await admin
    .from("team_contacts")
    .select("profiles(*)")
    .eq("team_id", doc.team_id)
    .eq("contact_role", "captain")
    .eq("is_authorized", true)
    .limit(1);

  const captain = contactRows?.[0]?.profiles as any;
  if (!captain?.email) throw new Error("No authorized team captain email found");

  const response = await sendDropboxTemplateSignatureRequest({
    templateId: form.dropbox_template_id,
    subject: `${form.name} for ${doc.teams.name}`,
    message: "Please review and sign this race document.",
    signers: [
      {
        role: "Team Captain",
        name: captain.full_name ?? captain.email,
        emailAddress: captain.email,
      },
    ],
    metadata: {
      team_id: doc.team_id,
      document_id: doc.id,
    },
  });

  const signatureRequestId = response.signature_request.signature_request_id;
  const status = response.signature_request.is_complete ? "signed" : "sent_for_signature";

  const { error: updateError } = await admin
    .from("dragon_boat_documents")
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
    teamId: doc.team_id,
    entityType: "dragon_boat_document",
    entityId: documentId,
    action: "dropbox_signature_sent",
    details: { signatureRequestId, captainEmail: captain.email },
    request,
  });

  redirect(`/admin/documents/${documentId}`);
}
