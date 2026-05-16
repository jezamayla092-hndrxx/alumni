import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
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
  photoUrl?: string;
  role?: string;
  createdAt?: any;
  updatedAt?: any;
}

@Injectable({
  providedIn: 'root',
})
export class SupportService {
  private supportTicketsCollection = collection(db, 'supportTickets');
  private usersCollection = collection(db, 'users');

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

  async getSupportTickets(): Promise<SupportTicket[]> {
    const ticketsQuery = query(
      this.supportTicketsCollection,
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(ticketsQuery);

    const tickets = snapshot.docs.map((ticketDoc) => {
      const data = ticketDoc.data() as Omit<SupportTicket, 'id'>;

      return {
        id: ticketDoc.id,
        ...data,
      };
    });

    return Promise.all(
      tickets.map((ticket) => this.attachUserProfile(ticket))
    );
  }

  async updateSupportTicketStatus(
    ticketId: string,
    status: SupportTicketStatus
  ): Promise<void> {
    if (!ticketId) {
      throw new Error('Support ticket ID is required.');
    }

    const ticketRef = doc(db, 'supportTickets', ticketId);

    await updateDoc(ticketRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  async getUserBasicInfo(uid: string): Promise<Partial<SupportTicket> | null> {
    if (!uid) return null;

    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) return null;

    const user: any = snapshot.data();

    const fullName = this.buildFullName(user);

    return {
      userUid: uid,
      fullName: fullName || '',
      email: user.email || '',
      studentId: user.studentId || '',
      alumniId: user.alumniId || '',
      photoUrl: this.getUserPhotoUrl(user),
      role: user.role || '',
      disabledReason: user.disabledReason || '',
      accountIssue: user.isActive === false ? 'Disabled Account' : '',
    };
  }

  private async attachUserProfile(ticket: SupportTicket): Promise<SupportTicket> {
    try {
      const user = await this.findRelatedUser(ticket);

      if (!user) {
        return ticket;
      }

      return {
        ...ticket,
        fullName: ticket.fullName || this.buildFullName(user),
        email: ticket.email || user.email || '',
        studentId: ticket.studentId || user.studentId || '',
        alumniId: ticket.alumniId || user.alumniId || '',
        userUid: ticket.userUid || user.id || '',
        photoUrl: this.getUserPhotoUrl(user),
        role: user.role || ticket.role || '',
      };
    } catch (error) {
      console.error('Failed to attach support ticket user profile:', error);
      return ticket;
    }
  }

  private async findRelatedUser(ticket: SupportTicket): Promise<any | null> {
    const uid = (ticket.userUid || '').trim();

    if (uid) {
      const userRef = doc(db, 'users', uid);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data(),
        };
      }
    }

    const email = (ticket.email || '').trim().toLowerCase();

    if (!email) return null;

    const userQuery = query(
      this.usersCollection,
      where('email', '==', email),
      limit(1)
    );

    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) return null;

    const userDoc = userSnapshot.docs[0];

    return {
      id: userDoc.id,
      ...userDoc.data(),
    };
  }

  private buildFullName(user: any): string {
    return (
      user.fullName ||
      [
        user.firstName,
        user.middleName ? `${user.middleName.charAt(0).toUpperCase()}.` : '',
        user.lastName,
        user.suffix,
      ]
        .filter(Boolean)
        .join(' ')
        .trim()
    );
  }

  private getUserPhotoUrl(user: any): string {
    return (
      user.photoUrl ||
      user.photoURL ||
      user.profilePhotoUrl ||
      user.profilePictureUrl ||
      user.imageUrl ||
      ''
    ).trim();
  }
}