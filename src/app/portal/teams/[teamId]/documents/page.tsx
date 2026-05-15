import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TeamSwitcher } from "@/components/team-switcher";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { RosterLayoutPanel } from "@/components/form-generation-panel";
import { TeamMemberTable } from "@/components/team-member-table";
import { UploadDocumentForm } from "@/components/upload-document-form";
import { TEAM_CONTACT_ROLE_OPTIONS, getContactRoleLabel, getRequiredTeamFormCodes, getRaceCategoryRuleSummary } from "@/lib/dragon-boat";
import { isStaffRole, requireProfile } from "@/lib/auth";
import { getTeamDocuments, getTeamMemberFormCDocuments } from "@/lib/documents";
import { getTeamFormRoster } from "@/lib/rosters";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTeamMembers } from "@/lib/team-members";
import { canCurrentUserAccessTeam, getAccessibleTeams, getTeamById } from "@/lib/teams";
import type { TeamContact } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/utils";

export default async function TeamDocumentsPage({
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

  const [team, teams, teamDocuments, memberDocuments, teamMembers, { data: contacts }] = await Promise.all([
    getTeamById(teamId).catch(() => null),
    getAccessibleTeams(profile.id, profile.role),
    getTeamDocuments(teamId),
    getTeamMemberFormCDocuments(teamId),
    getTeamMembers(teamId),
    admin.from("team_contacts").select("*, profiles(*)").eq("team_id", teamId).order("created_at", { ascending: true }),
  ]);

  if (!team) notFound();

  const teamAccess = teams.find((item) => item.id === teamId);
  const canUploadDocuments = isStaffRole(profile.role) || teamAccess?.can_upload_documents !== false;
  const requiredFormCodes = getRequiredTeamFormCodes(team.race_categories?.rule_set);
  const generatedFormCodes = requiredFormCodes.filter((code): code is "A1" | "A2" | "B1" | "B2" =>
    ["A1", "A2", "B1", "B2"].includes(code)
  );
  const [b1Roster, b2Roster] = await Promise.all([
    generatedFormCodes.includes("B1") ? getTeamFormRoster(teamId, "B1") : Promise.resolve(null),
    generatedFormCodes.includes("B2") ? getTeamFormRoster(teamId, "B2") : Promise.resolve(null),
  ]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_280px]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Team documents</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{team.name}</h1>
          <p className="mt-2 text-slate-600">
            {team.race_categories?.name ?? "Race category pending"} requires {requiredFormCodes.map((code) => `Form ${code}`).join(", ")}.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {getRaceCategoryRuleSummary(team.race_categories?.rule_set)}
            {teamAccess?.contact_role ? ` | ${getContactRoleLabel(teamAccess.contact_role)}` : ""}
          </p>
        </div>
        {teams.length > 1 ? <TeamSwitcher teams={teams} currentTeamId={teamId} /> : null}
      </div>

      <TeamLeadershipPanel
        teamId={team.id}
        contacts={(contacts ?? []) as TeamContact[]}
        currentUserId={profile.id}
        status={leadership}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-950">Team-level forms</h2>
            <p className="mt-1 text-sm text-slate-600">Only one copy is needed per team for each listed form.</p>
          </div>
          <div className="divide-y divide-slate-200">
            {teamDocuments.map((doc) => (
              <DocumentRow key={doc.id} documentId={doc.id} formCode={doc.form_code} templateFilePath={doc.document_forms?.template_file_path} title={doc.document_forms?.name ?? `Form ${doc.form_code}`} description={doc.document_forms?.description} canUpload={canUploadDocuments} status={doc.status} updatedAt={doc.updated_at} fileName={doc.file_name} fileSize={doc.file_size_bytes} reviewNotes={doc.review_notes} requiresUpload={doc.document_forms?.requires_upload ?? true} />
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Add team member</h2>
          <p className="mt-1 text-sm text-slate-600">Add each team member, then upload their Form C waiver.</p>
          {canUploadDocuments ? (
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

      <TeamMemberTable
        teamId={team.id}
        members={teamMembers}
        canUpload={canUploadDocuments}
        title="Team member profiles"
        description="Admins use age, gender, telephone, and photo ID details from these profiles when generating roster PDFs."
      />

      <RosterLayoutPanel
        teamId={team.id}
        forms={generatedFormCodes.filter((code): code is "B1" | "B2" => code === "B1" || code === "B2")}
        members={teamMembers}
        rosters={{ B1: b1Roster, B2: b2Roster }}
        canUpload={canUploadDocuments}
      />

      <FormCWaiverTable documents={memberDocuments} canUpload={canUploadDocuments} />
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

function FormCWaiverTable({
  documents,
  canUpload,
}: {
  documents: Awaited<ReturnType<typeof getTeamMemberFormCDocuments>>;
  canUpload: boolean;
}) {
  const templateFilePath = documents[0]?.document_forms?.template_file_path;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Form C waivers</h2>
          <p className="mt-1 text-sm text-slate-600">One waiver of liability is required for every team member.</p>
        </div>
        {templateFilePath ? (
          <Link href="/api/forms/C/template" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            Download blank Form C
          </Link>
        ) : null}
      </div>

      {documents.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Team member</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3">Current file</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {documents.map((doc) => (
                <tr key={doc.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-950">{doc.team_members?.full_name ?? "Team member"}</p>
                    {doc.review_notes ? <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">Admin note: {doc.review_notes}</p> : null}
                  </td>
                  <td className="px-5 py-4">
                    <DocumentStatusBadge status={doc.status as any} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(doc.updated_at)}</td>
                  <td className="px-5 py-4 text-slate-600">
                    {doc.file_name ? (
                      <div>
                        <p>{doc.file_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatBytes(doc.file_size_bytes)}</p>
                        <Link
                          href={`/api/documents/${doc.id}/signed-url?version=uploaded`}
                          className="mt-2 inline-block font-semibold text-brand-600 hover:text-brand-700"
                        >
                          Open uploaded file
                        </Link>
                      </div>
                    ) : (
                      <span className="text-slate-400">No file uploaded</span>
                    )}
                  </td>
                  <td className="min-w-[18rem] px-5 py-4">
                    {canUpload ? (
                      <UploadDocumentForm documentId={doc.id} />
                    ) : (
                      <p className="rounded-2xl bg-slate-50 p-3 text-slate-600">Uploads are disabled for your team access.</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-8 text-center text-sm text-slate-600">No team members have been added yet.</p>
      )}
    </div>
  );
}

function DocumentRow({
  documentId,
  formCode,
  templateFilePath,
  title,
  description,
  canUpload,
  status,
  updatedAt,
  fileName,
  fileSize,
  reviewNotes,
  requiresUpload,
}: {
  documentId: string;
  formCode: string;
  templateFilePath?: string | null;
  title: string;
  description?: string | null;
  canUpload: boolean;
  status: string;
  updatedAt: string;
  fileName?: string | null;
  fileSize?: number | null;
  reviewNotes?: string | null;
  requiresUpload: boolean;
}) {
  return (
    <article className="p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            <DocumentStatusBadge status={status as any} />
          </div>
          {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
          {templateFilePath ? (
            <Link href={`/api/forms/${formCode}/template`} className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
              Download blank Form {formCode}
            </Link>
          ) : null}
          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <p>
              <span className="font-semibold text-slate-800">Upload:</span> {requiresUpload ? "Required" : "Not required"}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Updated:</span> {formatDate(updatedAt)}
            </p>
          </div>
          {fileName ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold">Current file</p>
              <p>
                {fileName} | {formatBytes(fileSize)}
              </p>
              <Link href={`/api/documents/${documentId}/signed-url?version=uploaded`} className="mt-2 inline-block font-semibold text-brand-600 hover:text-brand-700">
                Open uploaded file
              </Link>
            </div>
          ) : null}
          {reviewNotes ? <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">Admin note: {reviewNotes}</p> : null}
        </div>

        {requiresUpload && canUpload ? (
          <div className="w-full rounded-2xl border border-slate-200 p-4 lg:w-80">
            <UploadDocumentForm documentId={documentId} />
          </div>
        ) : requiresUpload ? (
          <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 lg:w-80">
            You can view this form, but uploads are disabled for your team access.
          </div>
        ) : null}
      </div>
    </article>
  );
}
