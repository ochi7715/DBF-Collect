import { getRequiredTeamFormCodes } from "@/lib/dragon-boat";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DocumentFormCode, DragonBoatDocument, RaceCategoryRule, StaffDocumentInboxRow, TeamMember } from "@/lib/types";

type SupabaseForDocuments = Awaited<ReturnType<typeof createSupabaseServerClient>> | ReturnType<typeof createSupabaseAdminClient>;

export async function ensureTeamDocuments(teamId: string) {
  const supabase = await createSupabaseServerClient();
  const codes = await getRequiredTeamFormCodesForTeam(supabase, teamId);

  for (const formCode of codes) {
    await ensureDocumentRecord(supabase, {
      teamId,
      teamMemberId: null,
      formCode,
      scope: "team",
    });
  }
}

export async function ensureMemberFormC(teamId: string, teamMemberId: string) {
  const supabase = await createSupabaseServerClient();
  await ensureDocumentRecord(supabase, {
    teamId,
    teamMemberId,
    formCode: "C",
    scope: "member",
  });
}

export async function getTeamDocuments(teamId: string) {
  await ensureTeamDocuments(teamId);
  const supabase = await createSupabaseServerClient();
  const codes = await getRequiredTeamFormCodesForTeam(supabase, teamId);

  const { data, error } = await supabase
    .from("dragon_boat_documents")
    .select("*, document_forms(*)")
    .eq("team_id", teamId)
    .is("team_member_id", null)
    .in("form_code", codes);

  if (error) throw error;
  return sortDocumentsByForm(data as DragonBoatDocument[]);
}

export async function getTeamMemberFormCDocuments(teamId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: members, error: memberError } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .order("full_name", { ascending: true });
  if (memberError) throw memberError;

  for (const member of members ?? []) {
    await ensureMemberFormC(teamId, member.id);
  }

  const { data, error } = await supabase
    .from("dragon_boat_documents")
    .select("*, document_forms(*), team_members(*)")
    .eq("team_id", teamId)
    .eq("form_code", "C")
    .not("team_member_id", "is", null);

  if (error) throw error;
  return (data as DragonBoatDocument[]).sort((a, b) => (a.team_members?.full_name ?? "").localeCompare(b.team_members?.full_name ?? ""));
}

export async function getStaffDocumentInbox() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("dragon_boat_documents")
    .select("*, teams(*, race_categories(*)), team_members(*), document_forms(*), profiles:uploaded_by(*)")
    .neq("status", "not_started")
    .order("updated_at", { ascending: false })
    .limit(150);

  if (error) throw error;
  return data as StaffDocumentInboxRow[];
}

export async function ensureTeamDocumentRequirementsForAllTeams() {
  const admin = createSupabaseAdminClient();
  const { data: teams, error } = await admin.from("teams").select("id, race_categories(rule_set)");
  if (error) throw error;

  for (const team of teams ?? []) {
    const category = Array.isArray(team.race_categories) ? team.race_categories[0] : team.race_categories;
    const codes = getRequiredTeamFormCodes(category?.rule_set as RaceCategoryRule | undefined);
    for (const formCode of codes) {
      await ensureDocumentRecord(admin, {
        teamId: team.id,
        teamMemberId: null,
        formCode,
        scope: "team",
      });
    }
  }
}

export async function ensureMemberFormCForAllMembers() {
  const admin = createSupabaseAdminClient();
  const { data: members, error } = await admin.from("team_members").select("id, team_id");
  if (error) throw error;

  for (const member of (members ?? []) as Pick<TeamMember, "id" | "team_id">[]) {
    await ensureDocumentRecord(admin, {
      teamId: member.team_id,
      teamMemberId: member.id,
      formCode: "C",
      scope: "member",
    });
  }
}

async function getRequiredTeamFormCodesForTeam(supabase: SupabaseForDocuments, teamId: string) {
  const { data, error } = await supabase.from("teams").select("race_categories(rule_set)").eq("id", teamId).single();
  if (error) throw error;

  const category = Array.isArray(data.race_categories) ? data.race_categories[0] : data.race_categories;
  return getRequiredTeamFormCodes(category?.rule_set as RaceCategoryRule | undefined);
}

async function ensureDocumentRecord(
  supabase: SupabaseForDocuments,
  input: {
    teamId: string;
    teamMemberId: string | null;
    formCode: DocumentFormCode;
    scope: "team" | "member";
  }
) {
  let query = supabase
    .from("dragon_boat_documents")
    .select("id")
    .eq("team_id", input.teamId)
    .eq("form_code", input.formCode)
    .limit(1);

  query = input.teamMemberId ? query.eq("team_member_id", input.teamMemberId) : query.is("team_member_id", null);

  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("dragon_boat_documents")
    .insert({
      team_id: input.teamId,
      team_member_id: input.teamMemberId,
      form_code: input.formCode,
      scope: input.scope,
      status: "not_started",
    })
    .select("id")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") return null;
    throw error;
  }

  return data.id as string;
}

function sortDocumentsByForm(documents: DragonBoatDocument[]) {
  return [...documents].sort((a, b) => {
    const order = (a.document_forms?.sort_order ?? 0) - (b.document_forms?.sort_order ?? 0);
    if (order !== 0) return order;
    return a.form_code.localeCompare(b.form_code);
  });
}
