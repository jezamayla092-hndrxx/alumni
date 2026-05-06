import { Injectable } from '@angular/core';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';

import { BehaviorSubject, Observable } from 'rxjs';
import { auth } from '../firebase.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly currentUserSubject = new BehaviorSubject<FirebaseUser | null>(null);
  private readonly authReadySubject = new BehaviorSubject<boolean>(false);

  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly authReady$ = this.authReadySubject.asObservable();

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.currentUserSubject.next(user);
      this.authReadySubject.next(true);
    });
  }

  // ✅ FIXED (no getAuth)
  checkAuthStatus(): void {
    onAuthStateChanged(auth, (user) => {
      this.currentUserSubject.next(user);
      this.authReadySubject.next(true);
    });
  }

  async login(email: string, password: string): Promise<UserCredential> {
    await setPersistence(auth, browserLocalPersistence);
    return signInWithEmailAndPassword(auth, email, password);
  }

  async signup(email: string, password: string): Promise<UserCredential> {
    await setPersistence(auth, browserLocalPersistence);
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async deleteCurrentAuthUser(): Promise<void> {
    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
    }
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  getCurrentUid(): string | null {
    return auth.currentUser?.uid ?? null;
  }

  getAuthState(): Promise<FirebaseUser | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  get isAuthReady(): boolean {
    return this.authReadySubject.value;
  }
}