import { NextResponse, type NextRequest } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: doc, error } = await supabase
    .from("dragon_boat_documents")
    .select("id, team_id, file_path, signed_file_path")
    .eq("id", documentId)
    .single();

  if (error || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { data: allowed } = await supabase.rpc("can_access_team", { target_team_id: doc.team_id });
  const version = request.nextUrl.searchParams.get("version");
  if (!allowed) {
    await writeAuditLog({
      actorId: user.id,
      teamId: doc.team_id,
      entityType: "dragon_boat_document",
      entityId: documentId,
      action: "document_file_access_denied",
      details: { version },
      request,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const path = version === "uploaded" ? doc.file_path : version === "signed" ? doc.signed_file_path : doc.signed_file_path ?? doc.file_path;
  if (!path) return NextResponse.json({ error: "No file available" }, { status: 404 });

  const { data, error: signedUrlError } = await admin.storage.from("race-documents").createSignedUrl(path, 60);
  if (signedUrlError) return NextResponse.json({ error: signedUrlError.message }, { status: 500 });

  await writeAuditLog({
    actorId: user.id,
    teamId: doc.team_id,
    entityType: "dragon_boat_document",
    entityId: documentId,
    action: "document_file_opened",
    details: { version: version ?? "latest", fileVersion: path === doc.signed_file_path ? "signed" : "uploaded" },
    request,
  });

  return NextResponse.redirect(data.signedUrl);
}
