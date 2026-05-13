import { NextResponse, type NextRequest } from "next/server";
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
    .from("child_intake_documents")
    .select("id, child_id, file_path, signed_file_path")
    .eq("id", documentId)
    .single();

  if (error || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { data: allowed } = await supabase.rpc("can_access_child", { target_child_id: doc.child_id });
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const version = request.nextUrl.searchParams.get("version");
  const path = version === "uploaded" ? doc.file_path : version === "signed" ? doc.signed_file_path : doc.signed_file_path ?? doc.file_path;
  if (!path) return NextResponse.json({ error: "No file available" }, { status: 404 });

  const { data, error: signedUrlError } = await admin.storage.from("intake-documents").createSignedUrl(path, 60);
  if (signedUrlError) return NextResponse.json({ error: signedUrlError.message }, { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
