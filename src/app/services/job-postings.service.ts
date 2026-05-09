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
import { Observable } from 'rxjs';
import { JobPosting } from '../models/job-postings.model';

@Injectable({
  providedIn: 'root',
})
export class JobPostingsService {
  private firestore = inject(Firestore);
  private injector = inject(EnvironmentInjector);

  private col: CollectionReference<DocumentData> = collection(
    this.firestore,
    'jobPostings'
  );

  getJobPostings(): Observable<JobPosting[]> {
    return runInInjectionContext(this.injector, () => {
      const q = query(this.col, orderBy('createdAt', 'desc'));
      return collectionData(q, { idField: 'id' }) as Observable<JobPosting[]>;
    });
  }

  async addJobPosting(data: Omit<JobPosting, 'id'>): Promise<void> {
    await addDoc(this.col, data);
  }

  async updateJobPosting(id: string, data: Partial<JobPosting>): Promise<void> {
    await updateDoc(doc(this.firestore, 'jobPostings', id), { ...data });
  }

  async deleteJobPosting(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'jobPostings', id));
  }
}