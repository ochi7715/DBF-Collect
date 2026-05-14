import Link from "next/link";
import { Activity, ClipboardList, FileText, Search, UserCog, Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminHomePage() {
  const profile = await requireStaff();
  const supabase = await createSupabaseServerClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [
    { count: childCount },
    { count: uploadedCount },
    { count: caregiverCount },
    { count: staffCount },
    { count: templateCount },
    { count: recentAuditCount },
  ] = await Promise.all([
    supabase.from("children").select("*", { count: "exact", head: true }),
    supabase.from("child_intake_documents").select("*", { count: "exact", head: true }).neq("status", "not_started"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "caregiver"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).in("role", ["staff", "admin"]),
    supabase.from("intake_document_templates").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("audit_logs").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
  ]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Back office</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Staff dashboard</h1>
        <p className="mt-2 text-slate-600">Review child records, caregiver access, and submitted intake documents.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Child records" value={childCount ?? 0} />
        <Metric label="Submitted documents" value={uploadedCount ?? 0} />
        <Metric label="Caregiver accounts" value={caregiverCount ?? 0} />
        <Metric label="Staff accounts" value={staffCount ?? 0} />
        <Metric label="Active checklist items" value={templateCount ?? 0} />
        <Metric label="Audit events this week" value={recentAuditCount ?? 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminCard href="/admin/documents" icon={<FileText size={24} />} title="Document inbox" body="Review uploads, approve or reject files, and send signature requests." />
        <AdminCard href="/admin/children" icon={<Search size={24} />} title="Child records" body="Search and manage child intake records." />
        <AdminCard href="/admin/caregivers" icon={<Users size={24} />} title="Caregivers" body="View caregiver accounts and authorized child relationships." />
        <AdminCard href="/admin/templates" icon={<ClipboardList size={24} />} title="Checklist setup" body="Configure intake checklist items and Dropbox Sign template IDs." />
        <AdminCard href="/admin/audit" icon={<Activity size={24} />} title="Activity log" body="Review sensitive activity across records, uploads, invitations, and signatures." />
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
      <div className="rounded-2xl bg-brand-50 p-3 text-brand-600 w-fit">{icon}</div>
      <h2 className="mt-4 text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </Link>
  );
}
