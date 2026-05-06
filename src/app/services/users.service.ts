import { Injectable } from '@angular/core';
import { doc, setDoc, collection, getDocs, getDoc, query, where, onSnapshot, updateDoc } from 'firebase/firestore'; 
import { db } from '../firebase.config';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private usersCollection = collection(db, 'users');

  // Create user in the database
  async createUser(uid: string, userData: User): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, userData); // Save user data in Firestore
  }

  // Get user by UID
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

  // Get total alumni count in real-time
  getAlumniCountRealTime(callback: (count: number) => void): void {
    const alumniQuery = query(
      this.usersCollection,
      where('role', '==', 'alumni'),
      where('isVerified', '==', true)
    );

    onSnapshot(alumniQuery, (snapshot) => {
      callback(snapshot.size);  // Pass real-time count to the callback
    });
  }

  // Get alumni count for this month
  getAlumniCountThisMonthRealTime(callback: (count: number) => void): void {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const alumniQuery = query(
      this.usersCollection,
      where('role', '==', 'alumni'),
      where('isVerified', '==', true),
      where('createdAt', '>=', startOfMonth),
      where('createdAt', '<=', endOfMonth)
    );

    onSnapshot(alumniQuery, (snapshot) => {
      callback(snapshot.size);  // Pass real-time alumni count for this month
    });
  }

  // Fetch all users
  async getAllUsers(): Promise<User[]> {
    const snapshot = await getDocs(this.usersCollection);
    return snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as User),
    }));
  }

  // Get all alumni users
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

  // Update user data
  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);  // Update user data in Firestore
  }
}