import { redirect } from "next/navigation";
import { z } from "zod";
import { mergeAuthUserMetadata } from "@/lib/account";
import { requireProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const profileSchema = z.object({
  fullName: z.string().trim().max(160),
});

export async function POST(request: Request) {
  const profile = await requireProfile();
  const formData = await request.formData();
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName")?.toString() ?? "",
  });

  if (!parsed.success) redirect("/account?error=profile-invalid");

  const fullName = parsed.data.fullName || null;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").update({ full_name: fullName }).eq("id", profile.id);

  if (error) throw error;

  await mergeAuthUserMetadata(admin, profile.id, { full_name: fullName });

  await writeAuditLog({
    actorId: profile.id,
    entityType: "profile",
    entityId: profile.id,
    action: "profile_updated",
    details: {
      before: { fullName: profile.full_name },
      after: { fullName },
    },
    request,
  });

  redirect("/account?status=profile-updated");
}
