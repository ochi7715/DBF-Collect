import { redirect } from "next/navigation";
import { mergeAuthUserMetadata, updateProfileAvatarFields } from "@/lib/account";
import { requireProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const AVATAR_BUCKET = "profile-avatars";

export async function POST(request: Request) {
  const profile = await requireProfile();
  const admin = createSupabaseAdminClient();

  if (profile.avatar_path) {
    const { error: removeError } = await admin.storage.from(AVATAR_BUCKET).remove([profile.avatar_path]);
    if (removeError) console.error("Profile avatar removal failed", removeError);
  }

  await updateProfileAvatarFields(admin, profile.id, {
    avatarPath: null,
    avatarUrl: null,
  });
  await mergeAuthUserMetadata(admin, profile.id, {
    avatar_path: null,
    avatar_url: null,
  });

  await writeAuditLog({
    actorId: profile.id,
    entityType: "profile",
    entityId: profile.id,
    action: "profile_avatar_removed",
    request,
  });

  redirect("/account?status=avatar-removed");
}
