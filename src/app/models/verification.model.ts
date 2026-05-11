import { VerificationDocument } from './user.model';

export interface VerificationRequest {
  id?: string;

  userUid?: string;

  /**
   * Real Alumni ID generated only after officer approval.
   * Example: USTP-VIL-AL-2026-000001
   */
  alumniId?: string;
  alumniIdIssuedAt?: any;
  alumniIdIssuedYear?: number;
  alumniIdSequence?: number;
  campus?: string;

  fullName: string;
  email: string;
  program?: string;
  yearGraduated?: number | string;

  /**
   * University ID / Student ID from signup.
   * This is NOT the Alumni ID.
   */
  studentId?: string;

  contactNumber?: string;
  contactCountry?: string;
  contactDialCode?: string;
  birthDate?: string;
  sex?: string;

  verificationDocuments?: VerificationDocument[];
  submittedDocuments?: string[];
  documentUrl?: string;
  documentName?: string;

  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  remarks?: string;

  submittedAt?: any;
  reviewedAt?: any;
  reviewedBy?: string;
  updatedAt?: any;
}