export type EventType =
  | 'Academic'
  | 'Career'
  | 'Community'
  | 'Seminar'
  | 'Workshop'
  | 'Other';

export interface EventRecord {
  id?: string;
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  type: EventType;
  imageUrl?: string;
  isFeatured?: boolean;

  createdAt?: string;
  updatedAt?: string;
}