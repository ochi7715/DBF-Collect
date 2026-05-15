import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { ensureTeamDocuments } from "@/lib/documents";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const teamSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(160),
  raceCategoryId: z.string().uuid(),
  status: z.string().trim().min(1).max(80).default("registration"),
});

export async function POST(request: Request) {
  const profile = await requireStaff();
  const formData = await request.formData();
  const parsed = teamSchema.parse({
    name: formData.get("name"),
    raceCategoryId: formData.get("raceCategoryId"),
    status: formData.get("status")?.toString() ?? "registration",
  });

  const admin = createSupabaseAdminClient();
  const { data: team, error } = await admin
    .from("teams")
    .insert({
      name: parsed.name,
      race_category_id: parsed.raceCategoryId,
      status: parsed.status,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw error;

  await ensureTeamDocuments(team.id);

  await writeAuditLog({
    actorId: profile.id,
    teamId: team.id,
    entityType: "team",
    entityId: team.id,
    action: "team_created",
    details: parsed,
    request,
  });

  redirect(`/admin/teams/${team.id}`);
}
