import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile, UserRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const ROLE_OPTIONS: UserRole[] = ["caregiver", "staff", "admin"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const currentAdmin = await requireAdmin();
  const { q, status } = await searchParams;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("profiles").select("*").order("email", { ascending: true }).limit(250);
  if (error) throw error;

  const query = q?.trim().toLowerCase() ?? "";
  const profiles = ((data ?? []) as Profile[]).filter((profile) => {
    if (!query) return true;
    return profile.email.toLowerCase().includes(query) || (profile.full_name ?? "").toLowerCase().includes(query);
  });

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Admin</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">User access</h1>
        <p className="mt-2 text-slate-600">Invite staff, promote admins, and deactivate accounts without touching SQL.</p>
      </div>

      {status ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          {getStatusCopy(status)}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <form action="/api/admin/users/invite" method="post" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Invite staff</h2>
          <p className="mt-2 text-sm text-slate-600">Supabase will send an invitation email and this app will assign the selected role.</p>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input name="email" type="email" required className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">Full name</span>
            <input name="fullName" className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">Role</span>
            <select name="role" defaultValue="staff" className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="focus-ring mt-5 w-full rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
            Send invite
          </button>
        </form>

        <div className="space-y-4">
          <form className="flex gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <input name="q" defaultValue={q ?? ""} placeholder="Search by name or email" className="focus-ring flex-1 rounded-xl border border-slate-300 px-3 py-2" />
            <button className="focus-ring rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Search</button>
          </form>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[820px] table-fixed text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-[300px] px-4 py-3">User</th>
                  <th className="w-[180px] px-4 py-3">Role</th>
                  <th className="w-[170px] px-4 py-3">Status</th>
                  <th className="w-[110px] px-4 py-3">Created</th>
                  <th className="w-[100px] px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.map((profile) => (
                  <UserRow key={profile.id} profile={profile} currentAdminId={currentAdmin.id} />
                ))}
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No users found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function UserRow({ profile, currentAdminId }: { profile: Profile; currentAdminId: string }) {
  const isSelf = profile.id === currentAdminId;

  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <form id={`profile-${profile.id}`} action={`/api/admin/users/${profile.id}`} method="post" className="grid gap-2">
          <input type="hidden" name="returnTo" value="/admin/users" />
          <input name="fullName" defaultValue={profile.full_name ?? ""} placeholder="Full name" className="focus-ring rounded-xl border border-slate-300 px-3 py-2" />
          <p className="text-sm text-slate-500">{profile.email}</p>
        </form>
      </td>
      <td className="px-4 py-3">
        <select
          form={`profile-${profile.id}`}
          name="role"
          defaultValue={profile.role}
          disabled={isSelf}
          className="focus-ring w-full min-w-36 rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {capitalize(role)}
            </option>
          ))}
        </select>
        {isSelf ? <input form={`profile-${profile.id}`} type="hidden" name="role" value={profile.role} /> : null}
      </td>
      <td className="px-4 py-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            form={`profile-${profile.id}`}
            type="checkbox"
            name="isActive"
            defaultChecked={profile.is_active}
            disabled={isSelf}
            className="size-4 rounded border-slate-300 text-brand-600 disabled:bg-slate-100"
          />
          Active
        </label>
        {isSelf ? <input form={`profile-${profile.id}`} type="hidden" name="isActive" value="on" /> : null}
        {isSelf ? <p className="mt-2 text-xs text-slate-500">Your admin access is protected.</p> : null}
      </td>
      <td className="px-4 py-3 text-slate-600">{formatDate(profile.created_at)}</td>
      <td className="px-4 py-3">
        <button form={`profile-${profile.id}`} className="focus-ring rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">
          Save
        </button>
      </td>
    </tr>
  );
}

function getStatusCopy(status: string) {
  switch (status) {
    case "invited":
      return "Invitation sent and account role saved.";
    case "existing-updated":
      return "Existing account role and status updated.";
    case "updated":
      return "User access updated.";
    case "self-protected":
      return "Your own admin access cannot be deactivated or demoted here.";
    default:
      return "User access saved.";
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
