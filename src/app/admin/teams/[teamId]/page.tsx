import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { getContactRoleLabel, getRaceCategoryRuleSummary, TEAM_CONTACT_ROLE_OPTIONS } from "@/lib/dragon-boat";
import { requireStaff } from "@/lib/auth";
import { getTeamDocuments, getTeamMemberFormCDocuments } from "@/lib/documents";
import { buildInvitationUrl, getAppBaseUrl } from "@/lib/invitations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTeamById } from "@/lib/teams";
import type { RaceCategory, TeamContact, TeamInvitation } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default async function AdminTeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ invitation?: string; delivery?: string }>;
}) {
  const { teamId } = await params;
  const { invitation: highlightedInvitationId, delivery } = await searchParams;
  await requireStaff();

  const [team, teamDocuments, memberDocuments] = await Promise.all([
    getTeamById(teamId).catch(() => null),
    getTeamDocuments(teamId),
    getTeamMemberFormCDocuments(teamId),
  ]);
  if (!team) notFound();

  const supabase = await createSupabaseServerClient();
  const [{ data: contacts }, { data: invitations }, { data: categories }, baseUrl] = await Promise.all([
    supabase.from("team_contacts").select("*, profiles(*)").eq("team_id", teamId).order("created_at", { ascending: true }),
    supabase
      .from("team_invitations")
      .select("*")
      .eq("team_id", teamId)
      .in("status", ["pending", "expired"])
      .order("created_at", { ascending: false }),
    supabase.from("race_categories").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
    getAppBaseUrl(),
  ]);

  const contactRows = (contacts ?? []) as TeamContact[];
  const invitationRows = (invitations ?? []) as TeamInvitation[];
  const filledRoles = new Set(contactRows.filter((row) => row.is_authorized).map((row) => row.contact_role));
  const pendingRoles = new Set(invitationRows.filter((row) => row.status === "pending").map((row) => row.contact_role));
  const missingRoles = TEAM_CONTACT_ROLE_OPTIONS.filter((role) => !filledRoles.has(role.value) && !pendingRoles.has(role.value));

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/admin/teams" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
          Back to teams
        </Link>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-brand-600">Team record</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{team.name}</h1>
        <p className="mt-2 text-slate-600">
          {team.race_categories?.name ?? "Race category pending"} | {getRaceCategoryRuleSummary(team.race_categories?.rule_set)}
        </p>
      </div>

      {highlightedInvitationId ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 shadow-sm">
          {delivery === "email-sent"
            ? "Invitation created and Supabase was asked to send the email."
            : "Invitation created. Use the invitation link below if email delivery is not configured yet."}
        </div>
      ) : null}

      {missingRoles.length > 0 ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
          Missing portal roles: {missingRoles.map((role) => role.label).join(", ")}.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form action={`/api/admin/teams/${team.id}`} method="post" className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="text-lg font-bold text-slate-950">Team details</h2>
          </div>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Team name</span>
            <input name="name" required defaultValue={team.name} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Race category</span>
            <select name="raceCategoryId" defaultValue={team.race_category_id} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
              {((categories ?? []) as RaceCategory[]).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} - {getRaceCategoryRuleSummary(category.rule_set)}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select name="status" defaultValue={team.status} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
              <option value="registration">Registration</option>
              <option value="in_review">In review</option>
              <option value="approved">Approved</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <button className="focus-ring rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Save team</button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Invite team contact</h2>
          <form action={`/api/admin/teams/${team.id}/invitations`} method="post" className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input name="email" type="email" required className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Portal role</span>
              <select name="contactRole" required className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                {TEAM_CONTACT_ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name="canViewDocuments" defaultChecked className="size-4 rounded border-slate-300 text-brand-600" />
              Can view documents
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name="canUploadDocuments" defaultChecked className="size-4 rounded border-slate-300 text-brand-600" />
              Can upload documents
            </label>
            <button className="focus-ring w-full rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Create invitation</button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Authorized team contacts</h2>
          <div className="mt-4 space-y-3">
            {contactRows.map((row) => (
              <form key={row.id} action={`/api/admin/teams/${team.id}/contacts/${row.id}`} method="post" className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{row.profiles?.full_name ?? row.profiles?.email}</p>
                    <p className="text-sm text-slate-600">{row.profiles?.email}</p>
                  </div>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Portal role</span>
                    <select name="contactRole" defaultValue={row.contact_role} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                      {TEAM_CONTACT_ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </label>
                  <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="isAuthorized" defaultChecked={row.is_authorized} className="size-4 rounded border-slate-300 text-brand-600" />
                      Authorized
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="canViewDocuments" defaultChecked={row.can_view_documents} className="size-4 rounded border-slate-300 text-brand-600" />
                      View
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="canUploadDocuments" defaultChecked={row.can_upload_documents} className="size-4 rounded border-slate-300 text-brand-600" />
                      Upload
                    </label>
                  </div>
                  <button className="focus-ring w-fit rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Save access</button>
                </div>
              </form>
            ))}
            {contactRows.length === 0 ? <p className="text-sm text-slate-600">No contacts assigned yet.</p> : null}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Pending invitations</h2>
          <div className="mt-4 space-y-3">
            {invitationRows.map((row) => {
              const invitationUrl = buildInvitationUrl(baseUrl, row.token);
              return (
                <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-semibold text-slate-900">{row.email}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {getContactRoleLabel(row.contact_role)} | {row.status} | Expires {formatDate(row.expires_at)}
                      </p>
                    </div>
                    {row.status === "pending" ? (
                      <form action={`/api/admin/invitations/${row.id}`} method="post">
                        <input type="hidden" name="action" value="revoke" />
                        <input type="hidden" name="returnTo" value={`/admin/teams/${team.id}`} />
                        <button className="focus-ring rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Revoke</button>
                      </form>
                    ) : null}
                  </div>
                  <input readOnly value={invitationUrl} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
                </div>
              );
            })}
            {invitationRows.length === 0 ? <p className="text-sm text-slate-600">No pending invitations.</p> : null}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-lg font-bold text-slate-950">Required team forms</h2>
            <Link href={`/portal/teams/${team.id}/documents`} className="font-semibold text-brand-600 hover:text-brand-700">
              Open team portal
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {teamDocuments.map((doc) => (
              <Link key={doc.id} href={`/admin/documents/${doc.id}`} className="block rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{doc.document_forms?.name}</p>
                  <DocumentStatusBadge status={doc.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-950">Team member Form Cs</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {memberDocuments.map((doc) => (
              <Link key={doc.id} href={`/admin/documents/${doc.id}`} className="block rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{doc.team_members?.full_name ?? "Team member"}</p>
                  <DocumentStatusBadge status={doc.status} />
                </div>
              </Link>
            ))}
            {memberDocuments.length === 0 ? <p className="text-sm text-slate-600">No team members added yet.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
