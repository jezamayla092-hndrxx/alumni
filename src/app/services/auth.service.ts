import { Injectable, NgZone } from '@angular/core';
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

import { BehaviorSubject } from 'rxjs';
import { auth } from '../firebase.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly currentUserSubject = new BehaviorSubject<FirebaseUser | null>(null);
  private readonly authReadySubject = new BehaviorSubject<boolean>(false);

  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly authReady$ = this.authReadySubject.asObservable();

  constructor(private zone: NgZone) {
    onAuthStateChanged(auth, (user) => {
      this.zone.run(() => {
        this.currentUserSubject.next(user);
        this.authReadySubject.next(true);
      });
    });
  }

  async waitForAuthReady(): Promise<FirebaseUser | null> {
    if (this.authReadySubject.value) {
      return this.currentUserSubject.value;
    }

    return new Promise((resolve) => {
      const sub = this.authReady$.subscribe((ready) => {
        if (ready) {
          sub.unsubscribe();
          resolve(this.currentUserSubject.value);
        }
      });
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
    return this.currentUserSubject.value || auth.currentUser;
  }

  getCurrentUid(): string | null {
    return this.getCurrentUser()?.uid ?? null;
  }

  async getAuthState(): Promise<FirebaseUser | null> {
    return this.waitForAuthReady();
  }

  get isAuthReady(): boolean {
    return this.authReadySubject.value;
  }
}