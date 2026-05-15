import Link from "next/link";
import { Activity, ClipboardList, FileText, ListChecks, Trophy, UserCog, Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminHomePage() {
  const profile = await requireStaff();
  const supabase = await createSupabaseServerClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [
    { count: teamCount },
    { count: memberCount },
    { count: uploadedCount },
    { count: contactCount },
    { count: categoryCount },
    { count: recentAuditCount },
  ] = await Promise.all([
    supabase.from("teams").select("*", { count: "exact", head: true }),
    supabase.from("team_members").select("*", { count: "exact", head: true }),
    supabase.from("dragon_boat_documents").select("*", { count: "exact", head: true }).neq("status", "not_started"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "team_contact"),
    supabase.from("race_categories").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("audit_logs").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
  ]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Back office</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Race document dashboard</h1>
        <p className="mt-2 text-slate-600">Track team access, race categories, required forms, roster waivers, and document review.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Teams" value={teamCount ?? 0} />
        <Metric label="Team members" value={memberCount ?? 0} />
        <Metric label="Submitted documents" value={uploadedCount ?? 0} />
        <Metric label="Team contacts" value={contactCount ?? 0} />
        <Metric label="Active categories" value={categoryCount ?? 0} />
        <Metric label="Audit events this week" value={recentAuditCount ?? 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminCard href="/admin/documents" icon={<FileText size={24} />} title="Document inbox" body="Review uploaded Form Cs and team-level registration forms." />
        <AdminCard href="/admin/teams" icon={<Trophy size={24} />} title="Teams" body="Create teams, assign categories, and manage team captain access." />
        <AdminCard href="/admin/team-contacts" icon={<Users size={24} />} title="Team contacts" body="View captains, managers, co-captains, and pending invitations." />
        <AdminCard href="/admin/categories" icon={<ListChecks size={24} />} title="Race categories" body="Edit Regular, USDBOC, and invitational race category rules." />
        <AdminCard href="/admin/templates" icon={<ClipboardList size={24} />} title="Form setup" body="Maintain form labels, blank files, upload rules, and Dropbox Sign template IDs." />
        <AdminCard href="/admin/audit" icon={<Activity size={24} />} title="Activity log" body="Review sensitive activity across teams, uploads, invitations, and signatures." />
        {profile.role === "admin" ? (
          <AdminCard href="/admin/users" icon={<UserCog size={24} />} title="User access" body="Invite staff and manage account roles or active status." />
        ) : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function AdminCard({ href, icon, title, body }: { href: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link href={href} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="w-fit rounded-2xl bg-brand-50 p-3 text-brand-600">{icon}</div>
      <h2 className="mt-4 text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </Link>
  );
}
