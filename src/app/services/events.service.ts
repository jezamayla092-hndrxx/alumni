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
} from '@angular/fire/firestore';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { Observable } from 'rxjs';
import { EventRecord } from '../models/events.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private firestore = inject(Firestore);
  private injector = inject(EnvironmentInjector);
  private col = collection(this.firestore, 'events');

  getEvents(): Observable<EventRecord[]> {
    return runInInjectionContext(this.injector, () => {
      const q = query(this.col, orderBy('eventDate', 'asc'));
      return collectionData(q, { idField: 'id' }) as Observable<EventRecord[]>;
    });
  }

  async addEvent(data: Omit<EventRecord, 'id'>) {
    await addDoc(this.col, data);
  }

  async updateEvent(id: string, data: Partial<EventRecord>) {
    await updateDoc(doc(this.firestore, 'events', id), data);
  }

  async deleteEvent(id: string) {
    await deleteDoc(doc(this.firestore, 'events', id));
  }

  async uploadEventImage(file: File): Promise<string> {
    const storage = getStorage();
    const safeFileName = file.name.replace(/\s+/g, '_');
    const filePath = `event-images/${Date.now()}_${safeFileName}`;
    const fileRef = ref(storage, filePath);

    await uploadBytes(fileRef, file);

    return getDownloadURL(fileRef);
  }
}