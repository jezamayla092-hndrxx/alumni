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

  async updateUserActiveStatus(uid: string, isActive: boolean): Promise<void> {
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      isActive,
      updatedAt: new Date().toISOString(),
    });
  }

  async activateUser(uid: string): Promise<void> {
    await this.updateUserActiveStatus(uid, true);
  }

  async disableUser(uid: string): Promise<void> {
    await this.updateUserActiveStatus(uid, false);
  }
}