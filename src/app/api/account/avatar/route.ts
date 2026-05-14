import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { mergeAuthUserMetadata, updateProfileAvatarFields } from "@/lib/account";
import { requireProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const AVATAR_BUCKET = "profile-avatars";
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function POST(request: Request) {
  const profile = await requireProfile();
  const formData = await request.formData();
  const file = formData.get("avatar");

  if (!(file instanceof File)) redirect("/account?error=avatar-required");
  if (file.size > MAX_FILE_BYTES) redirect("/account?error=avatar-too-large");
  if (!ALLOWED_TYPES.has(file.type)) redirect("/account?error=avatar-type");

  const admin = createSupabaseAdminClient();
  const bucketReady = await ensureAvatarBucket(admin);
  if (!bucketReady) redirect("/account?error=avatar-storage");

  const extension = ALLOWED_TYPES.get(file.type) ?? "bin";
  const path = `${profile.id}/${randomUUID()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage.from(AVATAR_BUCKET).upload(path, Buffer.from(arrayBuffer), {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  await updateProfileAvatarFields(admin, profile.id, {
    avatarPath: path,
    avatarUrl: publicUrl,
  });
  await mergeAuthUserMetadata(admin, profile.id, {
    avatar_path: path,
    avatar_url: publicUrl,
  });

  if (profile.avatar_path && profile.avatar_path !== path) {
    const { error: removeError } = await admin.storage.from(AVATAR_BUCKET).remove([profile.avatar_path]);
    if (removeError) console.error("Previous profile avatar removal failed", removeError);
  }

  await writeAuditLog({
    actorId: profile.id,
    entityType: "profile",
    entityId: profile.id,
    action: "profile_avatar_updated",
    details: { fileSize: file.size, mimeType: file.type },
    request,
  });

  redirect("/account?status=avatar-updated");
}

async function ensureAvatarBucket(admin: SupabaseAdminClient) {
  const options = {
    allowedMimeTypes: Array.from(ALLOWED_TYPES.keys()),
    fileSizeLimit: MAX_FILE_BYTES,
    public: true,
  };
  const { error: createError } = await admin.storage.createBucket(AVATAR_BUCKET, options);

  if (createError && !isAlreadyExistsError(createError.message)) {
    console.error("Profile avatar bucket create failed", createError);
    return false;
  }

  const { error: updateError } = await admin.storage.updateBucket(AVATAR_BUCKET, options);
  if (updateError) {
    console.error("Profile avatar bucket update failed", updateError);
    return false;
  }

  return true;
}

function isAlreadyExistsError(message: string) {
  return /already exists|duplicate/i.test(message);
}
