import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TeamMember } from "@/lib/types";

export async function getTeamMembers(teamId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data as TeamMember[];
}
