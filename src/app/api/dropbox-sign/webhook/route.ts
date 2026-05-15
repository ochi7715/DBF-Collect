import { NextResponse } from "next/server";
import { getDropboxSignedFile, parseDropboxWebhookPayload } from "@/lib/dropbox-sign";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const text = await request.text();
  const payload = parseDropboxWebhookPayload(text);

  if (!payload?.signature_request?.signature_request_id) {
    return new Response("Hello API Event Received", { status: 200 });
  }

  const signatureRequestId = payload.signature_request.signature_request_id;
  const admin = createSupabaseAdminClient();
  const { data: doc } = await admin
    .from("dragon_boat_documents")
    .select("id, team_id, signed_file_path")
    .eq("dropbox_signature_request_id", signatureRequestId)
    .maybeSingle();

  if (!doc) return new Response("Hello API Event Received", { status: 200 });

  const eventType = payload.event?.event_type ?? "unknown";
  const signerStatus = payload.signature_request.signatures?.[0]?.status_code ?? null;
  const isComplete = Boolean(payload.signature_request.is_complete) || eventType === "signature_request_all_signed";

  let signedFilePath: string | null = null;
  if (isComplete) {
    try {
      const file = await getDropboxSignedFile(signatureRequestId);
      signedFilePath = `${doc.team_id}/signed-${doc.id}-${Date.now()}.pdf`;
      await admin.storage.from("race-documents").upload(signedFilePath, Buffer.from(file), {
        contentType: "application/pdf",
        upsert: true,
      });
    } catch (error) {
      console.error("Failed to download completed Dropbox Sign file", error);
    }
  }

  const hasStoredSignedFile = Boolean(signedFilePath || doc.signed_file_path);
  const update: Record<string, string | null> = {
    status: hasStoredSignedFile ? "completed" : isComplete ? "signed" : "sent_for_signature",
    dropbox_signature_status: signerStatus ?? eventType,
    updated_at: new Date().toISOString(),
  };
  if (signedFilePath) update.signed_file_path = signedFilePath;

  await admin
    .from("dragon_boat_documents")
    .update(update)
    .eq("id", doc.id);

  await writeAuditLog({
    teamId: doc.team_id,
    entityType: "dragon_boat_document",
    entityId: doc.id,
    action: "dropbox_webhook_received",
    details: { signatureRequestId, eventType, signerStatus, completed: isComplete },
    request,
  });

  return new Response("Hello API Event Received", { status: 200 });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
