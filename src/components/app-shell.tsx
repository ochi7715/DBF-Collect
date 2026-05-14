import Link from "next/link";
import { Activity, ClipboardList, FileText, Home, Search, ShieldCheck, UserCog, Users } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import type { Profile } from "@/lib/types";
import { isStaffRole } from "@/lib/auth";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const staff = isStaffRole(profile.role);
  const admin = profile.role === "admin";

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/portal" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-600 font-bold text-white">A</div>
            <div>
              <p className="font-bold leading-tight text-slate-950">ABS Connect</p>
              <p className="text-xs text-slate-500">Phase 1 Intake Portal</p>
            </div>
          </Link>
          <AccountMenu
            avatarUrl={profile.avatar_url}
            email={profile.email}
            initials={getInitials(profile)}
            name={profile.full_name ?? profile.email}
            role={profile.role}
          />
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
          <nav className="space-y-1">
            <NavLink href="/portal" icon={<Home size={18} />} label="My children" />
            {staff ? (
              <>
                <div className="px-3 pb-1 pt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Staff</div>
                <NavLink href="/admin" icon={<ShieldCheck size={18} />} label="Back office" />
                <NavLink href="/admin/documents" icon={<FileText size={18} />} label="Document inbox" />
                <NavLink href="/admin/children" icon={<Search size={18} />} label="Child records" />
                <NavLink href="/admin/caregivers" icon={<Users size={18} />} label="Caregivers" />
                <NavLink href="/admin/templates" icon={<ClipboardList size={18} />} label="Checklist setup" />
                <NavLink href="/admin/audit" icon={<Activity size={18} />} label="Activity log" />
                {admin ? <NavLink href="/admin/users" icon={<UserCog size={18} />} label="User access" /> : null}
              </>
            ) : null}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

function getInitials(profile: Profile) {
  const source = profile.full_name?.trim() || profile.email;
  const parts = source.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
  return (initials || "A").toUpperCase();
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
      {icon}
      {label}
    </Link>
  );
}
