import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStaffRole, requireProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uploadSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assignmentKind: z.enum(["primary", "additional"]),
});

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const formData = await request.formData();
  const parsed = uploadSchema.safeParse({
    weekStart: formData.get("weekStart"),
    assignmentKind: formData.get("assignmentKind"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid practice session" }, { status: 400 });

  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File is required" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "File must be 10 MB or smaller" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Upload a PDF, PNG, or JPG seating chart" }, { status: 400 });

  let canUpload = isStaffRole(profile.role);
  if (!canUpload) {
    const { data: captainContact, error: captainError } = await supabase
      .from("team_contacts")
      .select("id")
      .eq("team_id", teamId)
      .eq("profile_id", profile.id)
      .eq("contact_role", "captain")
      .eq("is_authorized", true)
      .maybeSingle();
    if (captainError) return NextResponse.json({ error: captainError.message }, { status: 500 });
    canUpload = Boolean(captainContact);
  }
  if (!canUpload) return NextResponse.json({ error: "Only team captains can upload practice seating charts" }, { status: 403 });

  const { data: assignment, error: assignmentError } = await admin
    .from("team_practice_assignments")
    .select("id")
    .eq("team_id", teamId)
    .eq("assignment_kind", parsed.data.assignmentKind)
    .maybeSingle();
  if (assignmentError) return NextResponse.json({ error: assignmentError.message }, { status: 500 });
  if (!assignment) return NextResponse.json({ error: "This practice slot is not assigned" }, { status: 400 });

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${teamId}/practice-seating-charts/${parsed.data.weekStart}-${parsed.data.assignmentKind}-${Date.now()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from("race-documents")
    .upload(path, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: true,
    });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: chart, error } = await admin
    .from("team_practice_seating_charts")
    .upsert(
      {
        team_id: teamId,
        practice_week_start: parsed.data.weekStart,
        assignment_kind: parsed.data.assignmentKind,
        uploaded_by: profile.id,
        file_path: path,
        file_name: safeName,
        mime_type: file.type,
        file_size_bytes: file.size,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id,practice_week_start,assignment_kind" }
    )
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    actorId: profile.id,
    teamId,
    entityType: "team_practice_seating_chart",
    entityId: chart.id,
    action: "team_practice_seating_chart_uploaded",
    details: {
      weekStart: parsed.data.weekStart,
      assignmentKind: parsed.data.assignmentKind,
      fileName: safeName,
      fileSize: file.size,
      mimeType: file.type,
    },
    request,
  });

  return NextResponse.json({ ok: true });
}
