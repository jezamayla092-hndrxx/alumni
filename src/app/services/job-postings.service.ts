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
    return new Observable<JobPosting[]>((observer) => {
      const jobPostingsQuery = query(this.col, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        jobPostingsQuery,
        (snapshot) => {
          const jobPostings = snapshot.docs.map((docItem) => {
            const data = docItem.data() as Omit<JobPosting, 'id'>;

            return {
              id: docItem.id,
              ...data,
              recommendedPrograms: Array.isArray(data.recommendedPrograms)
                ? data.recommendedPrograms
                : [],
              openToAllAlumni:
                typeof data.openToAllAlumni === 'boolean'
                  ? data.openToAllAlumni
                  : false,
            } as JobPosting;
          });

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
    const normalizedData: Omit<JobPosting, 'id'> = {
      ...data,
      recommendedPrograms: Array.isArray(data.recommendedPrograms)
        ? data.recommendedPrograms
        : [],
      openToAllAlumni:
        typeof data.openToAllAlumni === 'boolean'
          ? data.openToAllAlumni
          : false,
    };

    await addDoc(this.col, normalizedData);
  }

  async updateJobPosting(
    id: string,
    data: Partial<JobPosting>
  ): Promise<void> {
    const normalizedData: Partial<JobPosting> = {
      ...data,
    };

    if ('recommendedPrograms' in normalizedData) {
      normalizedData.recommendedPrograms = Array.isArray(
        normalizedData.recommendedPrograms
      )
        ? normalizedData.recommendedPrograms
        : [];
    }

    if ('openToAllAlumni' in normalizedData) {
      normalizedData.openToAllAlumni =
        typeof normalizedData.openToAllAlumni === 'boolean'
          ? normalizedData.openToAllAlumni
          : false;
    }

    await updateDoc(doc(db, 'jobPostings', id), { ...normalizedData });
  }

  async deleteJobPosting(id: string): Promise<void> {
    await deleteDoc(doc(db, 'jobPostings', id));
  }
}