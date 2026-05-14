export type UserRole = "caregiver" | "staff" | "admin";

export type DocumentStatus =
  | "not_started"
  | "uploaded"
  | "in_review"
  | "accepted"
  | "rejected"
  | "sent_for_signature"
  | "signed"
  | "completed";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  avatar_path?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Child = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  external_patient_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ChildCaregiver = {
  id: string;
  child_id: string;
  caregiver_id: string;
  relationship: string | null;
  is_authorized: boolean;
  can_view_documents: boolean;
  can_upload_documents: boolean;
  created_at: string;
  profiles?: Profile | null;
  children?: Child | null;
};

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type CaregiverInvitation = {
  id: string;
  email: string;
  child_id: string;
  relationship: string | null;
  invited_by: string | null;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  can_view_documents: boolean;
  can_upload_documents: boolean;
  created_at: string;
  children?: Child | null;
  profiles?: Profile | null;
};

export type IntakeTemplate = {
  id: string;
  name: string;
  description: string | null;
  requires_upload: boolean;
  requires_signature: boolean;
  dropbox_template_id: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ChildIntakeDocument = {
  id: string;
  child_id: string;
  template_id: string;
  status: DocumentStatus;
  uploaded_by: string | null;
  reviewed_by: string | null;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  review_notes: string | null;
  dropbox_signature_request_id: string | null;
  dropbox_signature_status: string | null;
  signed_file_path: string | null;
  created_at: string;
  updated_at: string;
  intake_document_templates?: IntakeTemplate;
  children?: Child;
};

export type ChildWithCaregiverAccess = Child & {
  relationship?: string | null;
  can_view_documents?: boolean;
  can_upload_documents?: boolean;
};

export type StaffDocumentInboxRow = ChildIntakeDocument & {
  children: Child;
  intake_document_templates: IntakeTemplate;
  profiles?: Profile | null;
};
