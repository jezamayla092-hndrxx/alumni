export type AnnouncementStatus = 'Published' | 'Draft';

export interface Announcement {
  id?: string;
  title: string;
  content: string;
  status: AnnouncementStatus;
  datePosted: string;
  createdAt?: string;
  updatedAt?: string;
}