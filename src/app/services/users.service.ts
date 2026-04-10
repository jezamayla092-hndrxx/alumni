import { Injectable } from '@angular/core';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private usersCollection = collection(db, 'users');

  async createUser(uid: string, userData: User): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, userData);
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

  async getAllUsers(): Promise<User[]> {
    const snapshot = await getDocs(this.usersCollection);
    return snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as User),
    }));
  }

  async getAlumniUsers(): Promise<User[]> {
    const alumniQuery = query(this.usersCollection, where('role', '==', 'alumni'));
    const snapshot = await getDocs(alumniQuery);

    return snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as User),
    }));
  }

  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
  }
}