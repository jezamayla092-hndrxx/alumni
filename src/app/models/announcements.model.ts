export type AnnouncementStatus = 'Published' | 'Draft' | 'Archived';

export type AnnouncementVisibility =
  | 'All Alumni'
  | 'Verified Alumni Only'
  | 'Specific Program';

export type AnnouncementCategory =
  | 'General'
  | 'Alumni Office'
  | 'Job Opportunity'
  | 'Event Notice'
  | 'System Notice'
  | 'Academic';

export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = [
  'General',
  'Alumni Office',
  'Job Opportunity',
  'Event Notice',
  'System Notice',
  'Academic',
];

export const ANNOUNCEMENT_STATUSES: AnnouncementStatus[] = [
  'Published',
  'Draft',
  'Archived',
];

export const ANNOUNCEMENT_VISIBILITIES: AnnouncementVisibility[] = [
  'All Alumni',
  'Verified Alumni Only',
  'Specific Program',
];

export const ANNOUNCEMENT_PROGRAMS: string[] = [
  'Information Technology',
  'Technology Communication Management',
  'Electro-Mechanical Technology',
];

export interface Announcement {
  id?: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  visibility: AnnouncementVisibility;
  program?: string;
  status: AnnouncementStatus;
  isPinned: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}