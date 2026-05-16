import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { ensureTeamDocuments } from "@/lib/documents";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const teamSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(160),
  raceCategoryId: z.string().uuid(),
});

export async function POST(request: Request) {
  const profile = await requireProfile();
  const formData = await request.formData();
  const parsed = teamSchema.parse({
    name: formData.get("name"),
    raceCategoryId: formData.get("raceCategoryId"),
  });
  const admin = createSupabaseAdminClient();

  const { data: category, error: categoryError } = await admin
    .from("race_categories")
    .select("id")
    .eq("id", parsed.raceCategoryId)
    .eq("is_active", true)
    .maybeSingle();
  if (categoryError) throw categoryError;
  if (!category) redirect("/portal/teams/new?error=invalid-division");

  const { data: team, error } = await admin
    .from("teams")
    .insert({
      name: parsed.name,
      race_category_id: parsed.raceCategoryId,
      status: "registration",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") redirect("/portal/teams/new?error=duplicate-team");
    throw error;
  }

  const { error: contactError } = await admin.from("team_contacts").insert({
    team_id: team.id,
    profile_id: profile.id,
    contact_role: "captain",
    contact_name: profile.full_name,
    contact_email: profile.email,
    is_authorized: true,
    can_view_documents: true,
    can_upload_documents: true,
  });
  if (contactError) throw contactError;

  await ensureTeamDocuments(team.id);

  await writeAuditLog({
    actorId: profile.id,
    teamId: team.id,
    entityType: "team",
    entityId: team.id,
    action: "team_self_created",
    details: parsed,
    request,
  });

  redirect("/portal");
}
