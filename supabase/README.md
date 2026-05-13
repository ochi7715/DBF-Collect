# Supabase setup

Run `schema.sql` first, then `seed.sql`.

The schema creates:

- Roles: caregiver, staff, admin
- Profiles linked to Supabase Auth users
- Children
- Child-caregiver relationships
- Caregiver invitations
- Intake document templates
- Child intake document checklist records
- Audit logs
- Private `intake-documents` storage bucket
- RLS policies for caregiver/staff access

After creating the first Supabase Auth user, run:

```sql
select public.promote_user_to_admin('admin@example.com');
```

Then sign in with that user and use the admin pages.
