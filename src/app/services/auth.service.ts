import { Injectable } from '@angular/core';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
  UserCredential,
} from 'firebase/auth';
import { auth } from '../firebase.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  async login(email: string, password: string): Promise<UserCredential> {
    return await signInWithEmailAndPassword(auth, email, password);
  }

  async signup(email: string, password: string): Promise<UserCredential> {
    return await createUserWithEmailAndPassword(auth, email, password);
  }

  async deleteCurrentAuthUser(): Promise<void> {
    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
    }
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  getCurrentUser() {
    return auth.currentUser;
  }

  getCurrentUid(): string | null {
    return auth.currentUser?.uid ?? null;
  }
}