import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { requireStaff } from "@/lib/auth";
import { getChildById } from "@/lib/children";
import { getChildDocuments } from "@/lib/documents";
import { buildInvitationUrl, getAppBaseUrl } from "@/lib/invitations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CaregiverInvitation, ChildCaregiver } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default async function AdminChildDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>;
  searchParams: Promise<{ invitation?: string; delivery?: string }>;
}) {
  const { childId } = await params;
  const { invitation: highlightedInvitationId, delivery } = await searchParams;
  await requireStaff();

  const [child, documents] = await Promise.all([getChildById(childId).catch(() => null), getChildDocuments(childId)]);
  if (!child) notFound();

  const supabase = await createSupabaseServerClient();
  const [{ data: caregivers }, { data: invitations }, baseUrl] = await Promise.all([
    supabase.from("child_caregivers").select("*, profiles(*)").eq("child_id", childId).order("created_at", { ascending: true }),
    supabase
      .from("caregiver_invitations")
      .select("*")
      .eq("child_id", childId)
      .in("status", ["pending", "expired"])
      .order("created_at", { ascending: false }),
    getAppBaseUrl(),
  ]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/admin/children" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
          Back to records
        </Link>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-brand-600">Child record</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          {child.first_name} {child.last_name}
        </h1>
        <p className="mt-2 text-slate-600">DOB {formatDate(child.date_of_birth)} | Patient ID {child.external_patient_id ?? "-"}</p>
      </div>

      {highlightedInvitationId ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 shadow-sm">
          {delivery === "email-sent"
            ? "Invitation created and Supabase was asked to send the email."
            : "Invitation created. Use the invitation link below if email delivery is not configured yet."}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form action={`/api/admin/children/${child.id}`} method="post" className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="text-lg font-bold text-slate-950">Record details</h2>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">First name</span>
            <input name="firstName" required defaultValue={child.first_name} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Last name</span>
            <input name="lastName" required defaultValue={child.last_name} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Date of birth</span>
            <input name="dateOfBirth" type="date" defaultValue={child.date_of_birth ?? ""} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Patient ID</span>
            <input name="externalPatientId" defaultValue={child.external_patient_id ?? ""} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select name="status" defaultValue={child.status} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
              <option value="intake">Intake</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <button className="focus-ring rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Save child record</button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Invite caregiver</h2>
          <form action={`/api/admin/children/${child.id}/invitations`} method="post" className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input name="email" type="email" required className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Relationship</span>
              <input name="relationship" placeholder="Parent, guardian, caregiver" className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
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
          <h2 className="text-lg font-bold text-slate-950">Authorized caregivers</h2>
          <div className="mt-4 space-y-3">
            {((caregivers ?? []) as ChildCaregiver[]).map((row) => (
              <form key={row.id} action={`/api/admin/children/${child.id}/caregivers/${row.id}`} method="post" className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{row.profiles?.full_name ?? row.profiles?.email}</p>
                    <p className="text-sm text-slate-600">{row.profiles?.email}</p>
                  </div>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Relationship</span>
                    <input name="relationship" defaultValue={row.relationship ?? ""} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
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
            {(caregivers ?? []).length === 0 ? <p className="text-sm text-slate-600">No caregivers assigned yet.</p> : null}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Pending invitations</h2>
          <div className="mt-4 space-y-3">
            {((invitations ?? []) as CaregiverInvitation[]).map((row) => {
              const invitationUrl = buildInvitationUrl(baseUrl, row.token);
              return (
                <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-semibold text-slate-900">{row.email}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {row.relationship ?? "Caregiver"} | {row.status} | Expires {formatDate(row.expires_at)}
                      </p>
                    </div>
                    {row.status === "pending" ? (
                      <form action={`/api/admin/invitations/${row.id}`} method="post">
                        <input type="hidden" name="action" value="revoke" />
                        <input type="hidden" name="returnTo" value={`/admin/children/${child.id}`} />
                        <button className="focus-ring rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Revoke</button>
                      </form>
                    ) : null}
                  </div>
                  <input readOnly value={invitationUrl} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
                </div>
              );
            })}
            {(invitations ?? []).length === 0 ? <p className="text-sm text-slate-600">No pending invitations.</p> : null}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-lg font-bold text-slate-950">Intake checklist</h2>
            <Link href={`/portal/children/${child.id}/documents`} className="font-semibold text-brand-600 hover:text-brand-700">
              Open portal documents
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {documents.map((doc) => (
              <Link key={doc.id} href={`/admin/documents/${doc.id}`} className="block rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{doc.intake_document_templates?.name}</p>
                  <DocumentStatusBadge status={doc.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
