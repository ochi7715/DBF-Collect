import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { safeRedirect } from "@/lib/utils";

const updateUserSchema = z.object({
  fullName: z.string().trim().max(160).optional(),
  role: z.enum(["caregiver", "staff", "admin"]),
  isActive: z.boolean(),
  returnTo: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const actor = await requireAdmin();
  const formData = await request.formData();
  const parsed = updateUserSchema.parse({
    fullName: formData.get("fullName")?.toString() ?? "",
    role: formData.get("role")?.toString() ?? "caregiver",
    isActive: formData.has("isActive"),
    returnTo: formData.get("returnTo")?.toString() ?? "/admin/users",
  });
  const returnTo = safeRedirect(parsed.returnTo, "/admin/users");

  if (profileId === actor.id && (parsed.role !== "admin" || !parsed.isActive)) {
    redirect(`${returnTo}?status=self-protected`);
  }

  const admin = createSupabaseAdminClient();
  const { data: before, error: beforeError } = await admin
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", profileId)
    .single();

  if (beforeError || !before) throw beforeError ?? new Error("Profile not found");

  const { error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.fullName || null,
      role: parsed.role,
      is_active: parsed.isActive,
    })
    .eq("id", profileId);

  if (error) throw error;

  await writeAuditLog({
    actorId: actor.id,
    entityType: "profile",
    entityId: profileId,
    action: "user_access_updated",
    details: {
      email: before.email,
      before: {
        fullName: before.full_name,
        role: before.role,
        isActive: before.is_active,
      },
      after: {
        fullName: parsed.fullName || null,
        role: parsed.role,
        isActive: parsed.isActive,
      },
    },
    request,
  });

  redirect(`${returnTo}?status=updated`);
}
