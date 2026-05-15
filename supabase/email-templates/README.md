# Supabase Auth Email Templates

Copy each HTML file into the matching Supabase Dashboard template under Authentication > Emails > Templates.

Suggested subjects:

- Confirm sign up: `Confirm your Dragon Boat Docs account`
- Invite user: `You have been invited to Dragon Boat Docs`
- Magic link: `Sign in to Dragon Boat Docs`
- Change email address: `Confirm your Dragon Boat Docs email change`
- Reset password: `Reset your Dragon Boat Docs password`
- Reauthentication: `Dragon Boat Docs verification code`

These templates use Supabase's built-in `{{ .ConfirmationURL }}` for link-based flows, so the app's `emailRedirectTo` value still controls the final destination after verification.
