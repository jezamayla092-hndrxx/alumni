import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../firebase.config';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id?: string;
  fullName: string;
  email: string;
  studentId?: string;
  alumniId?: string;
  userUid?: string;
  concernType: string;
  message: string;
  accountIssue?: string;
  disabledReason?: string;
  status: SupportTicketStatus;
  createdAt?: any;
  updatedAt?: any;
}

@Injectable({
  providedIn: 'root',
})
export class SupportService {
  private supportTicketsCollection = collection(db, 'supportTickets');

  async createSupportTicket(ticket: SupportTicket): Promise<string> {
    const cleanedTicket = {
      fullName: ticket.fullName.trim(),
      email: ticket.email.trim().toLowerCase(),
      studentId: (ticket.studentId || '').trim(),
      alumniId: (ticket.alumniId || '').trim(),
      userUid: (ticket.userUid || '').trim(),
      concernType: ticket.concernType.trim(),
      message: ticket.message.trim(),
      accountIssue: (ticket.accountIssue || '').trim(),
      disabledReason: (ticket.disabledReason || '').trim(),
      status: ticket.status || 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(this.supportTicketsCollection, cleanedTicket);
    return docRef.id;
  }

  async getUserBasicInfo(uid: string): Promise<Partial<SupportTicket> | null> {
    if (!uid) return null;

    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) return null;

    const user: any = snapshot.data();

    const fullName =
      user.fullName ||
      [
        user.firstName,
        user.middleName ? `${user.middleName.charAt(0).toUpperCase()}.` : '',
        user.lastName,
        user.suffix,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

    return {
      userUid: uid,
      fullName: fullName || '',
      email: user.email || '',
      studentId: user.studentId || '',
      alumniId: user.alumniId || '',
      disabledReason: user.disabledReason || '',
      accountIssue: user.isActive === false ? 'Disabled Account' : '',
    };
  }
}