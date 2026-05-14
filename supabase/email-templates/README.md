# Supabase Auth Email Templates

Copy each HTML file into the matching Supabase Dashboard template under Authentication > Emails > Templates.

Suggested subjects:

- Confirm sign up: `Confirm your ABS Connect account`
- Invite user: `You have been invited to ABS Connect`
- Magic link: `Sign in to ABS Connect`
- Change email address: `Confirm your ABS Connect email change`
- Reset password: `Reset your ABS Connect password`
- Reauthentication: `ABS Connect verification code`

These templates use Supabase's built-in `{{ .ConfirmationURL }}` for link-based flows, so the app's `emailRedirectTo` value still controls the final destination after verification.
