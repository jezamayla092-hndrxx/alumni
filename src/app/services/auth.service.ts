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
  private readonly currentUserSubject = new BehaviorSubject<FirebaseUser | null>(auth.currentUser);
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
      return this.currentUserSubject.value || auth.currentUser;
    }

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        this.zone.run(() => {
          this.currentUserSubject.next(user);
          this.authReadySubject.next(true);
        });

        unsubscribe();
        resolve(user);
      });
    });
  }

  async login(email: string, password: string): Promise<UserCredential> {
    await setPersistence(auth, browserLocalPersistence);

    const credential = await signInWithEmailAndPassword(auth, email, password);

    this.zone.run(() => {
      this.currentUserSubject.next(credential.user);
      this.authReadySubject.next(true);
    });

    return credential;
  }

  async signup(email: string, password: string): Promise<UserCredential> {
    await setPersistence(auth, browserLocalPersistence);

    const credential = await createUserWithEmailAndPassword(auth, email, password);

    this.zone.run(() => {
      this.currentUserSubject.next(credential.user);
      this.authReadySubject.next(true);
    });

    return credential;
  }

  async deleteCurrentAuthUser(): Promise<void> {
    const currentUser = auth.currentUser;

    if (currentUser) {
      await deleteUser(currentUser);

      this.zone.run(() => {
        this.currentUserSubject.next(null);
      });
    }
  }

  async logout(): Promise<void> {
    await signOut(auth);

    this.zone.run(() => {
      this.currentUserSubject.next(null);
      this.authReadySubject.next(true);
    });
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