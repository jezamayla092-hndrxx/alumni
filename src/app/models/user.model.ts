export type UserRole = 'admin' | 'officer' | 'alumni';

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
}