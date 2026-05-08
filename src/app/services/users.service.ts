import { Injectable } from '@angular/core';
import {
  doc,
  setDoc,
  collection,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  updateDoc
} from 'firebase/firestore';

import { db } from '../firebase.config';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersService {

  private usersCollection = collection(db, 'users');

  // ==============================
  // CREATE USER
  // ==============================
  async createUser(uid: string, userData: User): Promise<void> {

    const userRef = doc(db, 'users', uid);

    await setDoc(userRef, {
      ...userData,

      role: userData.role || 'user',
      isVerified: userData.isVerified ?? false,

      createdAt: new Date().toISOString(),
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

  getAlumniCountRealTime(
    callback: (count: number) => void
  ): void {

    const alumniQuery = query(
      this.usersCollection,
      where('role', '==', 'alumni'),
      where('isVerified', '==', true)
    );

    onSnapshot(
      alumniQuery,
      (snapshot) => {

        callback(snapshot.size);

      },
      (error) => {

        console.error('Error getting alumni count:', error);

        callback(0);
      }
    );
  }

  getAlumniCountThisMonthRealTime(
    callback: (count: number) => void
  ): void {

    const alumniQuery = query(
      this.usersCollection,
      where('role', '==', 'alumni'),
      where('isVerified', '==', true)
    );

    onSnapshot(
      alumniQuery,
      (snapshot) => {

        const currentDate = new Date();

        const filtered = snapshot.docs.filter((docItem) => {

          const data = docItem.data();

          if (!data['createdAt']) {
            return false;
          }

          const createdDate = new Date(data['createdAt']);

          return (
            createdDate.getMonth() === currentDate.getMonth() &&
            createdDate.getFullYear() === currentDate.getFullYear()
          );

        });

        callback(filtered.length);

      },
      (error) => {

        console.error('Error getting monthly alumni count:', error);

        callback(0);
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

  async updateUser(
    uid: string,
    data: Partial<User>
  ): Promise<void> {

    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, data);
  }
}