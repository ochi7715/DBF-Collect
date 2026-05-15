import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { ensureTeamDocuments } from "@/lib/documents";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const teamUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  raceCategoryId: z.string().uuid(),
  status: z.string().trim().min(1).max(80),
});

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const profile = await requireStaff();
  const formData = await request.formData();
  const parsed = teamUpdateSchema.parse({
    name: formData.get("name"),
    raceCategoryId: formData.get("raceCategoryId"),
    status: formData.get("status")?.toString() ?? "registration",
  });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("teams")
    .update({
      name: parsed.name,
      race_category_id: parsed.raceCategoryId,
      status: parsed.status,
    })
    .eq("id", teamId);

  if (error) throw error;

  await ensureTeamDocuments(teamId);

  await writeAuditLog({
    actorId: profile.id,
    teamId,
    entityType: "team",
    entityId: teamId,
    action: "team_updated",
    details: parsed,
    request,
  });

  redirect(`/admin/teams/${teamId}`);
}
