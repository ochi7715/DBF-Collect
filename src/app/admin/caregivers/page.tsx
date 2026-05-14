import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { buildInvitationUrl, getAppBaseUrl } from "@/lib/invitations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CaregiverInvitation, Child, ChildCaregiver, Profile } from "@/lib/types";
import { formatDate, normalizeSearch } from "@/lib/utils";

type CaregiverRow = Profile & {
  child_caregivers?: Array<ChildCaregiver & { children?: Child | null }>;
};

export default async function CaregiversPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q } = await searchParams;
  const search = normalizeSearch(q ?? "");
  const searchKey = search.toLowerCase();
  const supabase = await createSupabaseServerClient();
  const [{ data: caregivers, error }, { data: invitations }, baseUrl] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, child_caregivers(*, children(*))")
      .eq("role", "caregiver")
      .order("email", { ascending: true })
      .limit(500),
    supabase
      .from("caregiver_invitations")
      .select("*, children(*)")
      .in("status", ["pending", "expired"])
      .order("created_at", { ascending: false })
      .limit(500),
    getAppBaseUrl(),
  ]);

  if (error) throw error;

  const caregiverRows = ((caregivers ?? []) as CaregiverRow[]).filter((caregiver) => caregiverMatchesSearch(caregiver, searchKey));
  const invitationRows = ((invitations ?? []) as CaregiverInvitation[]).filter((invitation) => invitationMatchesSearch(invitation, searchKey));
  const returnTo = search ? `/admin/caregivers?q=${encodeURIComponent(search)}` : "/admin/caregivers";

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Back office</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Caregivers</h1>
        <p className="mt-2 text-slate-600">View caregiver accounts, child access relationships, and pending invitations.</p>
      </div>

      <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Search caregivers</span>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              name="q"
              defaultValue={search}
              placeholder="Name, email, child, patient ID, relationship"
              className="focus-ring flex-1 rounded-xl border border-slate-300 px-3 py-2"
            />
            <button className="focus-ring rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Search</button>
            {search ? (
              <Link href="/admin/caregivers" className="focus-ring rounded-xl border border-slate-300 px-4 py-2 text-center font-semibold text-slate-700 hover:bg-slate-50">
                Clear
              </Link>
            ) : null}
          </div>
        </label>
        <p className="mt-3 text-sm text-slate-500">
          Showing {caregiverRows.length} caregiver account{caregiverRows.length === 1 ? "" : "s"} and {invitationRows.length} pending invitation{invitationRows.length === 1 ? "" : "s"}.
        </p>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Pending invitations</h2>
        <div className="mt-4 grid gap-3">
          {invitationRows.map((invitation) => {
            const child = invitation.children;
            return (
              <div key={invitation.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="font-semibold text-slate-900">{invitation.email}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {child ? `${child.first_name} ${child.last_name}` : "Child record"} | {invitation.relationship ?? "Caregiver"} |{" "}
                      {invitation.status} | Expires {formatDate(invitation.expires_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {child ? (
                      <Link href={`/admin/children/${child.id}`} className="focus-ring rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        Open child
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
          <h2 className="text-lg font-bold text-slate-950">Caregiver accounts</h2>
          <span className="text-sm text-slate-500">{caregiverRows.length} shown</span>
        </div>
        {caregiverRows.map((caregiver) => (
          <article key={caregiver.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{caregiver.full_name ?? caregiver.email}</h2>
                <p className="text-sm text-slate-500">{caregiver.email}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{caregiver.is_active ? "Active" : "Inactive"}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(caregiver.child_caregivers ?? []).map((rel) => (
                <Link key={rel.id} href={`/admin/children/${rel.children?.id}`} className="rounded-2xl border border-slate-200 p-3 text-sm hover:bg-slate-50">
                  <p className="font-semibold text-slate-900">
                    {rel.children?.first_name} {rel.children?.last_name}
                  </p>
                  <p className="text-slate-600">
                    {rel.relationship ?? "Caregiver"} | {rel.is_authorized ? "Authorized" : "Not authorized"} | {rel.can_upload_documents ? "Upload" : "View only"}
                  </p>
                </Link>
              ))}
              {(caregiver.child_caregivers ?? []).length === 0 ? <p className="text-sm text-slate-600">No child access assigned yet.</p> : null}
            </div>
          </article>
        ))}
        {caregiverRows.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            {search ? "No caregiver accounts match this search." : "No caregiver accounts yet."}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function caregiverMatchesSearch(caregiver: CaregiverRow, searchKey: string) {
  if (!searchKey) return true;

  return matchesSearch(
    searchKey,
    caregiver.email,
    caregiver.full_name,
    caregiver.is_active ? "active" : "inactive",
    ...(caregiver.child_caregivers ?? []).flatMap((relationship) => [
      relationship.relationship,
      relationship.is_authorized ? "authorized" : "not authorized",
      relationship.can_upload_documents ? "upload" : "view only",
      relationship.children?.first_name,
      relationship.children?.last_name,
      relationship.children?.external_patient_id,
      childName(relationship.children),
    ])
  );
}

function invitationMatchesSearch(invitation: CaregiverInvitation, searchKey: string) {
  if (!searchKey) return true;

  return matchesSearch(
    searchKey,
    invitation.email,
    invitation.relationship,
    invitation.status,
    invitation.children?.first_name,
    invitation.children?.last_name,
    invitation.children?.external_patient_id,
    childName(invitation.children)
  );
}

function matchesSearch(searchKey: string, ...values: Array<string | null | undefined>) {
  return values.some((value) => value?.toLowerCase().includes(searchKey));
}

function childName(child?: Child | null) {
  if (!child) return null;
  return `${child.first_name} ${child.last_name}`;
}
