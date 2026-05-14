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
    await admin.from("caregiver_invitations").update({ status: "expired" }).eq("id", invitation.id);
    await writeAuditLog({
      actorId: user.id,
      childId: invitation.child_id,
      entityType: "caregiver_invitation",
      entityId: invitation.id,
      action: "caregiver_invitation_expired",
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
      })
      .eq("id", user.id);
    if (profileError) throw profileError;
  } else {
    const { error: profileError } = await admin.from("profiles").insert({
      id: user.id,
      email: userEmail,
      full_name: user.user_metadata?.full_name ?? null,
      role: "caregiver",
      is_active: true,
    });
    if (profileError) throw profileError;
  }

  const { error: relationshipError } = await admin.from("child_caregivers").upsert(
    {
      child_id: invitation.child_id,
      caregiver_id: user.id,
      relationship: invitation.relationship,
      is_authorized: true,
      can_view_documents: invitation.can_view_documents,
      can_upload_documents: invitation.can_upload_documents,
    },
    { onConflict: "child_id,caregiver_id" }
  );
  if (relationshipError) throw relationshipError;

  const { error: invitationError } = await admin
    .from("caregiver_invitations")
    .update({
      status: "accepted",
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invitation.id);
  if (invitationError) throw invitationError;

  await writeAuditLog({
    actorId: user.id,
    childId: invitation.child_id,
    entityType: "caregiver_invitation",
    entityId: invitation.id,
    action: "caregiver_invitation_accepted",
    details: { email: userEmail },
    request,
  });

  redirect(`/portal/children/${invitation.child_id}/documents`);
}
