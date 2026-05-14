import type { CSSProperties } from "react";
import { Camera, CheckCircle2, KeyRound, UserRound } from "lucide-react";
import { requireProfile } from "@/lib/auth";

type AccountPageSearchParams = {
  error?: string;
  status?: string;
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<AccountPageSearchParams>;
}) {
  const profile = await requireProfile();
  const { error, status } = await searchParams;
  const avatarStyle = getAvatarStyle(profile.avatar_url);
  const initials = getInitials(profile.full_name ?? profile.email);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Account</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Profile settings</h1>
            <p className="mt-2 max-w-2xl text-slate-600">Update your profile details, photo, and password.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <span className="flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-brand-600 bg-cover bg-center text-lg font-bold text-white" style={avatarStyle}>
              {avatarStyle ? null : initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950">{profile.full_name ?? profile.email}</p>
              <p className="truncate text-sm text-slate-500">{profile.email}</p>
            </div>
          </div>
        </div>
      </div>

      {status ? (
        <div className="flex items-center gap-2 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          <CheckCircle2 className="size-4 shrink-0" />
          {getStatusCopy(status)}
        </div>
      ) : null}

      {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900">{getErrorCopy(error)}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <form action="/api/account/profile" method="post" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
              <UserRound className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">Profile details</h2>
              <p className="text-sm text-slate-600">Your name is shown to staff and caregivers.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Full name</span>
              <input
                name="fullName"
                defaultValue={profile.full_name ?? ""}
                maxLength={160}
                className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                value={profile.email}
                readOnly
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
              />
            </label>
          </div>

          <button className="focus-ring mt-5 rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">Save profile</button>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
              <Camera className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">Profile photo</h2>
              <p className="text-sm text-slate-600">Use a PNG, JPG, or WebP image up to 2 MB.</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-brand-600 bg-cover bg-center text-2xl font-bold text-white" style={avatarStyle}>
              {avatarStyle ? null : initials}
            </span>
            <div className="flex-1">
              <form action="/api/account/avatar" method="post" encType="multipart/form-data" className="space-y-3">
                <input
                  name="avatar"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                />
                <button className="focus-ring rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">Upload photo</button>
              </form>

              {profile.avatar_url ? (
                <form action="/api/account/avatar/remove" method="post" className="mt-3">
                  <button className="focus-ring rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Remove photo
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>

        <form id="security" action="/api/account/password" method="post" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">Password</h2>
              <p className="text-sm text-slate-600">Choose a new password with at least 8 characters.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">New password</span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Confirm new password</span>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <button className="focus-ring mt-5 rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">Update password</button>
        </form>
      </div>
    </section>
  );
}

function getStatusCopy(status: string) {
  switch (status) {
    case "profile-updated":
      return "Profile details updated.";
    case "avatar-updated":
      return "Profile photo updated.";
    case "avatar-removed":
      return "Profile photo removed.";
    case "password-updated":
      return "Password updated.";
    default:
      return "Account updated.";
  }
}

function getErrorCopy(error: string) {
  switch (error) {
    case "avatar-required":
      return "Choose an image before uploading.";
    case "avatar-too-large":
      return "Profile photo must be 2 MB or smaller.";
    case "avatar-type":
      return "Profile photo must be a PNG, JPG, or WebP image.";
    case "password-mismatch":
      return "Passwords do not match.";
    case "password-short":
      return "Password must be at least 8 characters.";
    case "profile-invalid":
      return "Full name must be 160 characters or fewer.";
    default:
      return "Account update could not be completed.";
  }
}

function getAvatarStyle(avatarUrl?: string | null): CSSProperties | undefined {
  if (!avatarUrl) return undefined;

  try {
    const parsed = new URL(avatarUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
  } catch {
    return undefined;
  }

  return { backgroundImage: `url("${avatarUrl.replaceAll('"', "%22")}")` };
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : value.slice(0, 2);
  return (initials || "A").toUpperCase();
}
