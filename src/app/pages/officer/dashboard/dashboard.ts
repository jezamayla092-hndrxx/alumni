import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';

import { db } from '../../../firebase.config';

type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';
type ActivityType = 'job' | 'event' | 'announcement' | 'verification';

interface SummaryCard {
  title: string;
  value: string;
  subtitle: string;
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

interface ActivityPreview {
  id: string;
  type: ActivityType;
  title: string;
  date: string;
  timestamp: number;
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

  pendingVerifications = 0;
  totalAlumni = 0;
  activeJobPosts = 0;
  upcomingEvents = 0;
  announcements = 0;

  verificationSubtitle = '';
  loadingVerifications = false;

  verificationRequests: VerificationPreview[] = [];
  recentActivities: ActivityPreview[] = [];

  private allVerificationRequests: RawRecord[] = [];
  private allJobs: RawRecord[] = [];
  private allEvents: RawRecord[] = [];
  private allAnnouncements: RawRecord[] = [];

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  get summaryCards(): SummaryCard[] {
    return [
      {
        title: 'Pending Verifications',
        value: String(this.pendingVerifications),
        subtitle: this.verificationSubtitle,
        icon: 'pi pi-shield',
        iconClass: 'icon-violet',
      },
      {
        title: 'Total Alumni',
        value: String(this.totalAlumni),
        subtitle: '',
        icon: 'pi pi-users',
        iconClass: 'icon-purple',
      },
      {
        title: 'Active Job Posts',
        value: String(this.activeJobPosts),
        subtitle: '',
        icon: 'pi pi-briefcase',
        iconClass: 'icon-amber',
      },
      {
        title: 'Upcoming Events',
        value: String(this.upcomingEvents),
        subtitle: '',
        icon: 'pi pi-calendar',
        iconClass: 'icon-blue',
      },
      {
        title: 'Announcements',
        value: String(this.announcements),
        subtitle: '',
        icon: 'pi pi-megaphone',
        iconClass: 'icon-pink',
      },
    ];
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }

  private loadDashboardData(): void {
    this.loadingVerifications = true;

    this.listenToVerificationRequests();
    this.listenToUsers();
    this.listenToJobPostings();
    this.listenToEvents();
    this.listenToAnnouncements();
  }

