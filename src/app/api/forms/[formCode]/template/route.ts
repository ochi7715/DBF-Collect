import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const formCodeSchema = z.enum(["A1", "A2", "B1", "B2", "C", "D"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ formCode: string }> }) {
  await requireProfile();
  const { formCode } = await params;
  const parsed = formCodeSchema.safeParse(formCode);
  if (!parsed.success) return NextResponse.json({ error: "Invalid form code" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: form, error } = await admin
    .from("document_forms")
    .select("code, template_file_path")
    .eq("code", parsed.data)
    .single();

  if (error || !form) return NextResponse.json({ error: "Form not found" }, { status: 404 });
  if (!form.template_file_path) return NextResponse.json({ error: "No blank form uploaded yet" }, { status: 404 });

  if (form.template_file_path.startsWith("/forms/")) {
    return NextResponse.redirect(new URL(form.template_file_path, request.url));
  }

  const { data, error: signedUrlError } = await admin.storage.from("form-templates").createSignedUrl(form.template_file_path, 60);
  if (signedUrlError) return NextResponse.json({ error: signedUrlError.message }, { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
