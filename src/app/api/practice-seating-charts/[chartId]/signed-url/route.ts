import { NextResponse, type NextRequest } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ chartId: string }> }) {
  const { chartId } = await params;
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: chart, error } = await supabase
    .from("team_practice_seating_charts")
    .select("id, team_id, file_path")
    .eq("id", chartId)
    .single();
  if (error || !chart) return NextResponse.json({ error: "Seating chart not found" }, { status: 404 });

  const { data: allowed } = await supabase.rpc("can_access_team", { target_team_id: chart.team_id });
  if (!allowed) {
    await writeAuditLog({
      actorId: user.id,
      teamId: chart.team_id,
      entityType: "team_practice_seating_chart",
      entityId: chartId,
      action: "team_practice_seating_chart_access_denied",
      request,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error: signedUrlError } = await admin.storage.from("race-documents").createSignedUrl(chart.file_path, 60);
  if (signedUrlError) return NextResponse.json({ error: signedUrlError.message }, { status: 500 });

  await writeAuditLog({
    actorId: user.id,
    teamId: chart.team_id,
    entityType: "team_practice_seating_chart",
    entityId: chartId,
    action: "team_practice_seating_chart_opened",
    request,
  });

  return NextResponse.redirect(data.signedUrl);
}
