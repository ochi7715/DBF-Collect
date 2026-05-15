import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const categorySchema = z.object({
  name: z.string().trim().min(1).max(160),
  ruleSet: z.enum(["regular", "usdboc", "invitational"]),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

export async function POST(request: Request) {
  const actor = await requireStaff();
  const formData = await request.formData();
  const parsed = categorySchema.parse({
    name: formData.get("name"),
    ruleSet: formData.get("ruleSet"),
    sortOrder: formData.get("sortOrder")?.toString() ?? "10",
    isActive: formData.has("isActive"),
  });

  const admin = createSupabaseAdminClient();
  const { data: category, error } = await admin
    .from("race_categories")
    .insert({
      name: parsed.name,
      rule_set: parsed.ruleSet,
      sort_order: parsed.sortOrder,
      is_active: parsed.isActive,
    })
    .select("id")
    .single();

  if (error) throw error;

  await writeAuditLog({
    actorId: actor.id,
    entityType: "race_category",
    entityId: category.id,
    action: "race_category_created",
    details: parsed,
    request,
  });

  redirect("/admin/categories?status=created");
}
