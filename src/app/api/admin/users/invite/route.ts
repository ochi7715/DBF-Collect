import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getAppBaseUrl, normalizeEmail } from "@/lib/invitations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const inviteUserSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().max(160).optional(),
  role: z.enum(["staff", "admin"]),
});

export async function POST(request: Request) {
  const actor = await requireAdmin();
  const formData = await request.formData();
  const parsed = inviteUserSchema.parse({
    email: formData.get("email"),
    fullName: formData.get("fullName")?.toString() ?? "",
    role: formData.get("role")?.toString() ?? "staff",
  });

  const admin = createSupabaseAdminClient();
  const email = normalizeEmail(parsed.email);
  const baseUrl = await getAppBaseUrl();
  const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(parsed.role === "admin" ? "/admin/users" : "/admin")}`;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: parsed.fullName || null, invited_role: parsed.role },
  });

  let targetId = data.user?.id ?? null;
  let status = "invited";

  if (error || !targetId) {
    const existingUser = await findAuthUserByEmail(admin, email);
    targetId = existingUser?.id ?? null;

    if (!targetId) {
      const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
      targetId = existingProfile?.id ?? null;
    }

    if (!targetId) throw error ?? new Error("Unable to invite or find user");
    status = "existing-updated";
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      {
        id: targetId,
        email,
        full_name: parsed.fullName || null,
        role: parsed.role,
        is_active: true,
      },
      { onConflict: "id" }
    );

  if (profileError) throw profileError;

  await writeAuditLog({
    actorId: actor.id,
    entityType: "profile",
    entityId: targetId,
    action: "user_invited",
    details: { email, role: parsed.role, delivery: status },
    request,
  });

  redirect(`/admin/users?status=${status}`);
}

async function findAuthUserByEmail(admin: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const user = data.users.find((item) => normalizeEmail(item.email ?? "") === email);
    if (user) return user;
    if (data.users.length < 100) return null;
  }

  return null;
}
