import { notFound, redirect } from "next/navigation";
import { TeamSwitcher } from "@/components/team-switcher";
import { TeamMemberTable } from "@/components/team-member-table";
import { TEAM_CONTACT_ROLE_OPTIONS, getContactRoleLabel, getRaceCategoryRuleSummary } from "@/lib/dragon-boat";
import { isStaffRole, requireProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTeamMembers } from "@/lib/team-members";
import { canCurrentUserAccessTeam, getAccessibleTeams, getTeamById } from "@/lib/teams";
import type { TeamContact } from "@/lib/types";

export default async function TeamManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ leadership?: string }>;
}) {
  const { teamId } = await params;
  const { leadership } = await searchParams;
  const profile = await requireProfile();
  const allowed = await canCurrentUserAccessTeam(teamId);
  if (!allowed) redirect("/portal");

  const admin = createSupabaseAdminClient();
  const [team, teams, teamMembers, { data: contacts }] = await Promise.all([
    getTeamById(teamId).catch(() => null),
    getAccessibleTeams(profile.id, profile.role),
    getTeamMembers(teamId),
    admin.from("team_contacts").select("*, profiles(*)").eq("team_id", teamId).order("created_at", { ascending: true }),
  ]);

  if (!team) notFound();

  const teamAccess = teams.find((item) => item.id === teamId);
  const canManageMembers = isStaffRole(profile.role) || teamAccess?.can_upload_documents !== false;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_280px]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">My teams</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{team.name}</h1>
          <p className="mt-2 text-slate-600">{team.race_categories?.name ?? "Race category pending"}</p>
          <p className="mt-1 text-sm text-slate-500">
            {getRaceCategoryRuleSummary(team.race_categories?.rule_set)}
            {teamAccess?.contact_role ? ` | ${getContactRoleLabel(teamAccess.contact_role)}` : ""}
          </p>
        </div>
        {teams.length > 1 ? <TeamSwitcher teams={teams} currentTeamId={teamId} destination="management" /> : null}
      </div>

      <TeamLeadershipPanel teamId={team.id} contacts={(contacts ?? []) as TeamContact[]} currentUserId={profile.id} status={leadership} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <TeamMemberTable
          teamId={team.id}
          members={teamMembers}
          canUpload={canManageMembers}
          title="Team member profiles"
          description="Maintain the roster details for the people on this team."
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Add team member</h2>
          <p className="mt-1 text-sm text-slate-600">Add a member, then complete their roster details below.</p>
          {canManageMembers ? (
            <form action={`/api/teams/${team.id}/members`} method="post" className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Member name</span>
                <input name="fullName" required maxLength={160} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Age</span>
                  <input name="age" type="number" min={1} max={130} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Gender</span>
                  <select name="gender" className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                    <option value="">Select</option>
                    <option value="F">Female</option>
                    <option value="M">Male</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Telephone #</span>
                <input name="telephone" maxLength={40} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Photo ID #</span>
                <input name="photoIdNumber" maxLength={80} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <button className="focus-ring w-full rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Add member</button>
            </form>
          ) : (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Your team access is view-only.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function TeamLeadershipPanel({
  teamId,
  contacts,
  currentUserId,
  status,
}: {
  teamId: string;
  contacts: TeamContact[];
  currentUserId: string;
  status?: string;
}) {
  const currentContact = contacts.find((contact) => contact.profile_id === currentUserId && contact.is_authorized);
  if (!currentContact) return null;

  const holderByRole = new Map(contacts.map((contact) => [contact.contact_role, contact]));

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-950">Team leadership</h2>
        <p className="mt-1 text-sm text-slate-600">Choose the leadership role you hold for this team.</p>
      </div>

      <div className="grid gap-3 border-b border-slate-200 p-5 md:grid-cols-3">
        {TEAM_CONTACT_ROLE_OPTIONS.map((role) => {
          const holder = holderByRole.get(role.value);
          const isCurrentUser = holder?.profile_id === currentUserId;
          return (
            <div key={role.value} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{role.label}</p>
              <p className="mt-2 font-semibold text-slate-950">
                {holder?.profiles?.full_name ?? holder?.profiles?.email ?? "Unassigned"}
              </p>
              <p className="mt-1 text-sm text-slate-600">{isCurrentUser ? "You" : holder ? "Assigned" : "Available"}</p>
            </div>
          );
        })}
      </div>

      <form action={`/api/teams/${teamId}/leadership`} method="post" className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="text-sm font-medium text-slate-700">Your role</span>
          <select
            name="contactRole"
            defaultValue={currentContact.contact_role}
            className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
          >
            {TEAM_CONTACT_ROLE_OPTIONS.map((role) => {
              const holder = holderByRole.get(role.value);
              const isUnavailable = Boolean(holder && holder.profile_id !== currentUserId);
              return (
                <option key={role.value} value={role.value} disabled={isUnavailable}>
                  {role.label}
                  {isUnavailable ? " - already assigned" : ""}
                </option>
              );
            })}
          </select>
        </label>
        <button className="focus-ring rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Save role</button>
      </form>

      {status === "saved" ? (
        <p className="border-t border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800">Leadership role saved.</p>
      ) : null}
      {status === "occupied" ? (
        <p className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800">
          That role is already assigned to another contact.
        </p>
      ) : null}
    </div>
  );
}
