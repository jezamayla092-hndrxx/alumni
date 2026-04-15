import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  docData,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, from, of, switchMap } from 'rxjs';
import {
  EmploymentDetails,
  EmploymentStatus,
  User,
} from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class EmploymentStatusService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  getCurrentUserEmployment(): Observable<User | null> {
    return authState(this.auth).pipe(
      switchMap((currentUser) => {
        console.log('[EmploymentService] authState user on load:', currentUser);

        if (!currentUser || !currentUser.email) {
          return of(null);
        }

        const usersRef = collection(this.firestore, 'users');
        const userQuery = query(
          usersRef,
          where('email', '==', currentUser.email),
          limit(1)
        );

        return from(getDocs(userQuery)).pipe(
          switchMap((snapshot) => {
            if (snapshot.empty) {
              console.warn(
                '[EmploymentService] No matching user doc found for email:',
                currentUser.email
              );
              return of(null);
            }

            const userDoc = snapshot.docs[0];
            console.log('[EmploymentService] reading actual doc id:', userDoc.id);

            const userRef = doc(this.firestore, `users/${userDoc.id}`);
            return docData(userRef, { idField: 'id' }) as Observable<User | null>;
          })
        );
      })
    );
  }

  async saveEmployment(
    employmentStatus: EmploymentStatus,
    employmentDetails: EmploymentDetails
  ): Promise<void> {
    const currentUser = this.auth.currentUser;

    console.log('[EmploymentService] currentUser on save:', currentUser);

    if (!currentUser || !currentUser.email) {
      throw new Error('No authenticated user email found.');
    }

    const usersRef = collection(this.firestore, 'users');
    const userQuery = query(
      usersRef,
      where('email', '==', currentUser.email),
      limit(1)
    );

    const snapshot = await getDocs(userQuery);

    if (snapshot.empty) {
      throw new Error(
        `No Firestore user document found for email: ${currentUser.email}`
      );
    }

    const userDoc = snapshot.docs[0];
    const docPath = `users/${userDoc.id}`;
    const userRef = doc(this.firestore, docPath);

    const payload = {
      employmentStatus,
      employmentDetails: {
        ...employmentDetails,
        updatedAt: serverTimestamp(),
      },
    };

    console.log('[EmploymentService] writing to:', docPath);
    console.log('[EmploymentService] payload:', payload);

    await setDoc(userRef, payload, { merge: true });

    console.log('[EmploymentService] save successful');
  }
}