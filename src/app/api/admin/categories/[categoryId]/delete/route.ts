import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;
  const actor = await requireStaff();
  const admin = createSupabaseAdminClient();

  const { data: category, error: categoryError } = await admin
    .from("race_categories")
    .select("*")
    .eq("id", categoryId)
    .single();

  if (categoryError || !category) throw categoryError ?? new Error("Race category not found");

  const { count, error: countError } = await admin
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("race_category_id", categoryId);

  if (countError) throw countError;

  const hasTeams = (count ?? 0) > 0;
  let action = "race_category_deleted";
  let status = "deleted";

  if (hasTeams) {
    const { error } = await admin.from("race_categories").update({ is_active: false }).eq("id", categoryId);
    if (error) throw error;
    action = "race_category_deactivated";
    status = "deactivated";
  } else {
    const { error } = await admin.from("race_categories").delete().eq("id", categoryId);
    if (error) throw error;
  }

  await writeAuditLog({
    actorId: actor.id,
    entityType: "race_category",
    entityId: categoryId,
    action,
    details: {
      name: category.name,
      teamCount: count ?? 0,
    },
    request,
  });

  redirect(`/admin/categories?status=${status}`);
}
