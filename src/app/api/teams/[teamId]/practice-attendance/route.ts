import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const attendanceSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assignmentKind: z.enum(["primary", "additional"]),
  response: z.enum(["confirmed", "no_attendance"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const profile = await requireProfile();
  const formData = await request.formData();
  const parsed = attendanceSchema.parse({
    weekStart: formData.get("weekStart"),
    assignmentKind: formData.get("assignmentKind"),
    response: formData.get("response"),
  });

  const supabase = await createSupabaseServerClient();
  const { data: allowed, error: allowedError } = await supabase.rpc("can_upload_team_documents", {
    target_team_id: teamId,
  });
  if (allowedError || !allowed) redirect("/portal/practice");

  const admin = createSupabaseAdminClient();
  const { data: assignment, error: assignmentError } = await admin
    .from("team_practice_assignments")
    .select("id, practice_day")
    .eq("team_id", teamId)
    .eq("assignment_kind", parsed.assignmentKind)
    .maybeSingle();
  if (assignmentError) throw assignmentError;
  if (!assignment) redirect("/portal/practice");

  const { data: attendance, error } = await admin
    .from("team_practice_attendance")
    .upsert(
      {
        team_id: teamId,
        practice_week_start: parsed.weekStart,
        assignment_kind: parsed.assignmentKind,
        practice_day: assignment.practice_day,
        response: parsed.response,
        responded_by: profile.id,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id,practice_week_start,assignment_kind" }
    )
    .select("id")
    .single();

  if (error) throw error;

  await writeAuditLog({
    actorId: profile.id,
    teamId,
    entityType: "team_practice_attendance",
    entityId: attendance.id,
    action: "team_practice_attendance_saved",
    details: parsed,
    request,
  });

  redirect("/portal/practice");
}
