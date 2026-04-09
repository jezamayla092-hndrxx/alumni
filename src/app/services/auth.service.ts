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
  UserCredential,
} from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { auth } from '../firebase.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  /**
   * STRUCTURAL FIX:
   * These subjects let the app know whether Firebase has already finished
   * restoring/checking the session after refresh.
   */
  private readonly currentUserSubject =
    new BehaviorSubject<FirebaseUser | null>(null);
  private readonly authReadySubject = new BehaviorSubject<boolean>(false);

  readonly currentUser$: Observable<FirebaseUser | null> =
    this.currentUserSubject.asObservable();

  readonly authReady$: Observable<boolean> = this.authReadySubject.asObservable();

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.currentUserSubject.next(user);
      this.authReadySubject.next(true);
    });
  }

  async login(email: string, password: string): Promise<UserCredential> {
    /**
     * FIX:
     * Explicitly persist session in browser local storage.
     * This helps keep user signed in after refresh/browser restart.
     */
    await setPersistence(auth, browserLocalPersistence);

    return await signInWithEmailAndPassword(auth, email, password);
  }

  async signup(email: string, password: string): Promise<UserCredential> {
    /**
     * FIX:
     * Keep signup session persistent too.
     */
    await setPersistence(auth, browserLocalPersistence);

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

  /**
   * WARNING:
   * Only use this for quick reads after auth is already initialized.
   * Do NOT use this as the main source for route startup checks on refresh.
   */
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  getCurrentUid(): string | null {
    return auth.currentUser?.uid ?? null;
  }

  /**
   * Good for one-time "wait until Firebase finishes restoring session" checks.
   */
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