import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { ensureTeamDocumentRequirementsForAllTeams } from "@/lib/documents";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const categorySchema = z.object({
  name: z.string().trim().min(1).max(160),
  ruleSet: z.enum(["regular", "usdboc", "invitational"]),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

export async function POST(request: Request, { params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;
  const actor = await requireStaff();
  const formData = await request.formData();
  const parsed = categorySchema.parse({
    name: formData.get("name"),
    ruleSet: formData.get("ruleSet"),
    sortOrder: formData.get("sortOrder")?.toString() ?? "10",
    isActive: formData.has("isActive"),
  });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("race_categories")
    .update({
      name: parsed.name,
      rule_set: parsed.ruleSet,
      sort_order: parsed.sortOrder,
      is_active: parsed.isActive,
    })
    .eq("id", categoryId);

  if (error) throw error;

  await ensureTeamDocumentRequirementsForAllTeams();

  await writeAuditLog({
    actorId: actor.id,
    entityType: "race_category",
    entityId: categoryId,
    action: "race_category_updated",
    details: parsed,
    request,
  });

  redirect("/admin/categories?status=updated");
}
