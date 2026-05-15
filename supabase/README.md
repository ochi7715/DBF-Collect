# Supabase Setup

Run these files in order:

1. `schema.sql`
2. `seed.sql`

The schema creates:

- Roles: team contact, staff, admin
- Race categories and category rule sets
- Teams
- Team contact roles: captain, manager, co-captain
- Team contact invitations
- Team members
- Document forms: A1, A2, B1, B2, C, D
- Team-level and member-level document tracking
- Private `race-documents` storage bucket
- Private `form-templates` storage bucket for admin-uploaded blank form replacements
- RLS policies for team contact and admin access
- Audit logging

The seed file creates the default Regular, USDBOC, and Invitational categories plus starter form labels.
