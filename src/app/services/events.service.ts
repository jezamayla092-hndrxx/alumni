import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  getAuth,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

import { db } from '../firebase.config';
import { EventInterest, EventRecord } from '../models/events.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private eventsCol = collection(db, 'events');
  private interestsCol = collection(db, 'eventInterests');

  constructor(private ngZone: NgZone) {}

  getEvents(): Observable<EventRecord[]> {
    return new Observable((observer) => {
      const eventsQuery = query(this.eventsCol, orderBy('eventDate', 'asc'));

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

  getEventInterestCounts(): Observable<Record<string, number>> {
    return new Observable((observer) => {
      const unsubscribe = onSnapshot(
        this.interestsCol,
        (snapshot) => {
          const counts: Record<string, number> = {};

          snapshot.docs.forEach((docItem) => {
            const data = docItem.data() as EventInterest;

            if (!data.eventId) return;

            counts[data.eventId] = (counts[data.eventId] ?? 0) + 1;
          });

          this.ngZone.run(() => {
            observer.next(counts);
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

  getInterestsForEvent(eventId: string): Observable<EventInterest[]> {
    return new Observable((observer) => {
      if (!eventId) {
        observer.next([]);
        return () => {};
      }

      const interestsQuery = query(
        this.interestsCol,
        where('eventId', '==', eventId)
      );

      const unsubscribe = onSnapshot(
        interestsQuery,
        (snapshot) => {
          const interests = snapshot.docs
            .map((docItem) => ({
              id: docItem.id,
              ...(docItem.data() as Omit<EventInterest, 'id'>),
            }))
            .sort((a, b) => this.toTime(b.createdAt) - this.toTime(a.createdAt)) as EventInterest[];

          this.ngZone.run(() => {
            observer.next(interests);
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

  getMyInterestedEventIds(): Observable<Set<string>> {
    return new Observable((observer) => {
      const auth = getAuth();
      let interestsUnsubscribe: (() => void) | undefined;

      const authUnsubscribe = onAuthStateChanged(auth, (user) => {
        interestsUnsubscribe?.();
        interestsUnsubscribe = undefined;

        if (!user) {
          this.ngZone.run(() => {
            observer.next(new Set<string>());
          });
          return;
        }

        const myInterestsQuery = query(
          this.interestsCol,
          where('userId', '==', user.uid)
        );

        interestsUnsubscribe = onSnapshot(
          myInterestsQuery,
          (snapshot) => {
            const ids = new Set<string>();

            snapshot.docs.forEach((docItem) => {
              const data = docItem.data() as EventInterest;

              if (data.eventId) {
                ids.add(data.eventId);
              }
            });

            this.ngZone.run(() => {
              observer.next(ids);
            });
          },
          (error) => {
            this.ngZone.run(() => {
              observer.error(error);
            });
          }
        );
      });

      return () => {
        interestsUnsubscribe?.();
        authUnsubscribe();
      };
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

    await addDoc(this.eventsCol, payload);
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

    const interestsQuery = query(
      this.interestsCol,
      where('eventId', '==', id)
    );

    const interestsSnapshot = await getDocs(interestsQuery);

    await Promise.all(
      interestsSnapshot.docs.map((interestDoc) =>
        deleteDoc(doc(db, 'eventInterests', interestDoc.id))
      )
    );

    await deleteDoc(doc(db, 'events', id));
  }

  async toggleEventInterest(event: EventRecord): Promise<void> {
    if (!event.id) {
      throw new Error('Event ID is missing.');
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be signed in to mark interest.');
    }

    const interestId = this.getInterestDocId(event.id, user.uid);
    const interestRef = doc(db, 'eventInterests', interestId);
    const existing = await getDoc(interestRef);

    if (existing.exists()) {
      await deleteDoc(interestRef);
      return;
    }

    const profile = await this.getUserProfile(user);
    const now = new Date().toISOString();

    const payload: EventInterest = this.removeUndefinedFields({
      eventId: event.id,
      userId: user.uid,
      fullName: profile.fullName,
      email: profile.email,
      program: profile.program,
      yearGraduated: profile.yearGraduated,
      studentId: profile.studentId,
      contactNumber: profile.contactNumber,
      createdAt: now,
    });

    await setDoc(interestRef, payload);
  }

  private async getUserProfile(user: FirebaseUser): Promise<{
    fullName: string;
    email: string;
    program?: string;
    yearGraduated?: string;
    studentId?: string;
    contactNumber?: string;
  }> {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const data = userSnap.exists() ? (userSnap.data() as any) : {};

    const fullName =
      data.fullName ||
      [data.firstName, data.middleName, data.lastName, data.suffix]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      user.displayName ||
      user.email ||
      'Alumni';

    return {
      fullName,
      email: data.email || user.email || '',
      program: data.program || '',
      yearGraduated: data.yearGraduated ? String(data.yearGraduated) : '',
      studentId: data.studentId || '',
      contactNumber: data.contactNumber || '',
    };
  }

  private getInterestDocId(eventId: string, userId: string): string {
    return `${eventId}_${userId}`;
  }

  private toTime(value: any): number {
    if (!value) return 0;

    const resolved =
      typeof value === 'string'
        ? value
        : value?.toDate?.() ?? value;

    const time = new Date(resolved).getTime();

    return isNaN(time) ? 0 : time;
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