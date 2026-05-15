import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TeamSwitcher } from "@/components/team-switcher";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { FormGenerationPanel } from "@/components/form-generation-panel";
import { UploadDocumentForm } from "@/components/upload-document-form";
import { getContactRoleLabel, getRequiredTeamFormCodes, getRaceCategoryRuleSummary } from "@/lib/dragon-boat";
import { isStaffRole, requireProfile } from "@/lib/auth";
import { getTeamDocuments, getTeamMemberFormCDocuments } from "@/lib/documents";
import { getTeamFormRoster } from "@/lib/rosters";
import { getTeamMembers } from "@/lib/team-members";
import { canCurrentUserAccessTeam, getAccessibleTeams, getTeamById } from "@/lib/teams";
import { formatBytes, formatDate } from "@/lib/utils";

export default async function TeamDocumentsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const profile = await requireProfile();
  const allowed = await canCurrentUserAccessTeam(teamId);
  if (!allowed) redirect("/portal");

  const [team, teams, teamDocuments, memberDocuments, teamMembers] = await Promise.all([
    getTeamById(teamId).catch(() => null),
    getAccessibleTeams(profile.id, profile.role),
    getTeamDocuments(teamId),
    getTeamMemberFormCDocuments(teamId),
    getTeamMembers(teamId),
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

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Team-level forms</h2>
            <p className="mt-1 text-sm text-slate-600">Only one copy is needed per team for each listed form.</p>
          </div>

          {teamDocuments.map((doc) => (
            <DocumentCard key={doc.id} documentId={doc.id} formCode={doc.form_code} templateFilePath={doc.document_forms?.template_file_path} title={doc.document_forms?.name ?? `Form ${doc.form_code}`} description={doc.document_forms?.description} canUpload={canUploadDocuments} status={doc.status} updatedAt={doc.updated_at} fileName={doc.file_name} fileSize={doc.file_size_bytes} reviewNotes={doc.review_notes} requiresUpload={doc.document_forms?.requires_upload ?? true} />
          ))}
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

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Team member profiles</h2>
          <p className="mt-1 text-sm text-slate-600">Roster PDFs use age, gender, telephone, and photo ID details from these profiles.</p>
        </div>

        {teamMembers.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {teamMembers.map((member) => (
              <form
                key={member.id}
                action={`/api/teams/${team.id}/members/${member.id}`}
                method="post"
                className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2"
              >
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Member name</span>
                  <input
                    name="fullName"
                    required
                    maxLength={160}
                    defaultValue={member.full_name}
                    disabled={!canUploadDocuments}
                    className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Age</span>
                  <input
                    name="age"
                    type="number"
                    min={1}
                    max={130}
                    defaultValue={member.age ?? ""}
                    disabled={!canUploadDocuments}
                    className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Gender</span>
                  <select
                    name="gender"
                    defaultValue={member.gender ?? ""}
                    disabled={!canUploadDocuments}
                    className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-50"
                  >
                    <option value="">Select</option>
                    <option value="F">Female</option>
                    <option value="M">Male</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Telephone #</span>
                  <input
                    name="telephone"
                    maxLength={40}
                    defaultValue={member.telephone ?? ""}
                    disabled={!canUploadDocuments}
                    className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Photo ID #</span>
                  <input
                    name="photoIdNumber"
                    maxLength={80}
                    defaultValue={member.photo_id_number ?? ""}
                    disabled={!canUploadDocuments}
                    className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                  />
                </label>
                {canUploadDocuments ? (
                  <div className="sm:col-span-2">
                    <button className="focus-ring rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      Save member details
                    </button>
                  </div>
                ) : null}
              </form>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
            Add team members to begin building the roster.
          </div>
        )}
      </div>

      <FormGenerationPanel
        teamId={team.id}
        forms={generatedFormCodes}
        members={teamMembers}
        rosters={{ B1: b1Roster, B2: b2Roster }}
        canUpload={canUploadDocuments}
      />

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Form C waivers</h2>
          <p className="mt-1 text-sm text-slate-600">One waiver of liability is required for every team member.</p>
        </div>

        {memberDocuments.map((doc) => (
          <DocumentCard key={doc.id} documentId={doc.id} formCode={doc.form_code} templateFilePath={doc.document_forms?.template_file_path} title={doc.team_members?.full_name ?? "Team member"} description="Form C - Waiver of liability" canUpload={canUploadDocuments} status={doc.status} updatedAt={doc.updated_at} fileName={doc.file_name} fileSize={doc.file_size_bytes} reviewNotes={doc.review_notes} requiresUpload />
        ))}

        {memberDocuments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
            No team members have been added yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DocumentCard({
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
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
