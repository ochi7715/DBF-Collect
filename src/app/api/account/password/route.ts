import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const passwordSchema = z
  .object({
    confirmPassword: z.string().min(8),
    password: z.string().min(8),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const profile = await requireProfile();
  const formData = await request.formData();
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (password.length < 8 || confirmPassword.length < 8) redirect("/account?error=password-short#security");

  const parsed = passwordSchema.safeParse({ confirmPassword, password });
  if (!parsed.success) redirect("/account?error=password-mismatch#security");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) throw error;

  await writeAuditLog({
    actorId: profile.id,
    entityType: "profile",
    entityId: profile.id,
    action: "password_changed",
    request,
  });

  redirect("/account?status=password-updated#security");
}
