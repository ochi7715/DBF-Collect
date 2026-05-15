-- Starter dragon boat race categories and document forms.

insert into public.race_categories (name, rule_set, sort_order, is_active)
values
  ('Regular Mixed', 'regular', 10, true),
  ('Regular Open', 'regular', 20, true),
  ('Regular Womens', 'regular', 30, true),
  ('USDBOC Open', 'usdboc', 40, true),
  ('USDBOC Mixed', 'usdboc', 50, true),
  ('USDBOC Womens', 'usdboc', 60, true),
  ('Invitational', 'invitational', 70, true)
on conflict (name) do update
  set rule_set = excluded.rule_set,
      sort_order = excluded.sort_order,
      is_active = excluded.is_active;

insert into public.document_forms (
  code,
  name,
  description,
  scope,
  requires_upload,
  requires_signature,
  template_file_path,
  template_file_name,
  template_mime_type,
  template_file_size_bytes,
  sort_order,
  is_active
)
values
  ('A1', 'Form A1 - Team registration', 'Required for Regular and USDBOC race categories.', 'team', true, false, '/forms/Form A1.pdf', 'Form A1.pdf', 'application/pdf', 330875, 10, true),
  ('A2', 'Form A2 - Invitational registration', 'Required for invitational race categories.', 'team', true, false, '/forms/Form A2.pdf', 'Form A2.pdf', 'application/pdf', 257039, 20, true),
  ('B1', 'Form B1 - USDBOC roster', 'Required for USDBOC Open, Mixed, and Womens categories.', 'team', true, false, '/forms/Form B1.pdf', 'Form B1.pdf', 'application/pdf', 382310, 30, true),
  ('B2', 'Form B2 - Regular or invitational roster', 'Required for Regular and invitational race categories.', 'team', true, false, '/forms/Form B2.pdf', 'Form B2.pdf', 'application/pdf', 361510, 40, true),
  ('C', 'Form C - Waiver of liability', 'One waiver is required for every team member.', 'member', true, false, '/forms/Form C.pdf', 'Form C.pdf', 'application/pdf', 338560, 50, true),
  ('D', 'Form D - Team seating chart', 'One seating chart is required per team.', 'team', true, false, null, null, null, null, 60, true)
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description,
      scope = excluded.scope,
      requires_upload = excluded.requires_upload,
      requires_signature = excluded.requires_signature,
      template_file_path = coalesce(public.document_forms.template_file_path, excluded.template_file_path),
      template_file_name = coalesce(public.document_forms.template_file_name, excluded.template_file_name),
      template_mime_type = coalesce(public.document_forms.template_mime_type, excluded.template_mime_type),
      template_file_size_bytes = coalesce(public.document_forms.template_file_size_bytes, excluded.template_file_size_bytes),
      sort_order = excluded.sort_order,
      is_active = excluded.is_active;
