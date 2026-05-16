import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getAuditLogs, type AuditLog } from "@/lib/audit";

const ACTION_LABELS: Record<string, string> = {
  auth_callback_completed: "Email auth completed",
  document_form_template_uploaded: "Blank form file uploaded",
  document_form_updated: "Document form updated",
  document_file_access_denied: "Document file access denied",
  document_file_opened: "Document file opened",
  document_reviewed: "Document reviewed",
  document_uploaded: "Document uploaded",
  dropbox_signature_sent: "Dropbox Sign request sent",
  dropbox_webhook_received: "Dropbox Sign webhook received",
  race_category_created: "Race category created",
  race_category_deactivated: "Race category deactivated",
  race_category_deleted: "Race category deleted",
  race_category_updated: "Race category updated",
  team_contact_access_updated: "Team contact access updated",
  team_contact_invited: "Team contact invited",
  team_created: "Team created",
  team_invitation_accepted: "Invitation accepted",
  team_invitation_expired: "Invitation expired",
  team_invitation_revoked: "Invitation revoked",
  team_member_created: "Team member created",
  team_updated: "Team updated",
  user_access_updated: "User access updated",
  user_invited: "User invited",
  user_signed_out: "User signed out",
};

const ENTITY_LABELS: Record<string, string> = {
  auth_session: "Auth session",
  document_form: "Document form",
  dragon_boat_document: "Race document",
  profile: "User profile",
  race_category: "Race category",
  team: "Team",
  team_contact: "Team contact",
  team_invitation: "Team invitation",
  team_member: "Team member",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string }>;
}) {
  await requireStaff();
  const { action, entityType } = await searchParams;
  const logs = await getAuditLogs({ action, entityType, limit: 150 });

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Back office</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Activity log</h1>
        <p className="mt-2 text-slate-600">
          Review sensitive activity across teams, contact access, uploaded forms, invitations, and signatures.
        </p>
      </div>

      <form className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto_auto]">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Action</span>
          <select name="action" defaultValue={action ?? ""} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
            <option value="">All actions</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Record type</span>
          <select name="entityType" defaultValue={entityType ?? ""} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
            <option value="">All record types</option>
            {Object.entries(ENTITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button className="focus-ring w-full rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Filter</button>
        </div>
        <div className="flex items-end">
          <Link href="/admin/audit" className="focus-ring w-full rounded-xl border border-slate-300 px-4 py-2 text-center font-semibold text-slate-700 hover:bg-slate-50">
            Clear
          </Link>
        </div>
      </form>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <AuditRow key={log.id} log={log} />
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No audit events match those filters.
                </td>
              </tr>
            ) : null}
          </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function AuditRow({ log }: { log: AuditLog }) {
  const team = log.teams;
  const actor = log.profiles;

  return (
    <tr className="align-top">
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(log.created_at)}</td>
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-900">{ACTION_LABELS[log.action] ?? humanize(log.action)}</p>
        <p className="mt-1 text-xs text-slate-500">{ENTITY_LABELS[log.entity_type] ?? humanize(log.entity_type)}</p>
        {log.entity_type === "dragon_boat_document" && log.entity_id ? (
          <Link href={`/admin/documents/${log.entity_id}`} className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
            Open document
          </Link>
        ) : null}
      </td>
      <td className="px-4 py-3 text-slate-700">
        <p className="font-medium text-slate-900">{actor?.full_name ?? actor?.email ?? "System"}</p>
        {actor?.email ? <p className="mt-1 text-xs text-slate-500">{actor.email}</p> : null}
      </td>
      <td className="px-4 py-3 text-slate-700">
        {team ? (
          <>
            <Link href={`/admin/teams/${team.id}`} className="font-semibold text-brand-600 hover:text-brand-700">
              {team.name}
            </Link>
            <p className="mt-1 text-xs text-slate-500">{team.status}</p>
          </>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-slate-600">
        <p>{log.request_method ?? "-"}</p>
        <p className="mt-1 max-w-48 truncate text-xs" title={log.request_path ?? undefined}>{log.request_path ?? "-"}</p>
        <p className="mt-1 text-xs text-slate-400">{log.ip_address ?? "No IP"}</p>
        <p className="mt-1 max-w-48 truncate text-xs text-slate-400" title={log.user_agent ?? undefined}>{log.user_agent ?? "No user agent"}</p>
      </td>
      <td className="max-w-sm px-4 py-3">
        <DetailList details={log.details} />
      </td>
    </tr>
  );
}

function DetailList({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details ?? {});
  if (entries.length === 0) return <span className="text-slate-400">-</span>;

  return (
    <dl className="grid gap-1">
      {entries.slice(0, 6).map(([key, value]) => (
        <div key={key} className="grid gap-1 rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{humanize(key)}</dt>
          <dd className="break-words text-xs text-slate-700">{formatDetail(value)}</dd>
        </div>
      ))}
      {entries.length > 6 ? <p className="text-xs text-slate-500">+{entries.length - 6} more fields</p> : null}
    </dl>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDetail(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function humanize(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
