import Link from "next/link";
import { getContactRoleLabel } from "@/lib/dragon-boat";
import { requireStaff } from "@/lib/auth";
import { buildInvitationUrl, getAppBaseUrl } from "@/lib/invitations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, Team, TeamContact, TeamInvitation } from "@/lib/types";
import { formatDate, normalizeSearch } from "@/lib/utils";

type ContactRow = Profile & {
  team_contacts?: Array<TeamContact & { teams?: Team | null }>;
};

export default async function TeamContactsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q } = await searchParams;
  const search = normalizeSearch(q ?? "");
  const searchKey = search.toLowerCase();
  const supabase = await createSupabaseServerClient();
  const [{ data: contacts, error }, { data: invitations }, baseUrl] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, team_contacts(*, teams(*, race_categories(*)))")
      .eq("role", "team_contact")
      .order("email", { ascending: true })
      .limit(500),
    supabase
      .from("team_invitations")
      .select("*, teams(*, race_categories(*))")
      .in("status", ["pending", "expired"])
      .order("created_at", { ascending: false })
      .limit(500),
    getAppBaseUrl(),
  ]);

  if (error) throw error;

  const contactRows = ((contacts ?? []) as ContactRow[]).filter((contact) => contactMatchesSearch(contact, searchKey));
  const invitationRows = ((invitations ?? []) as TeamInvitation[]).filter((invitation) => invitationMatchesSearch(invitation, searchKey));
  const returnTo = search ? `/admin/team-contacts?q=${encodeURIComponent(search)}` : "/admin/team-contacts";

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Back office</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Team contacts</h1>
        <p className="mt-2 text-slate-600">View captains, managers, co-captains, team access, and pending invitations.</p>
      </div>

      <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Search team contacts</span>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              name="q"
              defaultValue={search}
              placeholder="Name, email, team, race category, contact role"
              className="focus-ring flex-1 rounded-xl border border-slate-300 px-3 py-2"
            />
            <button className="focus-ring rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Search</button>
            {search ? (
              <Link href="/admin/team-contacts" className="focus-ring rounded-xl border border-slate-300 px-4 py-2 text-center font-semibold text-slate-700 hover:bg-slate-50">
                Clear
              </Link>
            ) : null}
          </div>
        </label>
        <p className="mt-3 text-sm text-slate-500">
          Showing {contactRows.length} contact account{contactRows.length === 1 ? "" : "s"} and {invitationRows.length} pending invitation{invitationRows.length === 1 ? "" : "s"}.
        </p>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Pending invitations</h2>
        <div className="mt-4 grid gap-3">
          {invitationRows.map((invitation) => {
            const team = invitation.teams;
            return (
              <div key={invitation.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="font-semibold text-slate-900">{invitation.email}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {team ? team.name : "Team"} | {getContactRoleLabel(invitation.contact_role)} | {invitation.status} | Expires {formatDate(invitation.expires_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {team ? (
                      <Link href={`/admin/teams/${team.id}`} className="focus-ring rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        Open team
                      </Link>
                    ) : null}
                    {invitation.status === "pending" ? (
                      <form action={`/api/admin/invitations/${invitation.id}`} method="post">
                        <input type="hidden" name="action" value="revoke" />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button className="focus-ring rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Revoke</button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <input readOnly value={buildInvitationUrl(baseUrl, invitation.token)} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
              </div>
            );
          })}
          {invitationRows.length === 0 ? (
            <p className="text-sm text-slate-600">{search ? "No invitations match this search." : "No pending invitations."}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-950">Contact accounts</h2>
          <span className="text-sm text-slate-500">{contactRows.length} shown</span>
        </div>
        {contactRows.map((contact) => (
          <article key={contact.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{contact.full_name ?? contact.email}</h2>
                <p className="text-sm text-slate-500">{contact.email}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{contact.is_active ? "Active" : "Inactive"}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(contact.team_contacts ?? []).map((rel) => (
                <Link key={rel.id} href={`/admin/teams/${rel.teams?.id}`} className="rounded-2xl border border-slate-200 p-3 text-sm hover:bg-slate-50">
                  <p className="font-semibold text-slate-900">{rel.teams?.name ?? "Team"}</p>
                  <p className="text-slate-600">
                    {getContactRoleLabel(rel.contact_role)} | {rel.is_authorized ? "Authorized" : "Not authorized"} | {rel.can_upload_documents ? "Upload" : "View only"}
                  </p>
                </Link>
              ))}
              {(contact.team_contacts ?? []).length === 0 ? <p className="text-sm text-slate-600">No team access assigned yet.</p> : null}
            </div>
          </article>
        ))}
        {contactRows.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            {search ? "No contact accounts match this search." : "No contact accounts yet."}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function contactMatchesSearch(contact: ContactRow, searchKey: string) {
  if (!searchKey) return true;

  return matchesSearch(
    searchKey,
    contact.email,
    contact.full_name,
    contact.is_active ? "active" : "inactive",
    ...(contact.team_contacts ?? []).flatMap((relationship) => [
      getContactRoleLabel(relationship.contact_role),
      relationship.is_authorized ? "authorized" : "not authorized",
      relationship.can_upload_documents ? "upload" : "view only",
      relationship.teams?.name,
      relationship.teams?.race_categories?.name,
    ])
  );
}

function invitationMatchesSearch(invitation: TeamInvitation, searchKey: string) {
  if (!searchKey) return true;

  return matchesSearch(
    searchKey,
    invitation.email,
    getContactRoleLabel(invitation.contact_role),
    invitation.status,
    invitation.teams?.name,
    invitation.teams?.race_categories?.name
  );
}

function matchesSearch(searchKey: string, ...values: Array<string | null | undefined>) {
  return values.some((value) => value?.toLowerCase().includes(searchKey));
}
