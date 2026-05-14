import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isMissingSupabasePublicConfigError } from "@/lib/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    if (isMissingSupabasePublicConfigError(error)) redirect("/setup-required");
    throw error;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Profile lookup failed", error);
    redirect("/auth/status?code=profile_lookup_failed");
  }

  if (!data) {
    return createMissingProfile(user);
  }

  return data as Profile;
}

async function createMissingProfile(user: User): Promise<Profile> {
  const profile = {
    id: user.id,
    email: user.email ?? "",
    full_name: user.user_metadata?.full_name ?? null,
    role: "caregiver" as UserRole,
    is_active: true,
  };

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .upsert(profile, { onConflict: "id" })
      .select("*")
      .single();

    if (!error && data) return data as Profile;

    console.error("Profile create failed", error);
  } catch (error) {
    console.error("Profile create failed", error);
  }

  redirect("/auth/status?code=profile_create_failed");
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
