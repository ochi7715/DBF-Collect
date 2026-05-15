import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const optionalAgeSchema = z.preprocess(
  (value) => (value === null || value === "" ? null : value),
  z.coerce.number().int().min(1).max(130).nullable()
);

const optionalGenderSchema = z.preprocess(
  (value) => (value === null || value === "" ? null : value),
  z.enum(["M", "F"]).nullable()
);

const updateMemberSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  age: optionalAgeSchema,
  gender: optionalGenderSchema,
  telephone: optionalTextSchema(40),
  photoIdNumber: optionalTextSchema(80),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const { teamId, memberId } = await params;
  const profile = await requireProfile();
  const formData = await request.formData();
  const parsed = updateMemberSchema.parse({
    fullName: formData.get("fullName"),
    age: formData.get("age"),
    gender: formData.get("gender"),
    telephone: formData.get("telephone"),
    photoIdNumber: formData.get("photoIdNumber"),
  });

  const supabase = await createSupabaseServerClient();
  const { data: allowed, error: allowedError } = await supabase.rpc("can_upload_team_documents", {
    target_team_id: teamId,
  });
  if (allowedError || !allowed) redirect("/portal");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("team_members")
    .update({
      full_name: parsed.fullName,
      age: parsed.age,
      gender: parsed.gender,
      telephone: parsed.telephone,
      photo_id_number: parsed.photoIdNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId)
    .eq("team_id", teamId);

  if (error) throw error;

  await writeAuditLog({
    actorId: profile.id,
    teamId,
    entityType: "team_member",
    entityId: memberId,
    action: "team_member_updated",
    details: {
      fullName: parsed.fullName,
      age: parsed.age,
      gender: parsed.gender,
      hasTelephone: Boolean(parsed.telephone),
      hasPhotoIdNumber: Boolean(parsed.photoIdNumber),
    },
    request,
  });

  redirect(`/portal/teams/${teamId}`);
}

function optionalTextSchema(maxLength: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
    z.string().max(maxLength).nullable()
  );
}
