# ABS Connect - Phase 1 Patient Portal

This is a runnable starter project for the Phase 1 ABS Connect patient portal scope:

- Secure caregiver/staff login using Supabase Auth
- Staff/admin and parent/caregiver roles
- Child records
- Staff child onboarding, caregiver invitations, and access management
- Multiple caregivers per child
- Multiple children per caregiver
- Child switcher for caregivers
- Intake document checklist
- Child-level document uploads
- Caregiver access controls for document viewing and uploading
- Staff back-office document inbox and review flow
- Private Supabase Storage bucket for intake documents
- Dropbox Sign integration module for signature templates and webhooks
- Audit logging for sensitive activity

The project is intentionally scoped to Phase 1. Scheduling, billing/insurance, authorizations, progress updates, and secure messaging are not implemented yet, but the navigation and database structure leave room for those future modules.

## Stack

- Next.js App Router
- TypeScript
- Supabase Auth, Postgres, Storage, and RLS
- Tailwind CSS
- Dropbox Sign API integration module

## 1. Create a Supabase project

Create a new Supabase project, then open the SQL editor and run:

```sql
-- supabase/schema.sql
```

Then run:

```sql
-- supabase/seed.sql
```

This creates the tables, policies, storage bucket, and starter intake document templates.

## 2. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase project URL and keys.

Required:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Optional for Dropbox Sign:

```bash
DROPBOX_SIGN_API_KEY=
DROPBOX_SIGN_TEST_MODE=true
DROPBOX_SIGN_CLIENT_ID=
DROPBOX_SIGN_WEBHOOK_SECRET=
```

## 3. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 4. Test login locally

1. Copy `.env.example` to `.env.local` and fill in the Supabase values.
2. In Supabase SQL Editor, run `supabase/schema.sql`, then `supabase/seed.sql`.
3. In Supabase Auth, create a test user with an email and password.
4. Promote that user to admin:

```sql
select public.promote_user_to_admin('admin@example.com');
```

5. Start the app and open `/login`.
6. Sign in with the test user's email and password. You can also use `/signup` to create a caregiver account, or `/forgot-password` to test reset links.
7. Open `/admin`, create a child record, then create a caregiver invitation from that child record.
8. To test caregiver login, create or invite a second Auth user with the invited email, sign in as that user, open the invitation link, and accept it.

For magic links and invitation emails, add local and deployed redirect URLs in Supabase Auth URL Configuration:

```text
http://localhost:3000/**
http://localhost:3001/**
https://your-production-domain.com/auth/callback
https://your-production-domain.com/invite/**
https://your-production-domain.com/update-password
https://*-your-vercel-team.vercel.app/**
```

## 5. Create the first admin user

1. Create a user in Supabase Auth.
2. In SQL editor, run this with the user's email:

```sql
select public.promote_user_to_admin('admin@example.com');
```

That inserts/updates the user's profile as `admin`.

## 6. Onboard a child and caregiver

After creating your admin, use the staff pages:

1. Open **Back office -> Child records -> New child**.
2. Create the child record.
3. Open the child record and create a caregiver invitation.
4. Send the generated invitation link, or configure Supabase Auth email delivery so the app can send the invite email.
5. The caregiver signs in with the invited email address, accepts the invitation, and lands on that child's intake document page.

You can still insert sample records directly if needed:

```sql
insert into public.children (first_name, last_name, date_of_birth, external_patient_id)
values ('Sample', 'Child', '2018-05-01', 'ABS-001');

insert into public.child_caregivers (child_id, caregiver_id, relationship)
select c.id, p.id, 'Parent'
from public.children c
cross join public.profiles p
where c.external_patient_id = 'ABS-001'
  and p.email = 'caregiver@example.com';
```

## 7. Deploy to Vercel

This app deploys as a standard Next.js project.

1. Push the project to GitHub. If you push the outer folder, set Vercel's root directory to `abs-connect-phase1`.
2. Import the repository in Vercel.
3. Add environment variables for Production and Preview:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
DROPBOX_SIGN_API_KEY=
DROPBOX_SIGN_TEST_MODE=true
DROPBOX_SIGN_CLIENT_ID=
DROPBOX_SIGN_WEBHOOK_SECRET=
```

4. Deploy. Vercel should auto-detect Next.js and use `npm run build`.
5. After deployment, set the production `NEXT_PUBLIC_SITE_URL` to the final Vercel or custom domain and redeploy.
6. In Supabase Auth URL Configuration, set the Site URL to the production domain and add the redirect URLs listed above.

If Dropbox Sign is enabled, configure its webhook URL to:

```text
https://your-production-domain.com/api/dropbox-sign/webhook
```

## Dropbox Sign notes

This starter implements the integration points and database tracking. For production, configure Dropbox Sign templates with signer roles that match the code. The `src/lib/dropbox-sign.ts` module uses template-based signature requests and webhook status updates. Completed signed PDFs are downloaded from Dropbox Sign, stored in the private `intake-documents` bucket, and shown separately from the originally uploaded file.

## Invitation notes

Caregiver invitations are stored in `caregiver_invitations` with a secure token, expiration, and child-level document permissions. `NEXT_PUBLIC_SITE_URL` is used to build invitation links. If Supabase Auth email delivery is not configured, staff can copy the generated invitation link from the child record or caregiver page.

## HIPAA/security notes before production

This code is a strong foundation, but production deployment should still include:

- BAA coverage for vendors used to process/store PHI
- End-to-end security review
- Penetration testing
- Audit log retention policy
- Backup/restore policy
- File type and malware scanning
- Staff access review workflow
- Environment-specific secrets management

## Key folders

```text
src/app/portal                 Parent/caregiver portal pages
src/app/admin                  Staff/admin back-office pages
src/app/api/documents          Document upload, review, and signed-url endpoints
src/app/api/dropbox-sign       Dropbox Sign send and webhook endpoints
src/components                 Shared UI components
src/lib                        Supabase, auth, audit, child, document, Dropbox helpers
supabase                       Database schema, RLS policies, and seed data
```
