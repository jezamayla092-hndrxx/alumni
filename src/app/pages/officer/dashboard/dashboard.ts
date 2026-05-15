import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';

import { db } from '../../../firebase.config';
import { VerificationService } from '../../../services/verification.service';
import { VerificationRequest } from '../../../models/verification.model';

type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

interface SummaryCard {
  title: string;
  value: string;
  icon: string;
  iconClass: string;
}

interface VerificationPreview {
  id: string;
  name: string;
  program: string;
  year: number | string;
  status: VerificationStatus;
}

interface RawRecord {
  id?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit, OnDestroy {
  private unsubscribers: Unsubscribe[] = [];
  private verificationRequestsSub?: Subscription;

  pendingVerifications = 0;
  totalAlumni = 0;
  activeJobPosts = 0;
  upcomingEvents = 0;

  loadingVerifications = false;

  verificationRequests: VerificationPreview[] = [];

  private allJobs: RawRecord[] = [];
  private allEvents: RawRecord[] = [];

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private verificationService: VerificationService
  ) {}

  get summaryCards(): SummaryCard[] {
    return [
      {
        title: 'Alumni Verification Queue',
        value: String(this.pendingVerifications),
        icon: 'ti ti-shield',
        iconClass: 'icon-violet',
      },
      {
        title: 'Registered Alumni',
        value: String(this.totalAlumni),
        icon: 'ti ti-users',
        iconClass: 'icon-purple',
      },
      {
        title: 'Career Opportunities',
        value: String(this.activeJobPosts),
        icon: 'ti ti-briefcase',
        iconClass: 'icon-amber',
      },
      {
        title: 'Alumni Events',
        value: String(this.upcomingEvents),
        icon: 'ti ti-calendar',
        iconClass: 'icon-blue',
      },
    ];
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.verificationRequestsSub?.unsubscribe();
    this.verificationRequestsSub = undefined;

    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }

  private loadDashboardData(): void {
    this.loadingVerifications = true;

    this.listenToVerificationRequests();
    this.listenToUsers();
    this.listenToJobPostings();
    this.listenToEvents();
  }

