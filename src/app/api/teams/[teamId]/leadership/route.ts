import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const leadershipSchema = z.object({
  contactRole: z.enum(["captain", "manager", "co_captain"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const profile = await requireProfile();
  const formData = await request.formData();
  const parsed = leadershipSchema.parse({
    contactRole: formData.get("contactRole"),
  });
  const admin = createSupabaseAdminClient();

  const { data: currentContact, error: currentContactError } = await admin
    .from("team_contacts")
    .select("id, contact_role")
    .eq("team_id", teamId)
    .eq("profile_id", profile.id)
    .eq("is_authorized", true)
    .maybeSingle();
  if (currentContactError) throw currentContactError;
  if (!currentContact) redirect("/portal");

  if (currentContact.contact_role === parsed.contactRole) {
    redirect(`/portal/teams/${teamId}?leadership=saved`);
  }

  const { data: occupiedRole, error: occupiedRoleError } = await admin
    .from("team_contacts")
    .select("id")
    .eq("team_id", teamId)
    .eq("contact_role", parsed.contactRole)
    .neq("profile_id", profile.id)
    .maybeSingle();
  if (occupiedRoleError) throw occupiedRoleError;
  if (occupiedRole) redirect(`/portal/teams/${teamId}?leadership=occupied`);

  const { error } = await admin
    .from("team_contacts")
    .update({
      contact_role: parsed.contactRole,
    })
    .eq("id", currentContact.id)
    .eq("team_id", teamId)
    .eq("profile_id", profile.id);

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      redirect(`/portal/teams/${teamId}?leadership=occupied`);
    }
    throw error;
  }

  await writeAuditLog({
    actorId: profile.id,
    teamId,
    entityType: "team_contact",
    entityId: currentContact.id,
    action: "team_contact_self_role_updated",
    details: {
      previousRole: currentContact.contact_role,
      contactRole: parsed.contactRole,
    },
    request,
  });

  redirect(`/portal/teams/${teamId}?leadership=saved`);
}
