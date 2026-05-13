import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { buildInvitationUrl, getAppBaseUrl } from "@/lib/invitations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CaregiverInvitation } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default async function CaregiversPage() {
  await requireStaff();
  const supabase = await createSupabaseServerClient();
  const [{ data: caregivers, error }, { data: invitations }, baseUrl] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, child_caregivers(*, children(*))")
      .eq("role", "caregiver")
      .order("email", { ascending: true })
      .limit(100),
    supabase
      .from("caregiver_invitations")
      .select("*, children(*)")
      .in("status", ["pending", "expired"])
      .order("created_at", { ascending: false })
      .limit(100),
    getAppBaseUrl(),
  ]);

  if (error) throw error;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Back office</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Caregivers</h1>
        <p className="mt-2 text-slate-600">View caregiver accounts, child access relationships, and pending invitations.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Pending invitations</h2>
        <div className="mt-4 grid gap-3">
          {((invitations ?? []) as CaregiverInvitation[]).map((invitation) => {
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
                        <input type="hidden" name="returnTo" value="/admin/caregivers" />
                        <button className="focus-ring rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Revoke</button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <input readOnly value={buildInvitationUrl(baseUrl, invitation.token)} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
              </div>
            );
          })}
          {(invitations ?? []).length === 0 ? <p className="text-sm text-slate-600">No pending invitations.</p> : null}
        </div>
      </div>

      <div className="grid gap-4">
        {(caregivers ?? []).map((caregiver: any) => (
          <article key={caregiver.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{caregiver.full_name ?? caregiver.email}</h2>
                <p className="text-sm text-slate-500">{caregiver.email}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{caregiver.is_active ? "Active" : "Inactive"}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(caregiver.child_caregivers ?? []).map((rel: any) => (
                <Link key={rel.id} href={`/admin/children/${rel.children?.id}`} className="rounded-2xl border border-slate-200 p-3 text-sm hover:bg-slate-50">
                  <p className="font-semibold text-slate-900">
                    {rel.children?.first_name} {rel.children?.last_name}
                  </p>
                  <p className="text-slate-600">
                    {rel.relationship ?? "Caregiver"} | {rel.is_authorized ? "Authorized" : "Not authorized"} | {rel.can_upload_documents ? "Upload" : "View only"}
                  </p>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
