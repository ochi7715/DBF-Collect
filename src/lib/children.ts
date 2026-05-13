import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ChildWithCaregiverAccess } from "@/lib/types";

export async function getAccessibleChildren(userId: string, role: string) {
  const supabase = await createSupabaseServerClient();

  if (role === "staff" || role === "admin") {
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .order("last_name", { ascending: true });
    if (error) throw error;
    return data as ChildWithCaregiverAccess[];
  }

  const { data, error } = await supabase
    .from("child_caregivers")
    .select(
      "relationship, can_view_documents, can_upload_documents, children(id, first_name, last_name, date_of_birth, external_patient_id, status, created_at, updated_at)"
    )
    .eq("caregiver_id", userId)
    .eq("is_authorized", true)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .map((row: any) => ({
      ...row.children,
      relationship: row.relationship,
      can_view_documents: row.can_view_documents,
      can_upload_documents: row.can_upload_documents,
    }))
    .filter(Boolean) as ChildWithCaregiverAccess[];
}

export async function getChildById(childId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("children").select("*").eq("id", childId).single();
  if (error) throw error;
  return data;
}

export async function canCurrentUserAccessChild(childId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("can_access_child", { target_child_id: childId });
  if (error) throw error;
  return Boolean(data);
}

export async function canCurrentUserUploadChildDocuments(childId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("can_upload_child_documents", { target_child_id: childId });
  if (error) throw error;
  return Boolean(data);
}
