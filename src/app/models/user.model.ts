export type UserRole = 'admin' | 'officer' | 'alumni';

export type EmploymentStatus =
  | 'Employed'
  | 'Self-Employed'
  | 'Unemployed'
  | 'Further Studies';

export type UserVerificationStatus =
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected';

export interface EmploymentDetails {
  // employed
  companyName?: string;
  jobTitle?: string;
  employmentType?: string;
  industry?: string;
  workLocation?: string;
  dateHired?: string;

  // self-employed
  businessName?: string;
  businessType?: string;
  businessLocation?: string;

  // further studies
  schoolName?: string;
  degreeProgram?: string;

  // unemployed
  notes?: string;

  updatedAt?: any;
}

export interface VerificationDocument {
  fileName: string;
  fileType: string;
  url: string;
}

export interface User {
  id?: string;
  email: string;
  role: UserRole;

  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;

  studentId?: string;
  alumniId?: string;
  alumniIdIssuedAt?: any;
  alumniIdIssuedYear?: number;
  alumniIdSequence?: number;
  campus?: string;

  program?: string;
  yearGraduated?: number;
  birthDate?: string;
  sex?: string;

  status?: UserVerificationStatus;
  verificationStatus?: UserVerificationStatus;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;

  contactNumber?: string;
  contactCountry?: string;
  contactDialCode?: string;
  address?: string;
  photoUrl?: string;

  verificationDocuments?: VerificationDocument[];

  employmentStatus?: EmploymentStatus;
  employmentDetails?: EmploymentDetails;
}