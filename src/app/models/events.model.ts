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

  capacity?: number | null;
  registrationRequired?: boolean;

  imageUrl?: string;
  isFeatured?: boolean;

  createdAt?: string;
  updatedAt?: string;
}