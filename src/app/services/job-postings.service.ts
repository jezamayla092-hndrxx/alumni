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
import { JobPosting } from '../models/job-postings.model';

@Injectable({
  providedIn: 'root',
})
export class JobPostingsService {
  private col = collection(db, 'jobPostings');

  constructor(private ngZone: NgZone) {}

  getJobPostings(): Observable<JobPosting[]> {
    return new Observable((observer) => {
      const jobPostingsQuery = query(
        this.col,
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        jobPostingsQuery,
        (snapshot) => {
          const jobPostings = snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...(docItem.data() as Omit<JobPosting, 'id'>),
          })) as JobPosting[];

          this.ngZone.run(() => {
            observer.next(jobPostings);
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

  async addJobPosting(data: Omit<JobPosting, 'id'>): Promise<void> {
    await addDoc(this.col, data);
  }

  async updateJobPosting(
    id: string,
    data: Partial<JobPosting>
  ): Promise<void> {
    await updateDoc(doc(db, 'jobPostings', id), { ...data });
  }

  async deleteJobPosting(id: string): Promise<void> {
    await deleteDoc(doc(db, 'jobPostings', id));
  }
}