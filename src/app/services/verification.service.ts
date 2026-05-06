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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { VerificationRequest } from '../models/verification.model';

@Injectable({
  providedIn: 'root',
})
export class VerificationService {
  private verificationCollection = collection(db, 'verification_requests');

  // ==============================
  // GET LATEST REQUEST BY EMAIL
  // ==============================
  getLatestVerificationRequestByEmail(
    email: string
  ): Observable<VerificationRequest | null> {
    return new Observable((observer) => {
      const q = query(
        this.verificationCollection,
        where('email', '==', email.trim().toLowerCase()),
        orderBy('submittedAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            observer.next({
              id: docSnap.id,
              ...(docSnap.data() as Omit<VerificationRequest, 'id'>),
            });
          } else {
            observer.next(null);
          }
        },
        (error) => {
          console.error('Firestore error (latest request):', error);
          observer.next(null); // prevents UI crash
        }
      );

      return () => unsubscribe();
    });
  }

  // ==============================
  // GET ALL REQUESTS (FIXED SAFE)
  // ==============================
  getAllVerificationRequests(): Observable<VerificationRequest[]> {
    return new Observable((observer) => {
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
          console.error('Firestore error (all requests):', error);
          observer.next([]); // ✅ prevents blank page
        }
      );

      return () => unsubscribe();
    });
  }

  // ==============================
  // CREATE REQUEST (FIXED TIMESTAMP)
  // ==============================
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
      submittedAt: serverTimestamp(), // ✅ FIXED
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

  // ==============================
  // UPDATE STATUS (SAFE)
  // ==============================
  async updateStatus(
    requestId: string,
    status: 'approved' | 'rejected' | 'under_review' | 'pending'
  ): Promise<void> {
    try {
      const requestRef = doc(db, 'verification_requests', requestId);

      await updateDoc(requestRef, {
        status,
        updatedAt: serverTimestamp(), // ✅ FIXED
      });
    } catch (error) {
      console.error('Error updating verification status:', error);
      throw error;
    }
  }

  // ==============================
  // MARK UNDER REVIEW
  // ==============================
  async markAsUnderReview(
    requestId: string,
    reviewedBy: string
  ): Promise<void> {
    const requestRef = doc(db, 'verification_requests', requestId);

    await updateDoc(requestRef, {
      status: 'under_review',
      reviewedBy,
      reviewedAt: serverTimestamp(), // ✅ FIXED
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

  // ==============================
  // APPROVE
  // ==============================
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
      reviewedAt: serverTimestamp(), // ✅ FIXED
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

  // ==============================
  // REJECT
  // ==============================
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
      reviewedAt: serverTimestamp(), // ✅ FIXED
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