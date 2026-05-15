# Supabase Auth Email Templates

Copy each HTML file into the matching Supabase Dashboard template under Authentication > Emails > Templates.

Suggested subjects:

- Confirm sign up: `Confirm your PaddlePass account`
- Invite user: `You have been invited to PaddlePass`
- Magic link: `Sign in to PaddlePass`
- Change email address: `Confirm your PaddlePass email change`
- Reset password: `Reset your PaddlePass password`
- Reauthentication: `PaddlePass verification code`

These templates use Supabase's built-in `{{ .ConfirmationURL }}` for link-based flows, so the app's `emailRedirectTo` value still controls the final destination after verification.
