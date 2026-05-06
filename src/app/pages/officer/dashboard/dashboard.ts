import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

import { VerificationService } from '../../../services/verification.service';
import { VerificationRequest } from '../../../models/verification.model';
import { UsersService } from '../../../services/users.service';  // Added UsersService import

type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';
type ActivityType = 'job' | 'event' | 'announcement';

interface SummaryCard {
  title: string;
  value: string;
  subtitle: string; // Removed mini text here
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
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  summaryCards: SummaryCard[] = [
    {
      title: 'Pending Verifications',
      value: '0',
      subtitle: '', // Removed mini text here
      icon: 'pi pi-shield',
      iconClass: 'icon-violet',
    },
    {
      title: 'Total Alumni',
      value: '1,842', // This will be updated dynamically
      subtitle: '', // Removed mini text here
      icon: 'pi pi-users',
      iconClass: 'icon-purple',
    },
    {
      title: 'Active Job Posts',
      value: '18',
      subtitle: '', // Removed mini text here
      icon: 'pi pi-briefcase',
      iconClass: 'icon-amber',
    },
    {
      title: 'Upcoming Events',
      value: '3',
      subtitle: '', // Removed mini text here
      icon: 'pi pi-calendar',
      iconClass: 'icon-blue',
    },
    {
      title: 'Announcements',
      value: '47',
      subtitle: '', // Removed mini text here
      icon: 'pi pi-megaphone',
      iconClass: 'icon-pink',
    },
  ];

  verificationRequests: VerificationPreview[] = [];

  recentActivities: ActivityPreview[] = [
    {
      id: 'ACT-001',
      type: 'job',
      title: 'Software Developer at Accenture',
      date: 'Apr 8, 2026',
    },
    {
      id: 'ACT-002',
      type: 'event',
      title: 'Grand Alumni Homecoming 2026',
      date: 'Apr 7, 2026',
    },
    {
      id: 'ACT-003',
      type: 'announcement',
      title: 'Updated alumni ID processing guidelines',
      date: 'Apr 6, 2026',
    },
  ];

  loadingVerifications = false;
  totalAlumni: number = 0;  // Initialized total alumni count
  thisMonthAlumni: number = 0;  // To track alumni count for this month

  constructor(
    private verificationService: VerificationService,
    private usersService: UsersService,  // Injected UsersService
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadVerificationDashboardData();
    this.subscribeToRealTimeData();  // Subscribe to real-time data

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        const nav = event as NavigationEnd;
        if (nav.urlAfterRedirects.includes('/officer/dashboard')) {
          this.loadVerificationDashboardData();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadVerificationDashboardData(): void {
    this.loadingVerifications = true;

    this.verificationService
      .getAllVerificationRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests: VerificationRequest[]) => {
          this.zone.run(() => {
            const safeRequests = Array.isArray(requests) ? [...requests] : [];

            const pendingRequests = safeRequests.filter(
              (request) => request.status === 'pending'
            );

            this.summaryCards = this.summaryCards.map((card) =>
              card.title === 'Pending Verifications'
                ? {
                    ...card,
                    value: String(pendingRequests.length),
                    subtitle:
                      pendingRequests.length === 1
                        ? '1 request awaiting review'
                        : `${pendingRequests.length} requests awaiting review`,
                  }
                : card
            );

            this.verificationRequests = safeRequests
              .slice()
              .sort((a, b) => this.getRequestTime(b) - this.getRequestTime(a))
              .slice(0, 4)
              .map((request, index) => ({
                id: request.id || `VR-${index + 1}`,
                name: request.fullName || 'Unknown Applicant',
                program: request.program || 'Not specified',
                year: request.yearGraduated || '—',
                status: request.status,
              }));

            this.loadingVerifications = false;
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          this.zone.run(() => {
            console.error('Error loading verification dashboard data:', error);

            this.summaryCards = this.summaryCards.map((card) =>
              card.title === 'Pending Verifications'
                ? {
                    ...card,
                    value: '0',
                    subtitle: 'Failed to load verification data',
                  }
                : card
            );

            this.verificationRequests = [];
            this.loadingVerifications = false;
            this.cdr.detectChanges();
          });
        },
      });
  }

  private getRequestTime(request: VerificationRequest): number {
    const raw = request.submittedAt;

    if (!raw) return 0;
    if (typeof raw === 'number') return raw;
    if (raw?.seconds) return raw.seconds * 1000;

    const parsed = new Date(raw).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
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

  // Real-time subscription for total alumni and this month's alumni count
  subscribeToRealTimeData(): void {
    this.usersService.getAlumniCountRealTime((count) => {
      this.totalAlumni = count;

      // Update the Total Alumni summary card dynamically
      this.summaryCards = this.summaryCards.map((card) =>
        card.title === 'Total Alumni'
          ? {
              ...card,
              value: String(this.totalAlumni),
              subtitle: '', // No mini text for total alumni
            }
          : card
      );
      this.cdr.detectChanges();  // Ensure UI updates
    });

    this.usersService.getAlumniCountThisMonthRealTime((count) => {
      this.thisMonthAlumni = count;
    });
  }
}