import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import {
  doc,
  setDoc,
  collection,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  Unsubscribe,
  orderBy,
} from 'firebase/firestore';

import { db, auth } from '../firebase.config';
import { User, UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private usersCollection = collection(db, 'users');

  constructor(private ngZone: NgZone) {}

  async createUser(uid: string, userData: User): Promise<void> {
    const userRef = doc(db, 'users', uid);

    const now = new Date().toISOString();

    await setDoc(userRef, {
      ...userData,
      role: userData.role || 'alumni',
      isVerified: userData.isVerified ?? false,
      isActive: userData.isActive ?? true,
      accountStatus: userData.isActive === false ? 'disabled' : 'active',

      disabledReason: null,
      disabledAt: null,
      disabledBy: null,
      disabledByName: null,

      reactivatedAt: null,
      reactivatedBy: null,
      reactivatedByName: null,

      campus: userData.campus || 'USTP Villanueva Campus',
      createdAt: userData.createdAt || now,
      updatedAt: userData.updatedAt || now,
    });
  }

  async getUserById(uid: string): Promise<User | null> {
    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...(snapshot.data() as User),
      };
    }

    return null;
  }

  getUsersRealTime(): Observable<User[]> {
    return new Observable((observer) => {
      const q = query(this.usersCollection, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const users = snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...(docItem.data() as User),
          }));

          this.ngZone.run(() => observer.next(users));
        },
        (error) => {
          this.ngZone.run(() => observer.error(error));
        }
      );

      return () => unsubscribe();
    });
  }

  getAlumniCountRealTime(callback: (count: number) => void): Unsubscribe {
    const alumniQuery = query(
      this.usersCollection,
      where('role', '==', 'alumni'),
      where('isVerified', '==', true)
    );

    return onSnapshot(
      alumniQuery,
      (snapshot) => {
        this.ngZone.run(() => {
          callback(snapshot.size);
        });
      },
      (error) => {
        console.error('Error getting alumni count:', error);
        this.ngZone.run(() => {
          callback(0);
        });
      }
    );
  }

  getAlumniCountThisMonthRealTime(callback: (count: number) => void): Unsubscribe {
    const alumniQuery = query(
      this.usersCollection,
      where('role', '==', 'alumni'),
      where('isVerified', '==', true)
    );

    return onSnapshot(
      alumniQuery,
      (snapshot) => {
        const currentDate = new Date();

        const filtered = snapshot.docs.filter((docItem) => {
          const data = docItem.data();

          if (!data['createdAt']) return false;

          const createdDate = new Date(data['createdAt']);

          return (
            createdDate.getMonth() === currentDate.getMonth() &&
            createdDate.getFullYear() === currentDate.getFullYear()
          );
        });

        this.ngZone.run(() => {
          callback(filtered.length);
        });
      },
      (error) => {
        console.error('Error getting monthly alumni count:', error);
        this.ngZone.run(() => {
          callback(0);
        });
      }
    );
  }

  async getAllUsers(): Promise<User[]> {
    const snapshot = await getDocs(this.usersCollection);

    return snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as User),
    }));
  }

  async getAlumniUsers(): Promise<User[]> {
    console.log('Current auth user:', auth.currentUser?.uid);

    const alumniQuery = query(
      this.usersCollection,
      where('role', '==', 'alumni'),
      where('isVerified', '==', true)
    );

    const snapshot = await getDocs(alumniQuery);

    return snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as User),
    }));
  }

  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }

  async updateUserRole(uid: string, role: UserRole): Promise<void> {
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      role,
      updatedAt: new Date().toISOString(),
    });
  }

  async updateUserActiveStatus(
    uid: string,
    isActive: boolean,
    reason: string = '',
    actorUid: string = '',
    actorName: string = 'Administrator'
  ): Promise<void> {
    const userRef = doc(db, 'users', uid);
    const now = new Date().toISOString();

    const payload: Record<string, any> = {
      isActive,
      accountStatus: isActive ? 'active' : 'disabled',
      updatedAt: now,
    };

    if (isActive) {
      payload['reactivatedAt'] = now;
      payload['reactivatedBy'] = actorUid || '';
      payload['reactivatedByName'] = actorName || 'Administrator';

      payload['disabledReason'] = null;
      payload['disabledAt'] = null;
      payload['disabledBy'] = null;
      payload['disabledByName'] = null;
    } else {
      const cleanedReason = reason.trim();

      if (!cleanedReason) {
        throw new Error('A disable reason is required.');
      }

      payload['disabledReason'] = cleanedReason;
      payload['disabledAt'] = now;
      payload['disabledBy'] = actorUid || '';
      payload['disabledByName'] = actorName || 'Administrator';

      payload['reactivatedAt'] = null;
      payload['reactivatedBy'] = null;
      payload['reactivatedByName'] = null;
    }

    await updateDoc(userRef, payload);
  }

  async activateUser(
    uid: string,
    actorUid: string = '',
    actorName: string = 'Administrator'
  ): Promise<void> {
    await this.updateUserActiveStatus(uid, true, '', actorUid, actorName);
  }

  async disableUser(
    uid: string,
    reason: string = '',
    actorUid: string = '',
    actorName: string = 'Administrator'
  ): Promise<void> {
    await this.updateUserActiveStatus(uid, false, reason, actorUid, actorName);
  }
}