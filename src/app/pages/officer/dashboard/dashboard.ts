import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

import { VerificationService } from '../../../services/verification.service';
import { VerificationRequest } from '../../../models/verification.model';
import { UsersService } from '../../../services/users.service';

type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';
type ActivityType = 'job' | 'event' | 'announcement';

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

  pendingVerifications = 0;
  totalAlumni = 0;
  thisMonthAlumni = 0;

  activeJobPosts = 0;
  upcomingEvents = 0;
  announcements = 0;

  verificationSubtitle = '';
  loadingVerifications = false;

  verificationRequests: VerificationPreview[] = [];

  recentActivities: ActivityPreview[] = [];

  constructor(
    private verificationService: VerificationService,
    private usersService: UsersService,
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
    this.loadVerificationDashboardData();
    this.subscribeToRealTimeData();

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

            this.pendingVerifications = pendingRequests.length;

            this.verificationSubtitle =
              pendingRequests.length === 1
                ? '1 request awaiting review'
                : `${pendingRequests.length} requests awaiting review`;

            this.verificationRequests = safeRequests
              .slice()
              .sort((a, b) => this.getRequestTime(b) - this.getRequestTime(a))
              .slice(0, 4)
              .map((request, index) => ({
                id: request.id || `VR-${index + 1}`,
                name: request.fullName || 'Unknown Applicant',
                program: request.program || 'Not specified',
                year: request.yearGraduated || '—',
                status: request.status || 'pending',
              }));

            this.loadingVerifications = false;
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          this.zone.run(() => {
            console.error('Error loading verification dashboard data:', error);

            this.pendingVerifications = 0;
            this.verificationSubtitle = 'Failed to load verification data';
            this.verificationRequests = [];
            this.loadingVerifications = false;

            this.cdr.detectChanges();
          });
        },
      });
  }

  subscribeToRealTimeData(): void {
    this.usersService.getAlumniCountRealTime((count) => {
      this.zone.run(() => {
        this.totalAlumni = count;
        this.cdr.detectChanges();
      });
    });

    this.usersService.getAlumniCountThisMonthRealTime((count) => {
      this.zone.run(() => {
        this.thisMonthAlumni = count;
        this.cdr.detectChanges();
      });
    });
  }

  private getRequestTime(request: VerificationRequest): number {
    const raw: any = request.submittedAt;

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
}