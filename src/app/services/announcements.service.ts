import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  CollectionReference,
  DocumentData,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Announcement } from '../models/announcements.model';

@Injectable({
  providedIn: 'root',
})
export class AnnouncementService {
  private firestore = inject(Firestore);

  private announcementsCollection: CollectionReference<DocumentData> =
    collection(this.firestore, 'announcements');

  getAnnouncements(): Observable<Announcement[]> {
    const announcementsQuery = query(
      this.announcementsCollection,
      orderBy('datePosted', 'desc')
    );

    return collectionData(announcementsQuery, {
      idField: 'id',
    }) as Observable<Announcement[]>;
  }

  async addAnnouncement(data: Omit<Announcement, 'id'>): Promise<void> {
    await addDoc(this.announcementsCollection, data);
  }

  async updateAnnouncement(
    id: string,
    data: Partial<Announcement>
  ): Promise<void> {
    const announcementDoc = doc(this.firestore, 'announcements', id);
    await updateDoc(announcementDoc, { ...data });
  }

  async deleteAnnouncement(id: string): Promise<void> {
    const announcementDoc = doc(this.firestore, 'announcements', id);
    await deleteDoc(announcementDoc);
  }
}