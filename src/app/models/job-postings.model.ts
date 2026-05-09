export type JobStatus = 'Active' | 'Draft' | 'Closed';

export const JOB_CATEGORIES: string[] = [
  'Information Technology',
  'Communications',
  'Engineering / Technical',
  'Business / Administration',
  'Education',
  'Customer Service',
  'Sales / Marketing',
  'Government',
  'Freelance',
  'Others',
];

export const EMPLOYMENT_TYPES: string[] = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Freelance',
];

export const WORK_SETUPS: string[] = [
  'On-site',
  'Remote',
  'Hybrid',
];

export const APPLICATION_METHODS: string[] = [
  'Application Link',
  'Email',
  'Walk-in',
];

export const JOB_STATUSES: JobStatus[] = ['Active', 'Draft', 'Closed'];

export const RECOMMENDED_PROGRAMS: string[] = [
  'Information Technology',
  'Technology Communication Management',
  'Electro-Mechanical Technology',
];

export interface JobPosting {
  id?: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  location: string;
  category: string;
  employmentType: string;
  workSetup: string;
  salaryRange?: string;
  jobDescription: string;
  qualifications: string;
  applicationMethod: string;
  applicationLink?: string;
  contactEmail?: string;
  deadline: string;
  status: JobStatus;
  openToAllAlumni: boolean;
  recommendedPrograms: string[];
  createdAt: any;
  updatedAt?: any;
  postedBy?: string;
}