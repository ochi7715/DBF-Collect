# Dragon Boat Docs

Dragon Boat Docs is a Supabase-backed Next.js portal for race organizations to collect and review team registration documents.

## What It Supports

- Secure team contact, staff, and admin login with Supabase Auth
- One captain, one manager, and one co-captain portal role per team
- People acting as contacts for multiple teams in different race categories
- Admin-managed race categories and category rule sets
- Category-driven team form requirements:
  - USDBOC Open, Mixed, Womens: Form A1 and Form B1
  - Regular Open, Mixed, Womens: Form A1 and Form B2
  - Invitational categories: Form A2 and Form B2
  - Every team: Form D seating chart
- Team contacts can add team members by name
- Team member profiles capture age, gender, telephone, and photo ID number for roster generation
- Form A1/A2 and B1/B2 PDFs can be generated from saved team data
- Drag-and-drop B1/B2 seating diagrams support required seats, optional alternates, and a movable captain marker
- Weekly practice scheduling with admin-managed slot capacity, optional recurring team assignments, and week-by-week attendance responses
- One Form C waiver of liability upload per team member
- Downloadable blank form PDFs, with admin reupload support for updated form versions
- Admin document inbox, review notes, accepted/rejected statuses, and audit logging
- Private Supabase Storage bucket for uploaded race documents
- Optional Dropbox Sign template tracking for forms configured to require signatures

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Run `supabase/seed.sql` to create starter race categories and Forms A1, A2, B1, B2, C, and D. The seed links the bundled PDFs in `public/forms` for A1, A2, B1, B2, and C.
4. Create the environment file:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

5. Add local and deployed URLs to Supabase Auth redirect URLs:

```text
http://localhost:3000/**
https://your-production-domain.com/**
```

## First Admin

After creating your first auth user, promote it in the Supabase SQL editor:

```sql
select public.promote_user_to_admin('admin@example.com');
```

Admins can then use **Back office -> User access** to invite staff/admin users and manage account access.

## Team Workflow

1. Open **Back office -> Race categories** to confirm or edit category rules.
2. Open **Back office -> Teams -> New team** and assign a race category.
3. Open the team record and invite a captain, manager, and co-captain.
4. Team contacts accept their email invitation and use **Fill forms** to add team members, complete roster details, generate Forms A/B, upload remaining team-level forms, and upload each member's Form C.
5. Admins configure recurring practice slots from **Back office -> Practice schedule**, then team contacts respond from **Practice schedule** each week.
6. Admins review all uploads from **Back office -> Document inbox**.

## Project Structure

```text
src/app/portal                 Team portal pages
src/app/admin                  Admin back office pages
src/app/api                    Upload, review, invitation, team, category, and account endpoints
src/components                 Shared shell, upload form, and status components
public/forms                   Bundled blank form PDFs
src/lib                        Supabase, auth, audit, team, document, and Dropbox helpers
supabase/schema.sql            Database, RLS, triggers, and storage policies
supabase/seed.sql              Starter race categories and document forms
```
