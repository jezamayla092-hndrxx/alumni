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
  runTransaction,
  updateDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../firebase.config';
import { VerificationRequest } from '../models/verification.model';
import { User } from '../models/user.model';
import { AlumniIdService } from './alumni-id.service';

@Injectable({
  providedIn: 'root',
})
export class VerificationService {
  private verificationCollection = collection(db, 'verification_requests');

  constructor(private alumniIdService: AlumniIdService) {}

  private getTimeValue(value: any): number {
    if (!value) return 0;
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    if (value instanceof Date) return value.getTime();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private sortLatestFirst(requests: VerificationRequest[]): VerificationRequest[] {
    return requests.sort((a, b) => {
      const dateA = this.getTimeValue(a.submittedAt);
      const dateB = this.getTimeValue(b.submittedAt);
      return dateB - dateA;
    });
  }

  private async hasExistingUser(request: VerificationRequest): Promise<boolean> {
    const userUid = request.userUid?.trim();
    if (!userUid) return false;
    const userRef  = doc(db, 'users', userUid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists();
  }

  private async filterRequestsWithExistingUsers(
    requests: VerificationRequest[]
  ): Promise<VerificationRequest[]> {
    const checked = await Promise.all(
      requests.map(async (request) => ({
        request,
        exists: await this.hasExistingUser(request),
      }))
    );
    return checked.filter((item) => item.exists).map((item) => item.request);
  }

  // ── New: fetch request ID while user is still authenticated (used during login) ──
  async getLatestRequestIdByUserUid(userUid: string): Promise<string | null> {
    try {
      const q        = query(this.verificationCollection, where('userUid', '==', userUid));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const requests = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<VerificationRequest, 'id'>),
      })) as VerificationRequest[];

