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

export interface User {
  id?: string;
  email: string;
  role: UserRole;

  fullName?: string;
  firstName?: string;
  lastName?: string;
  studentId?: string;
  program?: string;
  yearGraduated?: number;

  status?: UserVerificationStatus;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: any;

  contactNumber?: string;
  address?: string;
  photoUrl?: string;

  employmentStatus?: EmploymentStatus;
  employmentDetails?: EmploymentDetails;
}