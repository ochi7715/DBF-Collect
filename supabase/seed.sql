-- Starter intake checklist templates.
-- Replace or expand these with ABS's actual intake documents.

insert into public.intake_document_templates (name, description, requires_upload, requires_signature, sort_order)
values
  ('Insurance Card', 'Upload the front and back of the insurance card.', true, false, 10),
  ('Photo ID', 'Upload a parent or guardian photo ID.', true, false, 20),
  ('Diagnosis Documentation', 'Upload diagnostic documentation related to ABA services.', true, false, 30),
  ('Consent to Treat', 'Electronic signature required through Dropbox Sign.', false, true, 40),
  ('HIPAA / Privacy Acknowledgement', 'Electronic signature required through Dropbox Sign.', false, true, 50)
on conflict do nothing;