  private listenToVerificationRequests(): void {
    this.loadingVerifications = true;
    this.verificationRequestsSub?.unsubscribe();

    this.verificationRequestsSub = this.verificationService
      .getAllVerificationRequests()
      .subscribe({
        next: (requests) => {
          this.zone.run(() => {
            const normalizedRequests = this.getLatestUniqueVerificationRequests(
              requests || []
            );

            const pendingQueue = normalizedRequests.filter((request) => {
              return request['_statusKey'] === 'pending';
            });

            this.pendingVerifications = pendingQueue.length;

            this.verificationRequests = normalizedRequests
              .slice(0, 6)
              .map((request, index) => ({
                id: request['id'] || `VR-${index + 1}`,
                name: this.getRequestName(request),
                program: request['program'] || 'Not specified',
                year: request['yearGraduated'] || request['batch'] || '—',
                status: this.normalizeVerificationStatus(request['status']),
              }));

            this.loadingVerifications = false;
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          this.zone.run(() => {
            console.error('Error loading verification requests:', error);

            this.pendingVerifications = 0;
            this.verificationRequests = [];
            this.loadingVerifications = false;

            this.cdr.detectChanges();
          });
        },
      });
  }

  private listenToUsers(): void {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        this.zone.run(() => {
          const users: RawRecord[] = snapshot.docs.map((docItem) => {
            const data = docItem.data() as RawRecord;

            return {
              id: docItem.id,
              ...data,
            };
          });

          const alumniUsers = users.filter((user) => {
            const role = String(user['role'] || '').toLowerCase().trim();
            return role === 'alumni';
          });

          this.totalAlumni = alumniUsers.filter((user) => {
            const status = this.normalizeStatusValue(
              user['verificationStatus'] || user['status']
            );

            const isVerified =
              user['isVerified'] === true ||
              status === 'verified' ||
              status === 'approved';

            return isVerified && status !== 'rejected' && user['isActive'] !== false;
          }).length;

          this.cdr.detectChanges();
        });
      },
      (error) => {
        this.zone.run(() => {
          console.error('Error loading users:', error);

          this.totalAlumni = 0;
          this.cdr.detectChanges();
        });
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  private listenToJobPostings(): void {
    const unsubscribe = onSnapshot(
      collection(db, 'jobPostings'),
      (snapshot) => {
        this.zone.run(() => {
          this.allJobs = snapshot.docs.map((docItem) => {
            const data = docItem.data() as RawRecord;

            return {
              id: docItem.id,
              ...data,
            };
          });

          this.activeJobPosts = this.allJobs.filter((job) => {
            const status = this.normalizeStatusValue(job['status']);
            return status === 'active';
          }).length;

          this.cdr.detectChanges();
        });
      },
      (error) => {
        this.zone.run(() => {
          console.error('Error loading job postings:', error);

          this.allJobs = [];
          this.activeJobPosts = 0;

          this.cdr.detectChanges();
        });
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  private listenToEvents(): void {
    const unsubscribe = onSnapshot(
      collection(db, 'events'),
      (snapshot) => {
        this.zone.run(() => {
          this.allEvents = snapshot.docs.map((docItem) => {
            const data = docItem.data() as RawRecord;

            return {
              id: docItem.id,
              ...data,
            };
          });

          this.upcomingEvents = this.allEvents.filter((event) => {
            const status = this.normalizeStatusValue(event['status']);

            if (
              status === 'cancelled' ||
              status === 'canceled' ||
              status === 'archived' ||
              status === 'completed'
            ) {
              return false;
            }

            const rawDate = event['eventDate'] || event['date'] || event['startDate'];
            const eventTime = this.getDateValue(rawDate);

            if (!eventTime) return false;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            return eventTime >= today.getTime();
          }).length;

          this.cdr.detectChanges();
        });
      },
      (error) => {
        this.zone.run(() => {
          console.error('Error loading events:', error);

          this.allEvents = [];
          this.upcomingEvents = 0;

          this.cdr.detectChanges();
        });
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  private getLatestUniqueVerificationRequests(
    requests: VerificationRequest[]
  ): RawRecord[] {
    const latestByApplicant = new Map<string, RawRecord>();

    requests.forEach((request, index) => {
      const statusKey = this.normalizeStatusValue(request.status);

      const normalizedRequest: RawRecord = {
        ...request,
        id: request.id || `verification-${index}`,
        _statusKey: statusKey,
        status: this.normalizeVerificationStatus(statusKey),
      };

      const key = this.getVerificationApplicantKey(normalizedRequest);
      const existingRequest = latestByApplicant.get(key);

      if (
        !existingRequest ||
        this.getVerificationRecordTime(normalizedRequest) >=
          this.getVerificationRecordTime(existingRequest)
      ) {
        latestByApplicant.set(key, normalizedRequest);
      }
    });

    return Array.from(latestByApplicant.values()).sort(
      (a, b) => this.getVerificationRecordTime(b) - this.getVerificationRecordTime(a)
    );
  }

  private getVerificationApplicantKey(request: RawRecord): string {
    const userUid = String(request['userUid'] || '').toLowerCase().trim();
    if (userUid) return `uid:${userUid}`;

    const email = String(request['email'] || '').toLowerCase().trim();
    if (email) return `email:${email}`;

    const studentId = String(request['studentId'] || '').toLowerCase().trim();
    if (studentId) return `student:${studentId}`;

    const fullName = String(request['fullName'] || request['name'] || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    if (fullName) return `name:${fullName}`;

    return `doc:${request['id'] || crypto.randomUUID()}`;
  }

  private getVerificationRecordTime(request: RawRecord): number {
    return Math.max(
      this.getDateValue(request['updatedAt']),
      this.getDateValue(request['reviewedAt']),
      this.getDateValue(request['submittedAt']),
      this.getDateValue(request['createdAt'])
    );
  }

  private getRequestName(request: RawRecord): string {
    const fullName =
      request['fullName'] ||
      request['name'] ||
      [
        request['firstName'],
        request['middleName']
          ? `${String(request['middleName']).charAt(0).toUpperCase()}.`
          : '',
        request['lastName'],
        request['suffix'],
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

    return fullName || request['email'] || 'Unknown Alumni';
  }

  private normalizeStatusValue(status: any): string {
    return String(status || '')
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
      .trim();
  }

  private normalizeVerificationStatus(status: any): VerificationStatus {
    const raw = this.normalizeStatusValue(status);

    if (raw === 'approved' || raw === 'verified') return 'approved';
    if (raw === 'rejected') return 'rejected';
    if (raw === 'under_review') return 'under_review';
    if (raw === 'pending') return 'pending';

    return 'pending';
  }

  private getDateValue(value: any): number {
    if (!value) return 0;

    const rawValue = this.getRawDateValue(value);
    const date = new Date(rawValue);

    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  private getRawDateValue(value: any): any {
    if (!value) return null;

    if (typeof value?.toDate === 'function') {
      return value.toDate();
    }

    if (typeof value?.seconds === 'number') {
      return value.seconds * 1000;
    }

    return value;
  }

  getVerificationStatusLabel(status: VerificationStatus): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'under_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }

  goToVerificationRequests(): void {
    this.router.navigate(['/officer/verification-requests']);
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  trackByIndex(index: number): number {
    return index;
  }
}