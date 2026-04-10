export type UserRole = 'admin' | 'officer' | 'alumni';

export type EmploymentStatus =
  | 'Employed'
  | 'Self-Employed'
  | 'Unemployed'
  | 'Further Studies';

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

  status?: 'pending' | 'verified' | 'rejected';
  isActive?: boolean;

  createdAt?: any;

  contactNumber?: string;
  address?: string;
  photoUrl?: string;

  employmentStatus?: EmploymentStatus;
}