// ── Types ────────────────────────────────────────────────────────────────────

export type EmploymentStatusType =
  | 'Employed'
  | 'Self-employed'
  | 'Unemployed'
  | 'Further Studies'
  | 'Employed and Studying'
  | 'Not currently seeking employment'
  | '';

// ── Data interface ────────────────────────────────────────────────────────────

export interface EmploymentStatusData {
  alumniUid?: string;

  // Section 1 – Overview
  status: EmploymentStatusType;
  jobOpportunityPreference: string;
  careerSummary: string;

  // Section 2 – Employed / Employed and Studying
  companyName: string;
  jobPosition: string;
  industry: string;
  employmentType: string;
  workLocation: string;
  dateHired: string;
  careerLevel: string;
  courseRelevance: string;

  // Section 2 – Self-employed
  businessName: string;
  businessRole: string;
  businessLocation: string;
  dateStarted: string;

  // Section 3 – Unemployed
  lookingForWork: string;
  preferredIndustry: string;
  preferredWorkType: string;
  preferredWorkLocation: string;
  previousJobPosition: string;
  previousCompany: string;
  unemployedSkills: string;
  unemployedNotes: string;

  // Section 4 – Studies (Further Studies + study part of Employed and Studying)
  institutionName: string;
  programTaking: string;
  studyLevel: string;
  studyStatus: string;
  fieldOfStudy: string;
  startYear: string;
  expectedCompletionYear: string;
  studyCourseRelevance: string;
  studyNotes: string;

  // Section 5 – Not currently seeking
  currentActivity: string;
  careerPlans: string;
  notSeekingNotes: string;

  // Section 6 – Skills
  careerCategories: string[];
  specificSkills: string;

  // Section 7 – Notes
  additionalNotes: string;

  // Metadata
  lastUpdated: string | null;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createEmptyEmploymentStatus(): EmploymentStatusData {
  return {
    status: '',
    jobOpportunityPreference: '',
    careerSummary: '',
    companyName: '',
    jobPosition: '',
    industry: '',
    employmentType: '',
    workLocation: '',
    dateHired: '',
    careerLevel: '',
    courseRelevance: '',
    businessName: '',
    businessRole: '',
    businessLocation: '',
    dateStarted: '',
    lookingForWork: '',
    preferredIndustry: '',
    preferredWorkType: '',
    preferredWorkLocation: '',
    previousJobPosition: '',
    previousCompany: '',
    unemployedSkills: '',
    unemployedNotes: '',
    institutionName: '',
    programTaking: '',
    studyLevel: '',
    studyStatus: '',
    fieldOfStudy: '',
    startYear: '',
    expectedCompletionYear: '',
    studyCourseRelevance: '',
    studyNotes: '',
    currentActivity: '',
    careerPlans: '',
    notSeekingNotes: '',
    careerCategories: [],
    specificSkills: '',
    additionalNotes: '',
    lastUpdated: null,
  };
}

// ── Option constants ──────────────────────────────────────────────────────────

export const EMPLOYMENT_STATUS_OPTIONS: string[] = [
  'Employed',
  'Self-employed',
  'Unemployed',
  'Further Studies',
  'Employed and Studying',
  'Not currently seeking employment',
];

export const JOB_OPPORTUNITY_OPTIONS: string[] = [
  'Open to job opportunities',
  'Open to better opportunities',
  'Open to internships',
  'Open to freelance / project-based work',
  'Not currently looking',
  'Not applicable',
  'Prefer not to say',
];

export const EMPLOYMENT_TYPE_OPTIONS: string[] = [
  'Full-time',
  'Part-time',
  'Contractual',
  'Freelance',
  'Internship',
  'Temporary',
  'Project-based',
  'Self-employed',
];

export const INDUSTRY_OPTIONS: string[] = [
  'Information Technology / Software',
  'Business Process Outsourcing',
  'Education / Academe',
  'Engineering / Manufacturing',
  'Government',
  'Healthcare',
  'Finance / Banking',
  'Sales / Marketing',
  'Hospitality / Tourism',
  'Construction',
  'Creative / Design',
  'Entrepreneurship / Business',
  'Other',
];

export const CAREER_LEVEL_OPTIONS: string[] = [
  'Entry-level',
  'Junior',
  'Mid-level',
  'Senior',
  'Supervisor / Lead',
  'Managerial',
  'Executive',
  'Not applicable',
];

export const COURSE_RELEVANCE_OPTIONS: string[] = [
  'Directly related',
  'Somewhat related',
  'Not related',
  'Not sure',
];

export const STUDY_LEVEL_OPTIONS: string[] = [
  'Certificate / Short Course',
  'Undergraduate Degree',
  "Master's Degree",
  'Doctorate Degree',
  'Professional Training',
  'Review / Board Exam Preparation',
  'Other',
];

export const STUDY_STATUS_OPTIONS: string[] = [
  'Currently enrolled',
  'On leave',
  'Completed',
  'Planning to enroll',
  'Other',
];

export const LOOKING_FOR_WORK_OPTIONS: string[] = [
  'Yes, actively looking',
  'Yes, but casually looking',
  'No, not at the moment',
];

export const CURRENT_ACTIVITY_OPTIONS: string[] = [
  'Taking a break',
  'Family responsibilities',
  'Personal reasons',
  'Preparing for further studies',
  'Preparing for board exam / certification',
  'Undecided',
  'Prefer not to say',
  'Other',
];

export const CAREER_CATEGORIES: string[] = [
  'Technical Skills',
  'Administrative Skills',
  'Teaching / Training',
  'Research / Analysis',
  'Creative / Design',
  'Communication',
  'Leadership / Management',
  'Entrepreneurial Skills',
  'Customer Service',
  'Other',
];

export const PREFERRED_WORK_TYPE_OPTIONS: string[] = [
  'Full-time',
  'Part-time',
  'Freelance / Project-based',
  'Remote',
  'Hybrid',
  'On-site',
  'Any',
];