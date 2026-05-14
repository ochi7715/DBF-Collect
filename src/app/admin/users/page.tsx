import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile, UserRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const ROLE_OPTIONS: UserRole[] = ["caregiver", "staff", "admin"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; q?: string; status?: string }>;
}) {
  const currentAdmin = await requireAdmin();
  const { invite, q, status } = await searchParams;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("profiles").select("*").order("email", { ascending: true }).limit(250);
  if (error) throw error;

  const query = q?.trim().toLowerCase() ?? "";
  const normalizedQuery = q?.trim() ?? "";
  const profiles = ((data ?? []) as Profile[]).filter((profile) => {
    if (!query) return true;
    return profile.email.toLowerCase().includes(query) || (profile.full_name ?? "").toLowerCase().includes(query);
  });
  const usersHref = buildUsersHref({ q: normalizedQuery });

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

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <form className="flex flex-1 flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Search users</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  defaultValue={normalizedQuery}
                  placeholder="Search by name or email"
                  className="focus-ring w-full rounded-xl border border-slate-300 px-3 py-2 pl-9"
                />
              </label>
              <button className="focus-ring rounded-xl bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-700">Search</button>
            </form>
            <Link
              href={buildUsersHref({ invite: "1", q: normalizedQuery })}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-2 font-semibold text-brand-700 hover:bg-brand-100"
            >
              <Plus className="size-4" />
              Invite staff
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          {profiles.map((profile) => (
            <UserCard key={profile.id} profile={profile} currentAdminId={currentAdmin.id} returnTo={usersHref} />
          ))}
          {profiles.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">No users found.</div>
          ) : null}
        </div>
      </div>

      {invite === "1" ? <InviteStaffModal closeHref={usersHref} /> : null}
    </section>
  );
}

function InviteStaffModal({ closeHref }: { closeHref: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8 backdrop-blur-sm sm:items-center">
      <div
        aria-labelledby="invite-staff-title"
        aria-modal="true"
        role="dialog"
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Admin invite</p>
            <h2 id="invite-staff-title" className="mt-1 text-2xl font-bold text-slate-950">
              Invite staff
            </h2>
            <p className="mt-2 text-sm text-slate-600">Supabase will send an invitation email and this app will assign the selected role.</p>
          </div>
          <Link
            href={closeHref}
            aria-label="Close invite staff form"
            className="focus-ring inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="size-4" />
          </Link>
        </div>

        <form action="/api/admin/users/invite" method="post" className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input name="email" type="email" required className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Full name</span>
            <input name="fullName" className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Role</span>
            <select name="role" defaultValue="staff" className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="focus-ring w-full rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">Send invite</button>
        </form>
      </div>
    </div>
  );
}

function UserCard({ profile, currentAdminId, returnTo }: { profile: Profile; currentAdminId: string; returnTo: string }) {
  const isSelf = profile.id === currentAdminId;

  return (
    <form action={`/api/admin/users/${profile.id}`} method="post" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_160px_160px_auto] lg:items-end">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">User</span>
          <input name="fullName" defaultValue={profile.full_name ?? ""} placeholder="Full name" className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          <p className="text-sm text-slate-500">{profile.email}</p>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Role</span>
          <select
            name="role"
            defaultValue={profile.role}
            disabled={isSelf}
            className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {capitalize(role)}
              </option>
            ))}
          </select>
          {isSelf ? <input type="hidden" name="role" value={profile.role} /> : null}
        </label>
        <div>
          <span className="text-sm font-medium text-slate-700">Status</span>
          <label className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={profile.is_active}
              disabled={isSelf}
              className="size-4 rounded border-slate-300 text-brand-600 disabled:bg-slate-100"
            />
            Active
          </label>
          {isSelf ? <input type="hidden" name="isActive" value="on" /> : null}
          {isSelf ? <p className="mt-2 text-xs text-slate-500">Protected admin</p> : null}
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <p className="text-sm text-slate-500">Created {formatDate(profile.created_at)}</p>
          <button className="focus-ring w-full rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 lg:w-auto">
            Save
          </button>
        </div>
      </div>
    </form>
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

function buildUsersHref({ invite, q }: { invite?: string; q?: string }) {
  const params = new URLSearchParams();
  const query = q?.trim();

  if (query) params.set("q", query);
  if (invite) params.set("invite", invite);

  const search = params.toString();
  return search ? `/admin/users?${search}` : "/admin/users";
}
