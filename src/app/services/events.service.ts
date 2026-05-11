import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../firebase.config';
import { EventRecord } from '../models/events.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private col = collection(db, 'events');

  constructor(private ngZone: NgZone) {}

  getEvents(): Observable<EventRecord[]> {
    return new Observable((observer) => {
      const eventsQuery = query(this.col, orderBy('eventDate', 'asc'));

      const unsubscribe = onSnapshot(
        eventsQuery,
        (snapshot) => {
          const events = snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...(docItem.data() as Omit<EventRecord, 'id'>),
          })) as EventRecord[];

          this.ngZone.run(() => {
            observer.next(events);
          });
        },
        (error) => {
          this.ngZone.run(() => {
            observer.error(error);
          });
        }
      );

      return () => unsubscribe();
    });
  }

  async addEvent(data: Omit<EventRecord, 'id'>): Promise<void> {
    const now = new Date().toISOString();

    const payload = this.removeUndefinedFields({
      title: data.title,
      description: data.description || '',
      eventDate: data.eventDate,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      eventType: data.eventType,
      status: data.status,
      imageUrl: data.imageUrl || '',
      isFeatured: data.isFeatured ?? false,
      isArchived: data.isArchived ?? false,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    });

    await addDoc(this.col, payload);
  }

  async updateEvent(id: string, data: Partial<EventRecord>): Promise<void> {
    if (!id) return;

    const payload = this.removeUndefinedFields({
      ...data,
      updatedAt: data.updatedAt || new Date().toISOString(),
    });

    delete payload.id;

    await updateDoc(doc(db, 'events', id), payload);
  }

  async deleteEvent(id: string): Promise<void> {
    if (!id) return;

    await deleteDoc(doc(db, 'events', id));
  }

  private removeUndefinedFields<T extends Record<string, any>>(data: T): T {
    const cleaned: Record<string, any> = {};

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    });

    return cleaned as T;
  }
}