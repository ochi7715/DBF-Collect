import Link from "next/link";
import { Activity, CalendarDays, ClipboardList, FileText, Home, ListChecks, ShieldCheck, Trophy, UserCog, Users } from "lucide-react";

export function AppNavigation({
  admin,
  onNavigate,
  staff,
}: {
  admin: boolean;
  onNavigate?: () => void;
  staff: boolean;
}) {
  return (
    <nav className="space-y-1">
      <NavLink href="/portal" icon={<Home size={18} />} label="My teams" onNavigate={onNavigate} />
      <NavLink href="/portal/forms" icon={<FileText size={18} />} label="Fill forms" onNavigate={onNavigate} />
      <NavLink href="/portal/practice" icon={<CalendarDays size={18} />} label="Practice schedule" onNavigate={onNavigate} />
      {staff ? (
        <>
          <div className="px-3 pb-1 pt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Admin</div>
          <NavLink href="/admin" icon={<ShieldCheck size={18} />} label="Back office" onNavigate={onNavigate} />
          <NavLink href="/admin/documents" icon={<FileText size={18} />} label="Document inbox" onNavigate={onNavigate} />
          <NavLink href="/admin/teams" icon={<Trophy size={18} />} label="Teams" onNavigate={onNavigate} />
          <NavLink href="/admin/team-contacts" icon={<Users size={18} />} label="Team contacts" onNavigate={onNavigate} />
          <NavLink href="/admin/categories" icon={<ListChecks size={18} />} label="Race categories" onNavigate={onNavigate} />
          <NavLink href="/admin/practice" icon={<CalendarDays size={18} />} label="Practice schedule" onNavigate={onNavigate} />
          <NavLink href="/admin/templates" icon={<ClipboardList size={18} />} label="Form setup" onNavigate={onNavigate} />
          <NavLink href="/admin/audit" icon={<Activity size={18} />} label="Activity log" onNavigate={onNavigate} />
          {admin ? <NavLink href="/admin/users" icon={<UserCog size={18} />} label="User access" onNavigate={onNavigate} /> : null}
        </>
      ) : null}
    </nav>
  );
}

function NavLink({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
    >
      {icon}
      {label}
    </Link>
  );
}
