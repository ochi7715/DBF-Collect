import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RaceCategory, Team, TeamWithContactAccess } from "@/lib/types";

export async function getAccessibleTeams(userId: string, role: string) {
  const supabase = await createSupabaseServerClient();

  if (role === "staff" || role === "admin") {
    const { data, error } = await supabase
      .from("teams")
      .select("*, race_categories(*)")
      .order("name", { ascending: true });
    if (error) throw error;
    return data as TeamWithContactAccess[];
  }

  const { data, error } = await supabase
    .from("team_contacts")
    .select(
      "contact_role, can_view_documents, can_upload_documents, teams(id, name, race_category_id, status, created_by, created_at, updated_at, race_categories(*))"
    )
    .eq("profile_id", userId)
    .eq("is_authorized", true)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .map((row: any) => ({
      ...row.teams,
      contact_role: row.contact_role,
      can_view_documents: row.can_view_documents,
      can_upload_documents: row.can_upload_documents,
    }))
    .filter(Boolean) as TeamWithContactAccess[];
}

export async function getTeamById(teamId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("teams").select("*, race_categories(*)").eq("id", teamId).single();
  if (error) throw error;
  return data as Team & { race_categories: RaceCategory | null };
}

export async function canCurrentUserAccessTeam(teamId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("can_access_team", { target_team_id: teamId });
  if (error) throw error;
  return Boolean(data);
}

export async function canCurrentUserUploadTeamDocuments(teamId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("can_upload_team_documents", { target_team_id: teamId });
  if (error) throw error;
  return Boolean(data);
}
