import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ChildIntakeDocument, StaffDocumentInboxRow } from "@/lib/types";

export async function ensureChildChecklist(childId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: templates, error: templateError } = await supabase
    .from("intake_document_templates")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (templateError) throw templateError;

  for (const template of templates ?? []) {
    const { error } = await supabase.from("child_intake_documents").upsert(
      {
        child_id: childId,
        template_id: template.id,
        status: "not_started",
      },
      { onConflict: "child_id,template_id", ignoreDuplicates: true }
    );
    if (error) throw error;
  }
}

export async function getChildDocuments(childId: string) {
  await ensureChildChecklist(childId);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("child_intake_documents")
    .select("*, intake_document_templates(*)")
    .eq("child_id", childId)
    .order("sort_order", {
      ascending: true,
      referencedTable: "intake_document_templates",
    });

  if (error) throw error;
  return data as ChildIntakeDocument[];
}

export async function getStaffDocumentInbox() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("child_intake_documents")
    .select("*, children(*), intake_document_templates(*), profiles:uploaded_by(*)")
    .neq("status", "not_started")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as StaffDocumentInboxRow[];
}
