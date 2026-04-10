export interface VerificationRequest {
  id?: string;

  userUid?: string;
  alumniId: string;

  fullName: string;
  email: string;
  program?: string;
  yearGraduated?: number | string;
  studentId?: string;

  submittedDocuments?: string[];
  documentUrl?: string;
  documentName?: string;

  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  remarks?: string;

  submittedAt?: any;
  reviewedAt?: any;
  reviewedBy?: string;
}