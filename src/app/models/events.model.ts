export type EventStatus =
  | 'Upcoming'
  | 'Ongoing'
  | 'Completed'
  | 'Cancelled';

export interface EventRecord {
  id?: string;

  title: string;
  description: string;

  eventDate: string;
  startTime: string;
  endTime: string;

  location: string;

  eventType: string;
  status: EventStatus;

  imageUrl?: string;

  isFeatured?: boolean;
  isArchived?: boolean;

  createdAt?: string;
  updatedAt?: string;
}