import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function mergeAuthUserMetadata(
  admin: SupabaseAdminClient,
  userId: string,
  metadata: Record<string, string | null>,
) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;

  const currentMetadata = data.user?.user_metadata ?? {};
  const nextMetadata = { ...currentMetadata };

  for (const [key, value] of Object.entries(metadata)) {
    if (value === null) {
      delete nextMetadata[key];
    } else {
      nextMetadata[key] = value;
    }
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: nextMetadata,
  });

  if (updateError) throw updateError;
}

export async function updateProfileAvatarFields(
  admin: SupabaseAdminClient,
  userId: string,
  avatar: { avatarPath: string | null; avatarUrl: string | null },
) {
  const { error } = await admin
    .from("profiles")
    .update({
      avatar_path: avatar.avatarPath,
      avatar_url: avatar.avatarUrl,
    })
    .eq("id", userId);

  if (error) {
    console.error("Profile avatar fields update failed", error);
  }
}
