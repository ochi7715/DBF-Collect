import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { ensureMemberFormC } from "@/lib/documents";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const memberSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
});

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const profile = await requireProfile();
  const formData = await request.formData();
  const parsed = memberSchema.parse({
    fullName: formData.get("fullName"),
  });

  const supabase = await createSupabaseServerClient();
  const { data: allowed, error: allowedError } = await supabase.rpc("can_upload_team_documents", { target_team_id: teamId });
  if (allowedError || !allowed) redirect("/portal");

  const admin = createSupabaseAdminClient();
  const { data: member, error } = await admin
    .from("team_members")
    .insert({
      team_id: teamId,
      full_name: parsed.fullName,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw error;

  await ensureMemberFormC(teamId, member.id);

  await writeAuditLog({
    actorId: profile.id,
    teamId,
    entityType: "team_member",
    entityId: member.id,
    action: "team_member_created",
    details: parsed,
    request,
  });

  redirect(`/portal/teams/${teamId}/documents`);
}