      const sorted = this.sortLatestFirst(requests);
      return sorted[0].id ?? null;
    } catch {
      return null;
    }
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
            let requests: VerificationRequest[] = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<VerificationRequest, 'id'>),
            }));

            if (!requests.length && normalizedEmail) {
              const emailQuery    = query(this.verificationCollection, where('email', '==', normalizedEmail));
              const emailSnapshot = await getDocs(emailQuery);
              requests = emailSnapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<VerificationRequest, 'id'>),
              }));
            }

            if (!requests.length) { observer.next(null); return; }

            const existingRequests = await this.filterRequestsWithExistingUsers(requests);
            if (!existingRequests.length) { observer.next(null); return; }

            observer.next(this.sortLatestFirst(existingRequests)[0]);
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

  getLatestVerificationRequestByEmail(email: string): Observable<VerificationRequest | null> {
    return new Observable((observer) => {
      const normalizedEmail = email.trim().toLowerCase();

      const emailQuery = query(
        this.verificationCollection,
        where('email', '==', normalizedEmail)
      );

      const unsubscribe = onSnapshot(
        emailQuery,
        async (snapshot) => {
          try {
            if (!snapshot.empty) {
              const requests: VerificationRequest[] = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...(docSnap.data() as Omit<VerificationRequest, 'id'>),
              }));

              const existingRequests = await this.filterRequestsWithExistingUsers(requests);
              if (!existingRequests.length) { observer.next(null); return; }

              observer.next(this.sortLatestFirst(existingRequests)[0]);
            } else {
              observer.next(null);
            }
          } catch (error) {
            console.error('Firestore error latest request by email:', error);
            observer.error(error);
          }
        },
        (error) => {
          console.error('Firestore snapshot error latest request by email:', error);
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
        async (snapshot) => {
          try {
            const requests: VerificationRequest[] = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<VerificationRequest, 'id'>),
            }));

            const existingRequests = await this.filterRequestsWithExistingUsers(requests);
            observer.next(this.sortLatestFirst(existingRequests));
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
    alumniId?: string;
    fullName: string;
    email: string;
    program?: string;
    yearGraduated?: number | string;
    studentId?: string;
    contactNumber?: string;
    contactCountry?: string;
    contactDialCode?: string;
    birthDate?: string;
    sex?: string;
    verificationDocuments?: any[];
  }): Promise<void> {
    await addDoc(this.verificationCollection, {
      userUid:               data.userUid,
      alumniId:              '',
      campus:                this.alumniIdService.campus,
      fullName:              data.fullName,
      email:                 data.email.trim().toLowerCase(),
      program:               data.program              || '',
      yearGraduated:         data.yearGraduated        || '',
      studentId:             data.studentId            || '',
      contactNumber:         data.contactNumber        || '',
      contactCountry:        data.contactCountry       || '',
      contactDialCode:       data.contactDialCode      || '',
      birthDate:             data.birthDate            || '',
      sex:                   data.sex                  || '',
      verificationDocuments: data.verificationDocuments || [],
      submittedDocuments:    [],
      status:                'pending',
      remarks:               '',
      isResubmission:        false,
      submittedAt:           serverTimestamp(),
      reviewedAt:            null,
      reviewedBy:            '',
      updatedAt:             serverTimestamp(),
    });

    if (data.userUid) {
      const userRef = doc(db, 'users', data.userUid);
      await updateDoc(userRef, {
        status:             'pending',
        verificationStatus: 'pending',
        isVerified:         false,
        isActive:           false,
        campus:             this.alumniIdService.campus,
        updatedAt:          serverTimestamp(),
      });
    }
  }

  // ── Appeal resubmit: takes requestId directly — no query needed ──
  async resubmitAppeal(
    userUid: string,
    requestId: string,
    data: {
      fullName:        string;
      firstName:       string;
      middleName?:     string;
      lastName:        string;
      suffix?:         string;
      contactNumber:   string;
      contactCountry:  string;
      contactDialCode: string;
      studentId:       string;
      program:         string;
      yearGraduated:   number;
      birthDate:       string;
      sex:             string;
      verificationDocuments: any[];
    }
  ): Promise<void> {
    const requestRef = doc(db, 'verification_requests', requestId);
    const userRef    = doc(db, 'users', userUid);

    await updateDoc(requestRef, {
      status:                'pending',
      remarks:               '',
      isResubmission:        true,
      fullName:              data.fullName,
      contactNumber:         data.contactNumber,
      contactCountry:        data.contactCountry,
      contactDialCode:       data.contactDialCode,
      studentId:             data.studentId,
      program:               data.program,
      yearGraduated:         data.yearGraduated,
      birthDate:             data.birthDate,
      sex:                   data.sex,
      verificationDocuments: data.verificationDocuments,
      submittedAt:           serverTimestamp(),
      reviewedAt:            null,
      reviewedBy:            '',
      updatedAt:             serverTimestamp(),
    });

    await updateDoc(userRef, {
      status:             'pending',
      verificationStatus: 'pending',
      isVerified:         false,
      isActive:           false,
      remarks:            '',
      firstName:          data.firstName,
      middleName:         data.middleName  || '',
      lastName:           data.lastName,
      suffix:             data.suffix      || '',
      fullName:           data.fullName,
      contactNumber:      data.contactNumber,
      contactCountry:     data.contactCountry,
      contactDialCode:    data.contactDialCode,
      studentId:          data.studentId,
      program:            data.program,
      yearGraduated:      data.yearGraduated,
      birthDate:          data.birthDate,
      sex:                data.sex,
      updatedAt:          serverTimestamp(),
    });
  }

  async updateStatus(
    requestId: string,
    status: 'approved' | 'rejected' | 'under_review' | 'pending'
  ): Promise<void> {
    try {
      const requestRef = doc(db, 'verification_requests', requestId);
      await updateDoc(requestRef, { status, updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Error updating verification status:', error);
      throw error;
    }
  }

  async markAsUnderReview(requestId: string, reviewedBy: string): Promise<void> {
    const requestRef = doc(db, 'verification_requests', requestId);

    await updateDoc(requestRef, {
      status:     'under_review',
      reviewedBy,
      reviewedAt: serverTimestamp(),
      updatedAt:  serverTimestamp(),
    });

    const requestSnap = await getDoc(requestRef);

    if (requestSnap.exists()) {
      const requestData = requestSnap.data() as VerificationRequest;

      if (requestData.userUid) {
        const userRef = doc(db, 'users', requestData.userUid);
        await updateDoc(userRef, {
          status:             'under_review',
          verificationStatus: 'under_review',
          isVerified:         false,
          isActive:           false,
          updatedAt:          serverTimestamp(),
        });
      }
    }
  }

  async approveRequest(
    requestId: string,
    reviewedBy: string,
    remarks: string = ''
  ): Promise<string> {
    const requestRef = doc(db, 'verification_requests', requestId);
    const counterRef = doc(db, 'systemCounters', 'alumniId');

    let generatedAlumniId = '';

    await runTransaction(db, async (transaction) => {
      const requestSnap = await transaction.get(requestRef);
      if (!requestSnap.exists()) throw new Error('Verification request not found.');

      const requestData = requestSnap.data() as VerificationRequest;
      if (!requestData.userUid) throw new Error('Verification request is missing user UID.');

      const userRef  = doc(db, 'users', requestData.userUid);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('User record for this verification request no longer exists.');

      const userData = userSnap.data() as User;

      const existingUserAlumniId    = userData?.alumniId?.trim()   || '';
      const existingRequestAlumniId = requestData.alumniId?.trim() || '';
      const hasValidExistingAlumniId =
        this.alumniIdService.isValidAlumniId(existingUserAlumniId) ||
        this.alumniIdService.isValidAlumniId(existingRequestAlumniId);

      let alumniId           = '';
      let alumniIdIssuedYear = new Date().getFullYear();
      let alumniIdSequence   = 0;

      if (hasValidExistingAlumniId) {
        alumniId = this.alumniIdService.isValidAlumniId(existingUserAlumniId)
          ? existingUserAlumniId
          : existingRequestAlumniId;

        alumniIdIssuedYear = userData?.alumniIdIssuedYear || requestData.alumniIdIssuedYear || alumniIdIssuedYear;
        alumniIdSequence   = userData?.alumniIdSequence   || requestData.alumniIdSequence   || 0;
      } else {
        const currentYear = new Date().getFullYear();
        const counterSnap = await transaction.get(counterRef);
        const counterData = counterSnap.exists() ? counterSnap.data() : null;
        const counterYear = Number(counterData?.['year'] || currentYear);
        const lastNumber  = counterYear === currentYear ? Number(counterData?.['lastNumber'] || 0) : 0;

        alumniIdIssuedYear = currentYear;
        alumniIdSequence   = lastNumber + 1;
        alumniId           = this.alumniIdService.buildAlumniId(alumniIdIssuedYear, alumniIdSequence);

        transaction.set(
          counterRef,
          {
            year:       alumniIdIssuedYear,
            lastNumber: alumniIdSequence,
            campus:     this.alumniIdService.campus,
            prefix:     this.alumniIdService.prefix,
            updatedAt:  serverTimestamp(),
          },
          { merge: true }
        );
      }

      generatedAlumniId = alumniId;

      transaction.update(requestRef, {
        status:           'approved',
        alumniId,
        alumniIdIssuedAt: serverTimestamp(),
        alumniIdIssuedYear,
        alumniIdSequence,
        campus:           this.alumniIdService.campus,
        reviewedBy,
        reviewedAt:       serverTimestamp(),
        remarks,
        updatedAt:        serverTimestamp(),
      });

      transaction.set(
        userRef,
        {
          status:             'verified',
          verificationStatus: 'verified',
          isVerified:         true,
          isActive:           true,
          role:               'alumni',
          alumniId,
          alumniIdIssuedAt:   serverTimestamp(),
          alumniIdIssuedYear,
          alumniIdSequence,
          campus:             this.alumniIdService.campus,
          updatedAt:          serverTimestamp(),
        },
        { merge: true }
      );
    });

    return generatedAlumniId;
  }

  async rejectRequest(
    requestId: string,
    reviewedBy: string,
    remarks: string
  ): Promise<void> {
    const requestRef  = doc(db, 'verification_requests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) throw new Error('Verification request not found.');

    const requestData = requestSnap.data() as VerificationRequest;

    await updateDoc(requestRef, {
      status:     'rejected',
      reviewedBy,
      reviewedAt: serverTimestamp(),
      remarks,
      updatedAt:  serverTimestamp(),
    });

    if (requestData.userUid) {
      const userRef  = doc(db, 'users', requestData.userUid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        await updateDoc(userRef, {
          status:             'rejected',
          verificationStatus: 'rejected',
          remarks,
          isVerified:         false,
          isActive:           false,
          updatedAt:          serverTimestamp(),
        });
      }
    }
  }
}