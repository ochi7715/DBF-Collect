import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email ?? "",
        full_name: user.user_metadata?.full_name ?? null,
        role: "caregiver",
      })
      .select("*")
      .single();
    if (insertError) throw insertError;
    return created as Profile;
  }

  return data as Profile;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/login?error=inactive");
  return profile;
}

export async function requireRole(allowed: UserRole[]) {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) redirect("/portal");
  return profile;
}

export function isStaffRole(role: UserRole) {
  return role === "staff" || role === "admin";
}

export async function requireStaff() {
  return requireRole(["staff", "admin"]);
}

export async function requireAdmin() {
  return requireRole(["admin"]);
}
