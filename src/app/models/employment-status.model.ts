export type EmploymentStatusType =
  | 'Employed'
  | 'Self-employed'
  | 'Studying'
  | 'Unemployed';

export interface EmploymentData {
  status: EmploymentStatusType;

  // Employed
  companyName?: string;
  jobTitle?: string;
  employmentType?: string;
  industry?: string;
  workLocation?: string;
  dateHired?: string;

  // Self-employed
  businessName?: string;
  businessType?: string;
  businessLocation?: string;

  // Studying
  schoolName?: string;
  degreeProgram?: string;

  // Unemployed
  notes?: string;

  updatedAt?: any;
}