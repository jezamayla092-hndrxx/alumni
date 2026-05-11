import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebase.config';
import { Announcement } from '../models/announcements.model';

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private col = collection(db, 'announcements');

  constructor(private ngZone: NgZone) {}

  getAnnouncements(): Observable<Announcement[]> {
    return new Observable((observer) => {
      const q = query(this.col);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const announcements = snapshot.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as Omit<Announcement, 'id'>),
            }))
            .sort((a, b) => {
              const dateA = new Date(a.createdAt || '').getTime();
              const dateB = new Date(b.createdAt || '').getTime();
              return dateB - dateA;
            }) as Announcement[];

          this.ngZone.run(() => observer.next(announcements));
        },
        (error) => {
          this.ngZone.run(() => observer.error(error));
        }
      );

      return () => unsubscribe();
    });
  }

  getPublishedAnnouncements(): Observable<Announcement[]> {
    return new Observable((observer) => {
      const q = query(this.col, where('status', '==', 'Published'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const announcements = snapshot.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as Omit<Announcement, 'id'>),
            }))
            .sort((a, b) => {
              const dateA = new Date(a.createdAt || '').getTime();
              const dateB = new Date(b.createdAt || '').getTime();
              return dateB - dateA;
            }) as Announcement[];

          this.ngZone.run(() => observer.next(announcements));
        },
        (error) => {
          this.ngZone.run(() => observer.error(error));
        }
      );

      return () => unsubscribe();
    });
  }

  async addAnnouncement(data: Omit<Announcement, 'id'>): Promise<void> {
    await addDoc(this.col, data);
  }

  async updateAnnouncement(
    id: string,
    data: Partial<Announcement>
  ): Promise<void> {
    await updateDoc(doc(db, 'announcements', id), { ...data });
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await deleteDoc(doc(db, 'announcements', id));
  }
}