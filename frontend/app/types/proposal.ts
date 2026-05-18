/* frontend/app/types/proposal.ts */

"use client";

export interface ReviewTargetOption {
  user_id: string;
  role?: string | null;
  full_name?: string | null;
  email?: string | null;
  office_type?: string | null;
  office_name?: string | null;
  office_code?: string | null;
  department?: string | null;
  city?: string | null;
  jurisdiction?: string | null;
  sort_order?: string | null;
  display_label?: string | null;
}

export interface ReviewTargetsResponse {
  ministry: ReviewTargetOption[];
  municipal: ReviewTargetOption[];
  police: ReviewTargetOption[];
}

export interface ProposalAssignedOffice {
  user_id: string;
  role?: string | null;
  full_name?: string | null;
  email?: string | null;
  office_type?: string | null;
  office_name?: string | null;
  office_code?: string | null;
  department?: string | null;
  city?: string | null;
  jurisdiction?: string | null;
  sort_order?: string | null;
  display_label?: string | null;
}

export interface ProposalOfficeAssignments {
  ministry?: ProposalAssignedOffice | null;
  municipal?: ProposalAssignedOffice | null;
  police?: ProposalAssignedOffice | null;
}

export interface ProposalReviewDecision {
  stage: string;
  decision: string;
  office_id?: string | null;
  office_name?: string | null;
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  notes?: string | null;
  decided_at: string;
}

export interface ProposalOrganizerUpdate {
  type: string;
  message: string;
  stage?: string | null;
  status?: string | null;
  office_id?: string | null;
  office_name?: string | null;
  created_at: string;
  details?: Record<string, unknown> | null;
}

export interface ProposalSecurityAssignment {
  office_id: string;
  office_name: string;
  office_role?: string | null;
  city?: string | null;
  message: string;
  assigned_at: string;
}

export interface ProposalRecord {
  id: string;
  organizer_id: string;
  event_id?: string | null;
  title: string;
  description?: string | null;
  visibility?: string | null;
  event_type?: string | null;
  location?: string | null;
  expected_attendees?: number | null;
  budget_estimate?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  program_overview?: string | null;
  event_objectives?: string | null;
  target_audience?: string[] | null;
  security_level?: string | null;
  personnel_count?: number | null;
  document_url?: string | null;
  document_name?: string | null;
  document_size?: number | null;
  status: string;
  review_stage?: string | null;
  office_assignments?: ProposalOfficeAssignments | null;
  review_decisions?: ProposalReviewDecision[];
  organizer_updates?: ProposalOrganizerUpdate[];
  security_assignment?: ProposalSecurityAssignment | null;
  approval_certificate_id?: string | null;
  approval_certificate_number?: string | null;
  verification_letter_id?: string | null;
  verification_letter_reference?: string | null;
  police_notification_id?: string | null;
  rejection_reason?: string | null;
  change_request_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalFormData {
  title: string;
  description: string;
  visibility: 'public' | 'private';
  event_type: string;
  start_date: string;
  end_date: string;
  location: string;
  expected_attendees: number;
  budget_estimate: string;
  programOverview: string;
  eventObjectives: string;
  targetAudience: string[];
  securityLevel: string;
  personnelCount: number;
  ministryOfficeId: string;
  municipalOfficeId: string;
  policeOfficeId: string;
  documents: File | null;
}

export interface SessionProposalData {
  id: string;
  title: string;
  description: string;
  visibility: 'public' | 'private';
  event_type: string;
  start_date: string;
  end_date: string;
  location: string;
  expected_attendees: number;
  budget_estimate: number;
  programOverview: string;
  eventObjectives: string;
  targetAudience: string[];
  securityLevel: string;
  personnelCount: number;
  ministryOfficeId: string;
  municipalOfficeId: string;
  policeOfficeId: string;
  document_base64: string | null;
  document_name: string | null;
  document_size: number | null;
  status: string;
  createdAt: string;
}

export interface PermitRecord {
  id: string;
  proposal_id: string;
  organizer_id?: string | null;
  permit_number: string;
  issued_at: string;
  issued_by_role?: string | null;
  issued_by_user_id?: string | null;
  issued_by_office_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface VerificationLetterRecord {
  id: string;
  proposal_id: string;
  event_id?: string | null;
  organizer_id?: string | null;
  reference_number: string;
  proposal_title: string;
  organizer_name: string;
  ministry_office_name?: string | null;
  municipal_office_name?: string | null;
  reviewer_name?: string | null;
  approval_timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface PoliceNotificationOffice {
  user_id?: string | null;
  office_name?: string | null;
  office_role?: string | null;
  city?: string | null;
  display_label?: string | null;
}

export interface PoliceNotificationSecurityDocument {
  document_url?: string | null;
  document_name?: string | null;
  document_size?: number | null;
}

export interface PoliceNotificationOrganizerContact {
  organizer_id?: string | null;
  organizer_name?: string | null;
  email?: string | null;
  phone?: string | null;
  alternative_contact?: string | null;
}

export interface PoliceNotificationRecord {
  id: string;
  proposal_id: string;
  event_id?: string | null;
  police_office: PoliceNotificationOffice;
  event_title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  expected_attendees?: number | null;
  organizer_contact: PoliceNotificationOrganizerContact;
  security_level?: string | null;
  personnel_count?: number | null;
  security_plan_document?: PoliceNotificationSecurityDocument | null;
  permit_reference?: string | null;
  approval_reference?: string | null;
  municipal_office_name?: string | null;
  status?: string | null;
  notified_at: string;
  created_at: string;
  updated_at: string;
}
