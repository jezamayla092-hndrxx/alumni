import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../firebase.config';
import { VerificationRequest } from '../models/verification.model';

@Injectable({
  providedIn: 'root',
})
export class VerificationService {
  private verificationCollection = collection(db, 'verification_requests');

  private getTimeValue(value: any): number {
    if (!value) {
      return 0;
    }

    if (typeof value?.toDate === 'function') {
      return value.toDate().getTime();
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private sortLatestFirst(
    requests: VerificationRequest[]
  ): VerificationRequest[] {
    return requests.sort((a, b) => {
      const dateA = this.getTimeValue(a.submittedAt);
      const dateB = this.getTimeValue(b.submittedAt);

      return dateB - dateA;
    });
  }

  getLatestVerificationRequestByUser(
    userUid: string,
    email: string
  ): Observable<VerificationRequest | null> {
    return new Observable((observer) => {
      const normalizedEmail = email.trim().toLowerCase();

      const uidQuery = query(
        this.verificationCollection,
        where('userUid', '==', userUid)
      );

      const unsubscribe = onSnapshot(
        uidQuery,
        async (snapshot) => {
          try {
            let requests: VerificationRequest[] = snapshot.docs.map(
              (docSnap) => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<VerificationRequest, 'id'>),
              })
            );

            if (!requests.length && normalizedEmail) {
              const emailQuery = query(
                this.verificationCollection,
                where('email', '==', normalizedEmail)
              );

              const emailSnapshot = await getDocs(emailQuery);

              requests = emailSnapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<VerificationRequest, 'id'>),
              }));
            }

            if (!requests.length) {
              observer.next(null);
              return;
            }

            const latestRequest = this.sortLatestFirst(requests)[0];

            observer.next(latestRequest);
          } catch (error) {
            console.error('Firestore error while loading latest request:', error);
            observer.error(error);
          }
        },
        (error) => {
          console.error('Firestore snapshot error latest request:', error);
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  getLatestVerificationRequestByEmail(
    email: string
  ): Observable<VerificationRequest | null> {
    return new Observable((observer) => {
      const normalizedEmail = email.trim().toLowerCase();

      const emailQuery = query(
        this.verificationCollection,
        where('email', '==', normalizedEmail)
      );

      const unsubscribe = onSnapshot(
        emailQuery,
        (snapshot) => {
          try {
            if (!snapshot.empty) {
              const requests: VerificationRequest[] = snapshot.docs.map(
                (docSnap) => ({
                  id: docSnap.id,
                  ...(docSnap.data() as Omit<VerificationRequest, 'id'>),
                })
              );

              const latestRequest = this.sortLatestFirst(requests)[0];

              observer.next(latestRequest);
            } else {
              observer.next(null);
            }
          } catch (error) {
            console.error('Firestore error latest request by email:', error);
            observer.error(error);
          }
        },
        (error) => {
          console.error(
            'Firestore snapshot error latest request by email:',
            error
          );
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  getAllVerificationRequests(): Observable<VerificationRequest[]> {
    return new Observable((observer) => {
      const unsubscribe = onSnapshot(
        this.verificationCollection,
        (snapshot) => {
          try {
            const requests: VerificationRequest[] = snapshot.docs.map(
              (docSnap) => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<VerificationRequest, 'id'>),
              })
            );

            observer.next(this.sortLatestFirst(requests));
          } catch (error) {
            console.error('Firestore error all requests:', error);
            observer.error(error);
          }
        },
        (error) => {
          console.error('Firestore snapshot error all requests:', error);
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
      submittedAt: serverTimestamp(),
      reviewedAt: null,
      reviewedBy: '',
    });

    if (data.userUid) {
      const userRef = doc(db, 'users', data.userUid);

      await updateDoc(userRef, {
        status: 'pending',
        isVerified: false,
      });
    }
  }

  async updateStatus(
    requestId: string,
    status: 'approved' | 'rejected' | 'under_review' | 'pending'
  ): Promise<void> {
    try {
      const requestRef = doc(db, 'verification_requests', requestId);

      await updateDoc(requestRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating verification status:', error);
      throw error;
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
      reviewedAt: serverTimestamp(),
    });

    const requestSnap = await getDoc(requestRef);

    if (requestSnap.exists()) {
      const requestData = requestSnap.data() as VerificationRequest;

      if (requestData.userUid) {
        const userRef = doc(db, 'users', requestData.userUid);

        await updateDoc(userRef, {
          status: 'under_review',
          isVerified: false,
        });
      }
    }
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
      reviewedAt: serverTimestamp(),
      remarks,
    });

    if (requestData.userUid) {
      const userRef = doc(db, 'users', requestData.userUid);

      await updateDoc(userRef, {
        status: 'verified',
        isVerified: true,
        role: 'alumni',
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
      reviewedAt: serverTimestamp(),
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
}