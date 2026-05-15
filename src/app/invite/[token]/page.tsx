import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { getContactRoleLabel } from "@/lib/dragon-boat";
import { getInvitationByToken, isInvitationExpired, normalizeEmail } from "@/lib/invitations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

const errorCopy: Record<string, string> = {
  missing: "This invitation could not be found.",
  accepted: "This invitation has already been accepted.",
  expired: "This invitation has expired.",
  revoked: "This invitation was revoked by an admin.",
  email: "You are signed in with a different email address than the one invited.",
  inactive: "This account is inactive. Please contact an admin for help.",
  role: "That team role is already assigned. Please contact an admin for help.",
};

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const invitation = await getInvitationByToken(token);
  if (!invitation) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const expired = isInvitationExpired(invitation);
  const canAccept =
    invitation.status === "pending" &&
    !expired &&
    user?.email &&
    normalizeEmail(user.email) === normalizeEmail(invitation.email);
  const loginHref = `/login?redirectedFrom=${encodeURIComponent(`/invite/${token}`)}`;
  const team = invitation.teams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <ShieldCheck size={26} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Team portal invitation</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Connect to a team</h1>
            <p className="mt-2 text-slate-600">
              An admin invited {invitation.email} to access race documents
              {team ? ` for ${team.name}` : ""}.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-900">Portal role:</span> {getContactRoleLabel(invitation.contact_role)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Expires:</span> {formatDate(invitation.expires_at)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">View documents:</span> {invitation.can_view_documents ? "Yes" : "No"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Upload documents:</span> {invitation.can_upload_documents ? "Yes" : "No"}
          </p>
        </div>

        {error ? <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{errorCopy[error] ?? "This invitation could not be accepted."}</p> : null}
        {expired && invitation.status === "pending" ? <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">This invitation has expired.</p> : null}

        {!user ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={loginHref} className="focus-ring rounded-xl bg-brand-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-brand-700">
              Sign in to accept
            </Link>
            <p className="text-sm text-slate-500">Use the invited email address: {invitation.email}</p>
          </div>
        ) : canAccept ? (
          <form action={`/api/invitations/${token}/accept`} method="post" className="mt-6">
            <button className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
              <CheckCircle2 size={18} /> Accept invitation
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Signed in as <span className="font-semibold text-slate-900">{user.email}</span>. This invitation is for{" "}
            <span className="font-semibold text-slate-900">{invitation.email}</span>.
          </div>
        )}
      </section>
    </main>
  );
}
