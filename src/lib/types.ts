export type UserRole = "team_contact" | "staff" | "admin";

export type TeamContactRole = "captain" | "manager" | "co_captain";

export type RaceCategoryRule = "regular" | "usdboc" | "invitational";

export type DocumentScope = "team" | "member";

export type DocumentFormCode = "A1" | "A2" | "B1" | "B2" | "C" | "D";

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

export type RaceCategory = {
  id: string;
  name: string;
  rule_set: RaceCategoryRule;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  name: string;
  race_category_id: string;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  race_categories?: RaceCategory | null;
};

export type TeamContact = {
  id: string;
  team_id: string;
  profile_id: string | null;
  contact_role: TeamContactRole;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_authorized: boolean;
  can_view_documents: boolean;
  can_upload_documents: boolean;
  created_at: string;
  profiles?: Profile | null;
  teams?: Team | null;
};

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type TeamInvitation = {
  id: string;
  email: string;
  team_id: string;
  contact_role: TeamContactRole;
  invited_by: string | null;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  can_view_documents: boolean;
  can_upload_documents: boolean;
  created_at: string;
  teams?: Team | null;
  profiles?: Profile | null;
};

export type TeamMember = {
  id: string;
  team_id: string;
  full_name: string;
  age: number | null;
  gender: "M" | "F" | null;
  telephone: string | null;
  photo_id_number: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamFormRoster = {
  id: string;
  team_id: string;
  form_code: "B1" | "B2";
  layout: Record<string, string | null>;
  captain_seat_key: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PracticeAttendanceStatus = "confirmed" | "no_attendance";
export type PracticeAssignmentKind = "primary" | "additional";

export type PracticeSlotCapacity = {
  slot_start_time: string;
  capacity: number;
  created_at: string;
  updated_at: string;
};

export type TeamPracticeAssignment = {
  id: string;
  team_id: string;
  assignment_kind: PracticeAssignmentKind;
  slot_start_time: string;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  teams?: Team | null;
};

export type TeamPracticeAttendance = {
  id: string;
  team_id: string;
  practice_week_start: string;
  assignment_kind: PracticeAssignmentKind;
  response: PracticeAttendanceStatus;
  responded_by: string | null;
  responded_at: string;
  created_at: string;
  updated_at: string;
};

export type TeamPracticeSeatingChart = {
  id: string;
  team_id: string;
  practice_week_start: string;
  assignment_kind: PracticeAssignmentKind;
  uploaded_by: string | null;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
  updated_at: string;
};

export type DocumentForm = {
  code: DocumentFormCode;
  name: string;
  description: string | null;
  scope: DocumentScope;
  requires_upload: boolean;
  requires_signature: boolean;
  dropbox_template_id: string | null;
  template_file_path: string | null;
  template_file_name: string | null;
  template_mime_type: string | null;
  template_file_size_bytes: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DragonBoatDocument = {
  id: string;
  team_id: string;
  team_member_id: string | null;
  form_code: DocumentFormCode;
  scope: DocumentScope;
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
  document_forms?: DocumentForm | null;
  teams?: Team | null;
  team_members?: TeamMember | null;
  profiles?: Profile | null;
};

export type TeamWithContactAccess = Team & {
  contact_role?: TeamContactRole | null;
  can_view_documents?: boolean;
  can_upload_documents?: boolean;
};

export type StaffDocumentInboxRow = DragonBoatDocument & {
  teams: Team;
  document_forms: DocumentForm;
  team_members?: TeamMember | null;
  profiles?: Profile | null;
};
