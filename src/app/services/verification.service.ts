import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebase.config';
import { VerificationRequest } from '../models/verification.model';

@Injectable({
  providedIn: 'root',
})
export class VerificationService {
  private verificationCollection = collection(db, 'verification_requests');

  getAllVerificationRequests(): Observable<VerificationRequest[]> {
    return new Observable<VerificationRequest[]>((observer) => {
      const q = query(
        this.verificationCollection,
        orderBy('submittedAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const requests: VerificationRequest[] = snapshot.docs.map(
            (docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<VerificationRequest, 'id'>),
            })
          );

          observer.next(requests);
        },
        (error) => {
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  getLatestVerificationRequestByEmail(
    email: string
  ): Observable<VerificationRequest | null> {
    return new Observable<VerificationRequest | null>((observer) => {
      const normalizedEmail = email.trim().toLowerCase();

      const q = query(
        this.verificationCollection,
        where('email', '==', normalizedEmail)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            observer.next(null);
            return;
          }

          const requests: VerificationRequest[] = snapshot.docs.map(
            (docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<VerificationRequest, 'id'>),
            })
          );

          const latestRequest = requests.sort((a, b) => {
            const aTime = this.toMillis(a.submittedAt);
            const bTime = this.toMillis(b.submittedAt);
            return bTime - aTime;
          })[0];

          observer.next(latestRequest ?? null);
        },
        (error) => {
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  async createVerificationRequest(data: {
    userUid: string;
    alumniId: string;
    fullName: string;
    email: string;
    program?: string;
    yearGraduated?: number | string;
    studentId?: string;
  }): Promise<void> {
    await addDoc(this.verificationCollection, {
      userUid: data.userUid,
      alumniId: data.alumniId,
      fullName: data.fullName,
      email: data.email.trim().toLowerCase(),
      program: data.program || '',
      yearGraduated: data.yearGraduated || '',
      studentId: data.studentId || '',
      submittedDocuments: [],
      status: 'pending',
      remarks: '',
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: '',
    });
  }

  async approveRequest(
    requestId: string,
    reviewedBy: string,
    remarks: string = ''
  ): Promise<void> {
    const requestRef = doc(db, 'verification_requests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('Verification request not found.');
    }

    const requestData = requestSnap.data() as VerificationRequest;

    await updateDoc(requestRef, {
      status: 'approved',
      reviewedBy,
      reviewedAt: new Date(),
      remarks,
    });

    if (requestData.userUid) {
      const userRef = doc(db, 'users', requestData.userUid);
      await updateDoc(userRef, {
        status: 'verified',
        isVerified: true,
      });
    }
  }

  async rejectRequest(
    requestId: string,
    reviewedBy: string,
    remarks: string
  ): Promise<void> {
    const requestRef = doc(db, 'verification_requests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('Verification request not found.');
    }

    const requestData = requestSnap.data() as VerificationRequest;

    await updateDoc(requestRef, {
      status: 'rejected',
      reviewedBy,
      reviewedAt: new Date(),
      remarks,
    });

    if (requestData.userUid) {
      const userRef = doc(db, 'users', requestData.userUid);
      await updateDoc(userRef, {
        status: 'rejected',
        isVerified: false,
      });
    }
  }

  async markAsUnderReview(
    requestId: string,
    reviewedBy: string
  ): Promise<void> {
    const requestRef = doc(db, 'verification_requests', requestId);

    await updateDoc(requestRef, {
      status: 'under_review',
      reviewedBy,
      reviewedAt: new Date(),
    });
  }

  private toMillis(value: any): number {
    if (!value) return 0;

    if (typeof value?.toDate === 'function') {
      return value.toDate().getTime();
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}