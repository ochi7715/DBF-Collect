import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { getInvitationByToken, isInvitationExpired, normalizeEmail } from "@/lib/invitations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirectedFrom=/invite/${token}`);

  const invitation = await getInvitationByToken(token);
  if (!invitation) redirect(`/invite/${token}?error=missing`);
  if (invitation.status !== "pending") redirect(`/invite/${token}?error=${invitation.status}`);

  const admin = createSupabaseAdminClient();
  if (isInvitationExpired(invitation)) {
    await admin.from("team_invitations").update({ status: "expired" }).eq("id", invitation.id);
    await writeAuditLog({
      actorId: user.id,
      teamId: invitation.team_id,
      entityType: "team_invitation",
      entityId: invitation.id,
      action: "team_invitation_expired",
      details: { email: invitation.email },
      request,
    });
    redirect(`/invite/${token}?error=expired`);
  }

  const userEmail = normalizeEmail(user.email ?? "");
  const invitationEmail = normalizeEmail(invitation.email);
  if (!userEmail || userEmail !== invitationEmail) {
    redirect(`/invite/${token}?error=email`);
  }

  const { data: existingProfile } = await admin.from("profiles").select("id, role, is_active, full_name").eq("id", user.id).maybeSingle();
  if (existingProfile && existingProfile.is_active === false) {
    redirect(`/invite/${token}?error=inactive`);
  }

  if (existingProfile) {
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        email: userEmail,
        full_name: user.user_metadata?.full_name ?? existingProfile.full_name,
        role: existingProfile.role === "staff" || existingProfile.role === "admin" ? existingProfile.role : "team_contact",
      })
      .eq("id", user.id);
    if (profileError) throw profileError;
  } else {
    const { error: profileError } = await admin.from("profiles").insert({
      id: user.id,
      email: userEmail,
      full_name: user.user_metadata?.full_name ?? null,
      role: "team_contact",
      is_active: true,
    });
    if (profileError) throw profileError;
  }

  const { error: relationshipError } = await admin.from("team_contacts").upsert(
    {
      team_id: invitation.team_id,
      profile_id: user.id,
      contact_role: invitation.contact_role,
      is_authorized: true,
      can_view_documents: invitation.can_view_documents,
      can_upload_documents: invitation.can_upload_documents,
    },
    { onConflict: "team_id,profile_id" }
  );
  if (relationshipError) {
    redirect(`/invite/${token}?error=role`);
  }

  const { error: invitationError } = await admin
    .from("team_invitations")
    .update({
      status: "accepted",
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invitation.id);
  if (invitationError) throw invitationError;

  await writeAuditLog({
    actorId: user.id,
    teamId: invitation.team_id,
    entityType: "team_invitation",
    entityId: invitation.id,
    action: "team_invitation_accepted",
    details: { email: userEmail, contactRole: invitation.contact_role },
    request,
  });

  redirect(`/portal/teams/${invitation.team_id}/documents`);
}
