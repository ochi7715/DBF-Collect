import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireProfile } from "@/lib/auth";
import { normalizeEmail } from "@/lib/invitations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const contactRoleSchema = z.enum(["captain", "manager", "co_captain"]);
const contactDetailsSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().email(),
  telephone: optionalTextSchema(40),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string; contactRole: string }> }
) {
  const { teamId, contactRole } = await params;
  const parsedRole = contactRoleSchema.safeParse(contactRole);
  if (!parsedRole.success) redirect(`/portal/teams/${teamId}?contact=invalid-role`);

  const profile = await requireProfile();
  const formData = await request.formData();
  const parsed = contactDetailsSchema.parse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    telephone: formData.get("telephone"),
  });

  const admin = createSupabaseAdminClient();
  const normalizedEmail = normalizeEmail(parsed.email);
  const [{ data: actorContact }, { data: existingContact }, { data: matchingProfile }, { data: duplicateEmailRole }] = await Promise.all([
    admin
      .from("team_contacts")
      .select("id")
      .eq("team_id", teamId)
      .eq("profile_id", profile.id)
      .eq("is_authorized", true)
      .maybeSingle(),
    admin.from("team_contacts").select("*").eq("team_id", teamId).eq("contact_role", parsedRole.data).maybeSingle(),
    admin.from("profiles").select("id").eq("email", normalizedEmail).maybeSingle(),
    admin
      .from("team_contacts")
      .select("id")
      .eq("team_id", teamId)
      .eq("contact_email", normalizedEmail)
      .neq("contact_role", parsedRole.data)
      .maybeSingle(),
  ]);

  if (!actorContact) redirect("/portal");
  if (duplicateEmailRole) redirect(`/portal/teams/${teamId}?contact=duplicate-email`);

  if (matchingProfile) {
    const { data: duplicateProfileRole } = await admin
      .from("team_contacts")
      .select("id, contact_role")
      .eq("team_id", teamId)
      .eq("profile_id", matchingProfile.id)
      .neq("contact_role", parsedRole.data)
      .maybeSingle();

    if (duplicateProfileRole) {
      redirect(`/portal/teams/${teamId}?contact=duplicate-account`);
    }
  }

  const payload = {
    team_id: teamId,
    profile_id: matchingProfile?.id ?? null,
    contact_role: parsedRole.data,
    contact_name: parsed.fullName,
    contact_email: normalizedEmail,
    contact_phone: parsed.telephone,
    is_authorized: existingContact?.is_authorized ?? true,
    can_view_documents: existingContact?.can_view_documents ?? true,
    can_upload_documents: existingContact?.can_upload_documents ?? true,
  };

  const { data: savedContact, error } = await admin
    .from("team_contacts")
    .upsert(payload, { onConflict: "team_id,contact_role" })
    .select("id")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      redirect(`/portal/teams/${teamId}?contact=duplicate-account`);
    }
    throw error;
  }

  await writeAuditLog({
    actorId: profile.id,
    teamId,
    entityType: "team_contact",
    entityId: savedContact.id,
    action: "team_contact_details_saved",
    details: {
      contactRole: parsedRole.data,
      hasLinkedAccount: Boolean(matchingProfile),
      hasTelephone: Boolean(parsed.telephone),
    },
    request,
  });

  redirect(`/portal/teams/${teamId}?contact=saved`);
}

function optionalTextSchema(maxLength: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
    z.string().max(maxLength).nullable()
  );
}
