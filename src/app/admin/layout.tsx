import { AppShell } from "@/components/app-shell";
import { requireStaff } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();
  return <AppShell profile={profile}>{children}</AppShell>;
}
