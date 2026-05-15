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
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  deleteUser,
} from 'firebase/auth';

import { db, auth } from '../firebase.config';
import { User, UserRole } from '../models/user.model';

export interface CreateOfficerAccountPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  email: string;
  contactNumber?: string;
  password: string;
}

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

      campus: userData.campus || 'USTP Villanueva Campus',
      createdAt: userData.createdAt || now,
      updatedAt: userData.updatedAt || now,
    });
  }

  async createOfficerAccount(payload: CreateOfficerAccountPayload): Promise<User> {
    const firstName = payload.firstName.trim();
    const middleName = (payload.middleName || '').trim();
    const lastName = payload.lastName.trim();
    const suffix = (payload.suffix || '').trim();
    const email = payload.email.trim().toLowerCase();
    const contactNumber = (payload.contactNumber || '').trim();
    const password = payload.password.trim();

    if (!firstName || !lastName || !email || !password) {
      throw new Error('Missing required officer account fields.');
    }

    const fullName = [firstName, middleName, lastName, suffix]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const secondaryAppName = `atms-officer-creator-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

    const secondaryApp = initializeApp(auth.app.options, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    let createdAuthUser: Awaited<
      ReturnType<typeof createUserWithEmailAndPassword>
    >['user'] | null = null;

    try {
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );

      createdAuthUser = credential.user;

      await updateProfile(createdAuthUser, {
        displayName: fullName,
      });

      const now = new Date().toISOString();

      const officerUser: User = {
        id: createdAuthUser.uid,
        firstName,
        middleName,
        lastName,
        suffix,
        fullName,
        email,
        contactNumber,
        role: 'officer',
        isVerified: true,
        isActive: true,
        campus: 'USTP Villanueva Campus',
        createdAt: now,
        updatedAt: now,
      } as User;

      const userRef = doc(db, 'users', createdAuthUser.uid);

      await setDoc(userRef, {
        ...officerUser,
        accountStatus: 'active',
      });

      return officerUser;
    } catch (error) {
      if (createdAuthUser) {
        try {
          await deleteUser(createdAuthUser);
        } catch (cleanupError) {
          console.warn('Officer auth cleanup failed:', cleanupError);
        }
      }

      throw error;
    } finally {
      try {
        await signOut(secondaryAuth);
      } catch {
        // ignore secondary auth sign out errors
      }

      try {
        await deleteApp(secondaryApp);
      } catch {
        // ignore secondary app cleanup errors
      }
    }
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

  async activateUser(
    uid: string,
    actorUid: string = '',
    actorName: string = 'Administrator'
  ): Promise<void> {
    const userRef = doc(db, 'users', uid);
    const now = new Date().toISOString();

    await updateDoc(userRef, {
      isActive: true,
      accountStatus: 'active',
      reactivatedAt: now,
      reactivatedBy: actorUid || '',
      reactivatedByName: actorName || 'Administrator',
      disabledReason: null,
      disabledAt: null,
      disabledBy: null,
      disabledByName: null,
      updatedAt: now,
    });
  }

  async disableUser(
    uid: string,
    reason: string = '',
    actorUid: string = '',
    actorName: string = 'Administrator'
  ): Promise<void> {
    const cleanedReason = reason.trim();

    if (!cleanedReason) {
      throw new Error('A disable reason is required.');
    }

    const userRef = doc(db, 'users', uid);
    const now = new Date().toISOString();

    await updateDoc(userRef, {
      isActive: false,
      accountStatus: 'disabled',
      disabledReason: cleanedReason,
      disabledAt: now,
      disabledBy: actorUid || '',
      disabledByName: actorName || 'Administrator',
      reactivatedAt: null,
      reactivatedBy: null,
      reactivatedByName: null,
      updatedAt: now,
    });
  }

  private getUserDisplayName(user: User | null): string {
    if (!user) return 'User';

    return (
      user.fullName ||
      [
        user.firstName,
        user.middleName ? `${user.middleName.charAt(0).toUpperCase()}.` : '',
        user.lastName,
        user.suffix,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      user.email ||
      'User'
    );
  }
}