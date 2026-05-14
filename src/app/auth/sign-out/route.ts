import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await writeAuditLog({
      actorId: user.id,
      entityType: "auth_session",
      entityId: user.id,
      action: "user_signed_out",
      request,
    });
  }

  await supabase.auth.signOut();
  redirect("/login");
}
