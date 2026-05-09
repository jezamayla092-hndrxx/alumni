import {
  Injectable,
  EnvironmentInjector,
  inject,
  runInInjectionContext,
} from '@angular/core';
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
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { Observable } from 'rxjs';
import { Announcement } from '../models/announcements.model';

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private firestore = inject(Firestore);
  private injector = inject(EnvironmentInjector);

  private col: CollectionReference<DocumentData> = collection(
    this.firestore,
    'announcements'
  );

  getAnnouncements(): Observable<Announcement[]> {
    return runInInjectionContext(this.injector, () => {
      const q = query(this.col, orderBy('createdAt', 'desc'));
      return collectionData(q, { idField: 'id' }) as Observable<Announcement[]>;
    });
  }

  async addAnnouncement(data: Omit<Announcement, 'id'>): Promise<void> {
    await addDoc(this.col, data);
  }

  async updateAnnouncement(id: string, data: Partial<Announcement>): Promise<void> {
    await updateDoc(doc(this.firestore, 'announcements', id), { ...data });
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'announcements', id));
  }

  async uploadAnnouncementImage(file: File): Promise<string> {
    const storage = getStorage();
    const safeFileName = file.name.replace(/\s+/g, '_');
    const filePath = `announcement-images/${Date.now()}_${safeFileName}`;
    const fileRef = ref(storage, filePath);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }

  async uploadAnnouncementAttachment(file: File): Promise<string> {
    const storage = getStorage();
    const safeFileName = file.name.replace(/\s+/g, '_');
    const filePath = `announcement-attachments/${Date.now()}_${safeFileName}`;
    const fileRef = ref(storage, filePath);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }
}