import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TeamFormRoster } from "@/lib/types";
import { sanitizeRosterLayout, type RosterFormCode } from "@/lib/roster-config";

export async function getTeamFormRoster(teamId: string, formCode: RosterFormCode) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("team_form_rosters")
    .select("*")
    .eq("team_id", teamId)
    .eq("form_code", formCode)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...(data as TeamFormRoster),
    layout: sanitizeRosterLayout(formCode, (data as TeamFormRoster).layout),
  };
}

export async function upsertTeamFormRoster(input: {
  teamId: string;
  formCode: RosterFormCode;
  layout: Record<string, string | null>;
  captainSeatKey: string | null;
  createdBy: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("team_form_rosters")
    .upsert(
      {
        team_id: input.teamId,
        form_code: input.formCode,
        layout: sanitizeRosterLayout(input.formCode, input.layout),
        captain_seat_key: input.captainSeatKey,
        created_by: input.createdBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id,form_code" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as TeamFormRoster;
}
