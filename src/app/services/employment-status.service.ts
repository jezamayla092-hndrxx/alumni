import { Injectable } from '@angular/core';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import {
  EmploymentStatusData,
} from '../models/employment-status.model';

@Injectable({ providedIn: 'root' })
export class EmploymentStatusService {
  private readonly db        = getFirestore();
  private readonly COLLECTION = 'employmentStatus';

  /**
   * Fetch the employment status record for a given alumni UID.
   * Returns null if no record exists yet.
   */
  async getByUid(uid: string): Promise<EmploymentStatusData | null> {
    const ref  = doc(this.db, this.COLLECTION, uid);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as EmploymentStatusData) : null;
  }

  /**
   * Create or fully overwrite the employment status record for a given UID.
   * Uses merge so fields not included are left untouched (safe upsert).
   */
  async save(uid: string, data: EmploymentStatusData): Promise<void> {
    const ref = doc(this.db, this.COLLECTION, uid);
    await setDoc(ref, { ...data, alumniUid: uid }, { merge: true });
  }
}