  private listenToVerificationRequests(): void {
    const unsubscribe = onSnapshot(
      collection(db, 'verification_requests'),
      (snapshot) => {
        this.zone.run(() => {
          this.allVerificationRequests = snapshot.docs.map((docItem) => {
            const data = docItem.data() as RawRecord;

            return {
              id: docItem.id,
              ...data,
            };
          });

          const reviewStatuses = ['pending', 'under_review'];

          const requestsNeedingReview = this.allVerificationRequests.filter((request) => {
            const status = String(request['status'] || '').toLowerCase();
            return reviewStatuses.includes(status);
          });

          this.pendingVerifications = requestsNeedingReview.length;

          this.verificationSubtitle =
            this.pendingVerifications === 1
              ? '1 request awaiting review'
              : `${this.pendingVerifications} requests awaiting review`;

          this.verificationRequests = [...this.allVerificationRequests]
            .sort((a, b) => {
              const bTime = this.getDateValue(b['submittedAt'] || b['createdAt'] || b['updatedAt']);
              const aTime = this.getDateValue(a['submittedAt'] || a['createdAt'] || a['updatedAt']);
              return bTime - aTime;
            })
            .slice(0, 4)
            .map((request, index) => ({
              id: request['id'] || `VR-${index + 1}`,
              name:
                request['fullName'] ||
                request['name'] ||
                request['email'] ||
                'Unknown Applicant',
              program: request['program'] || 'Not specified',
              year: request['yearGraduated'] || '—',
              status: this.normalizeVerificationStatus(request['status']),
            }));

          this.loadingVerifications = false;
          this.rebuildRecentActivities();
          this.cdr.detectChanges();
        });
      },
      (error) => {
        this.zone.run(() => {
          console.error('Error loading verification requests:', error);

          this.pendingVerifications = 0;
          this.verificationSubtitle = 'Failed to load verification data';
          this.verificationRequests = [];
          this.loadingVerifications = false;

          this.rebuildRecentActivities();
          this.cdr.detectChanges();
        });
      }
    );

    this.unsubscribers.push(unsubscribe);
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

          this.totalAlumni = users.filter((user) => {
            const role = String(user['role'] || '').toLowerCase();
            const verificationStatus = String(
              user['verificationStatus'] || user['status'] || ''
            ).toLowerCase();

            return (
              role === 'alumni' &&
              user['isVerified'] === true &&
              verificationStatus !== 'rejected'
            );
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
            const status = String(job['status'] || '').toLowerCase();
            return status === 'active';
          }).length;

          this.rebuildRecentActivities();
          this.cdr.detectChanges();
        });
      },
      (error) => {
        this.zone.run(() => {
          console.error('Error loading job postings:', error);
          this.allJobs = [];
          this.activeJobPosts = 0;
          this.rebuildRecentActivities();
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
            const status = String(event['status'] || '').toLowerCase();

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

          this.rebuildRecentActivities();
          this.cdr.detectChanges();
        });
      },
      (error) => {
        this.zone.run(() => {
          console.error('Error loading events:', error);
          this.allEvents = [];
          this.upcomingEvents = 0;
          this.rebuildRecentActivities();
          this.cdr.detectChanges();
        });
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  private listenToAnnouncements(): void {
    const unsubscribe = onSnapshot(
      collection(db, 'announcements'),
      (snapshot) => {
        this.zone.run(() => {
          this.allAnnouncements = snapshot.docs.map((docItem) => {
            const data = docItem.data() as RawRecord;

            return {
              id: docItem.id,
              ...data,
            };
          });

          this.announcements = this.allAnnouncements.filter((announcement) => {
            const status = String(announcement['status'] || '').toLowerCase();
            return status === 'published';
          }).length;

          this.rebuildRecentActivities();
          this.cdr.detectChanges();
        });
      },
      (error) => {
        this.zone.run(() => {
          console.error('Error loading announcements:', error);
          this.allAnnouncements = [];
          this.announcements = 0;
          this.rebuildRecentActivities();
          this.cdr.detectChanges();
        });
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  private rebuildRecentActivities(): void {
    const activities: ActivityPreview[] = [];

    this.allVerificationRequests.forEach((request, index) => {
      const rawDate = request['submittedAt'] || request['createdAt'] || request['updatedAt'];
      const timestamp = this.getDateValue(rawDate);

      activities.push({
        id: request['id'] || `verification-${index}`,
        type: 'verification',
        title: request['fullName']
          ? `Verification: ${request['fullName']}`
          : 'Verification request submitted',
        date: this.formatActivityDate(rawDate),
        timestamp,
      });
    });

    this.allJobs.forEach((job, index) => {
      const rawDate = job['createdAt'] || job['updatedAt'] || job['deadline'];
      const timestamp = this.getDateValue(rawDate);

      activities.push({
        id: job['id'] || `job-${index}`,
        type: 'job',
        title: job['jobTitle'] || job['title'] || 'Job posting created',
        date: this.formatActivityDate(rawDate),
        timestamp,
      });
    });

    this.allEvents.forEach((event, index) => {
      const rawDate =
        event['createdAt'] ||
        event['updatedAt'] ||
        event['eventDate'] ||
        event['date'];

      const timestamp = this.getDateValue(rawDate);

      activities.push({
        id: event['id'] || `event-${index}`,
        type: 'event',
        title:
          event['eventTitle'] ||
          event['title'] ||
          event['eventName'] ||
          'Event created',
        date: this.formatActivityDate(rawDate),
        timestamp,
      });
    });

    this.allAnnouncements.forEach((announcement, index) => {
      const rawDate = announcement['createdAt'] || announcement['updatedAt'];
      const timestamp = this.getDateValue(rawDate);

      activities.push({
        id: announcement['id'] || `announcement-${index}`,
        type: 'announcement',
        title: announcement['title'] || 'Announcement published',
        date: this.formatActivityDate(rawDate),
        timestamp,
      });
    });

    this.recentActivities = activities
      .filter((item) => item.timestamp > 0)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }

  private normalizeVerificationStatus(status: any): VerificationStatus {
    const raw = String(status || '').toLowerCase();

    if (raw === 'approved' || raw === 'verified') return 'approved';
    if (raw === 'rejected') return 'rejected';
    if (raw === 'under_review') return 'under_review';

    return 'pending';
  }

  private formatActivityDate(value: any): string {
    if (!value) return '—';

    const rawValue =
      typeof value === 'string'
        ? value
        : value?.toDate?.() ?? value;

    const date = new Date(rawValue);

    if (isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private getDateValue(value: any): number {
    if (!value) return 0;

    const rawValue =
      typeof value === 'string'
        ? value
        : value?.toDate?.() ?? value;

    const date = new Date(rawValue);

    return isNaN(date.getTime()) ? 0 : date.getTime();
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

  getActivityTypeLabel(type: ActivityType): string {
    switch (type) {
      case 'verification':
        return 'Verification';
      case 'job':
        return 'Job Posting';
      case 'event':
        return 'Event';
      case 'announcement':
        return 'Announcement';
      default:
        return type;
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