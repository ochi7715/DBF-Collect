import { AccountMenu } from "@/components/account-menu";
import { AppNavigation } from "@/components/app-navigation";
import { BrandLockup } from "@/components/brand-lockup";
import { MobileNavigation } from "@/components/mobile-navigation";
import type { Profile } from "@/lib/types";
import { isStaffRole } from "@/lib/auth";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const staff = isStaffRole(profile.role);
  const admin = profile.role === "admin";

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <BrandLockup href="/portal" compact />
          <AccountMenu
            avatarUrl={profile.avatar_url}
            email={profile.email}
            initials={getInitials(profile)}
            name={profile.full_name ?? profile.email}
            role={profile.role}
          />
        </div>
      </header>

      <MobileNavigation admin={admin} staff={staff} />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-4 sm:py-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-7rem)]">
          <AppNavigation admin={admin} staff={staff} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

function getInitials(profile: Profile) {
  const source = profile.full_name?.trim() || profile.email;
  const parts = source.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
  return (initials || "D").toUpperCase();
}
