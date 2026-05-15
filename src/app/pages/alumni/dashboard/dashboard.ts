import { NgIf, NgFor, NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { AnnouncementService } from '../../../services/announcements.service';
import { EventsService } from '../../../services/events.service';
import { JobPostingsService } from '../../../services/job-postings.service';

import { User } from '../../../models/user.model';
import { Announcement } from '../../../models/announcements.model';
import { EventRecord } from '../../../models/events.model';
import { JobPosting } from '../../../models/job-postings.model';

interface AlumniDashboardUser extends User {
  employment?: string;
  workStatus?: string;
  jobTitle?: string;
  position?: string;
  currentJobTitle?: string;
  company?: string;
  companyName?: string;
  employer?: string;
  employmentType?: string;
  jobType?: string;
  workLocation?: string;
  jobLocation?: string;
  employmentDetails?: {
    companyName?: string;
    dateHired?: string;
    employmentType?: string;
    industry?: string;
    jobTitle?: string;
    workLocation?: string;
    updatedAt?: any;
  };
}

interface TopCard {
  title: string;
  icon: string;
  badge: string;
  badgeClass: string;
  mainValue: string;
  subtitle: string;
  helperText?: string;
  actionText: string;
  actionRoute: string;
  type: 'profile' | 'verification' | 'employment';
  progress?: number;
}

@Component({
  selector: 'app-alumni-dashboard',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit, OnDestroy {
  private destroyed = false;
  private announcementsSub?: Subscription;
  private eventsSub?: Subscription;
  private jobsSub?: Subscription;

  loading = true;
  errorMessage = '';
  currentUser: AlumniDashboardUser | null = null;

  alumniName = 'Alumni User';
  program = 'Program not set';
  batch = 'Batch not set';

  topCards: TopCard[] = [];

  upcomingEvents: EventRecord[] = [];
  announcements: Announcement[] = [];
  activeJobs: JobPosting[] = [];

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private announcementService: AnnouncementService,
    private eventsService: EventsService,
    private jobPostingsService: JobPostingsService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadCurrentUser();
    this.loadAnnouncements();
    this.loadEvents();
    this.loadJobs();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.announcementsSub?.unsubscribe();
    this.eventsSub?.unsubscribe();
    this.jobsSub?.unsubscribe();
  }

  async loadCurrentUser(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const authUser = await this.authService.getAuthState();
      if (this.destroyed) return;

      if (!authUser) {
        this.errorMessage = 'No logged-in user found.';
        return;
      }

      const userDoc = await this.usersService.getUserById(authUser.uid);
      if (this.destroyed) return;

      if (!userDoc) {
        this.errorMessage = 'Alumni record not found.';
        return;
      }

      this.currentUser = userDoc as AlumniDashboardUser;
      this.syncDashboardFromUser();
    } catch (err) {
      if (this.destroyed) return;
      console.error(err);
      this.errorMessage = 'Failed to load alumni dashboard data.';
    } finally {
      if (this.destroyed) return;
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  loadAnnouncements(): void {
    this.announcementsSub?.unsubscribe();

    this.announcementsSub = this.announcementService.getAnnouncements().subscribe({
      next: (records) => {
        if (this.destroyed) return;

        this.announcements = (records ?? [])
          .filter((a) => a.status === 'Published')
          .slice(0, 3);

        this.cdr.detectChanges();
      },
      error: (err) => console.error('Announcements error:', err),
    });
  }

  loadEvents(): void {
    this.eventsSub?.unsubscribe();

    this.eventsSub = this.eventsService.getEvents().subscribe({
      next: (records) => {
        if (this.destroyed) return;

        this.upcomingEvents = (records ?? [])
          .filter(
            (e) =>
              !(e as any).isArchived &&
              ['Upcoming', 'Ongoing'].includes((e as any).status ?? '')
          )
          .slice(0, 3);

        this.cdr.detectChanges();
      },
      error: (err) => console.error('Events error:', err),
    });
  }

  loadJobs(): void {
    this.jobsSub?.unsubscribe();

    this.jobsSub = this.jobPostingsService.getJobPostings().subscribe({
      next: (records) => {
        if (this.destroyed) return;

        this.activeJobs = (records ?? [])
          .filter((j) => j.status === 'Active')
          .slice(0, 3);

        this.cdr.detectChanges();
      },
      error: (err) => console.error('Jobs error:', err),
    });
  }

  eventMonth(e: EventRecord): string {
    const d = this.parseDate((e as any).eventDate);
    return d ? d.toLocaleString('en-US', { month: 'short' }).toUpperCase() : '—';
  }

  eventDay(e: EventRecord): string {
    const d = this.parseDate((e as any).eventDate);
    return d ? String(d.getDate()).padStart(2, '0') : '—';
  }

  eventTitle(e: EventRecord): string {
    return (e as any).title || 'Untitled Event';
  }

  eventLocation(e: EventRecord): string {
    return (e as any).location || 'Location TBA';
  }

  eventStatus(e: EventRecord): string {
    return (e as any).status || 'Upcoming';
  }

  announcementTag(a: Announcement): string {
    const map: Record<string, string> = {
      General: 'General',
      'Alumni Office': 'Office',
      'Job Opportunity': 'Job',
      'Event Notice': 'Event',
      'System Notice': 'System',
      Academic: 'Academic',
    };

    return map[a.category] ?? a.category;
  }

  announcementTagClass(a: Announcement): string {
    const map: Record<string, string> = {
      General: 'tag-update',
      'Alumni Office': 'tag-important',
      'Job Opportunity': 'tag-opportunity',
      'Event Notice': 'tag-update',
      'System Notice': 'tag-important',
      Academic: 'tag-opportunity',
    };

    return map[a.category] ?? 'tag-update';
  }

  formatAnnouncementDate(dateStr: string): string {
    if (!dateStr) return '';

    const d = new Date(dateStr);

    if (isNaN(d.getTime())) return '';

    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  private syncDashboardFromUser(): void {
    if (!this.currentUser) return;

    this.alumniName =
      this.currentUser.fullName ||
      [this.currentUser.firstName, this.currentUser.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      this.currentUser.email ||
      'Alumni User';

    this.program = this.currentUser.program || 'Program not set';
    this.batch = this.currentUser.yearGraduated
      ? `Batch ${this.currentUser.yearGraduated}`
      : 'Batch not set';

    const completion = this.computeProfileCompletion();
    const employmentBadge = this.getEmploymentBadge();

    this.topCards = [
      {
        title: 'Profile',
        icon: 'pi pi-user',
        badge: completion === 100 ? 'Complete' : 'In Progress',
        badgeClass: completion === 100 ? 'badge-success' : 'badge-warning',
        mainValue: `${completion}%`,
        subtitle: 'Complete',
        helperText: this.buildProfileHint(),
        actionText: completion === 100 ? 'View profile' : 'Complete now',
        actionRoute: '/alumni/my-profile',
        type: 'profile',
        progress: completion,
      },
      {
        title: 'Verification',
        icon: 'pi pi-shield',
        badge: this.getVerificationBadge(),
        badgeClass: this.getVerificationBadgeClass(),
        mainValue: this.getVerificationMainValue(),
        subtitle: this.getVerificationSubtitle(),
        actionText: 'View details',
        actionRoute: '/alumni/verification-status',
        type: 'verification',
      },
      {
        title: 'Employment',
        icon: 'pi pi-briefcase',
        badge: employmentBadge,
        badgeClass:
          employmentBadge.toLowerCase() === 'employed'
            ? 'badge-success'
            : 'badge-warning',
        mainValue:
          this.currentUser.employmentDetails?.jobTitle ||
          this.currentUser.jobTitle ||
          this.currentUser.position ||
          'No employment record yet',
        subtitle:
          this.currentUser.employmentDetails?.companyName ||
          this.currentUser.company ||
          this.currentUser.companyName ||
          'Update your work information.',
        helperText: this.buildEmploymentHelper() || 'Keep your alumni data current.',
        actionText: 'Update status',
        actionRoute: '/alumni/employment-status',
        type: 'employment',
      },
    ];
  }

  private computeProfileCompletion(): number {
    if (!this.currentUser) return 0;

    const hasPhoto = !!(this.currentUser.photoUrl || '').trim();
    const hasAddress = !!(this.currentUser.address || '').trim();

    if (!hasPhoto) return 75;
    if (!hasAddress) return 90;
    return 100;
  }

  private buildProfileHint(): string {
    if (!this.currentUser) return 'Loading profile data...';

    const hasPhoto = !!(this.currentUser.photoUrl || '').trim();
    const hasAddress = !!(this.currentUser.address || '').trim();

    if (!hasPhoto) return 'Missing: profile photo';
    if (!hasAddress) return 'Missing: address';
    return 'Your profile looks complete.';
  }

  private getVerificationBadge(): string {
    const status = this.getVerificationStatus();

    const map: Record<string, string> = {
      verified: 'Approved',
      pending: 'Pending',
      under_review: 'Under Review',
      rejected: 'Rejected',
    };

    return map[status] ?? 'Unknown';
  }

  private getVerificationBadgeClass(): string {
    const status = this.getVerificationStatus();

    const map: Record<string, string> = {
      verified: 'badge-success',
      pending: 'badge-warning',
      under_review: 'badge-warning',
      rejected: 'badge-danger',
    };

    return map[status] ?? 'badge-warning';
  }

  private getVerificationMainValue(): string {
    const status = this.getVerificationStatus();

    const map: Record<string, string> = {
      verified: "You're a verified alumni",
      pending: 'Verification pending',
      under_review: 'Verification in review',
      rejected: 'Verification was rejected',
    };

    return map[status] ?? 'Verification unavailable';
  }

  private getVerificationSubtitle(): string {
    const status = this.getVerificationStatus();

    const map: Record<string, string> = {
      verified: 'Your alumni account is already verified.',
      pending: 'Your submitted documents are waiting for review.',
      under_review: 'Your submitted documents are under review.',
      rejected: 'Please review your documents and resubmit.',
    };

    return map[status] ?? 'No verification record available.';
  }

  private getVerificationStatus(): string {
    return (
      this.currentUser?.verificationStatus ||
      this.currentUser?.status ||
      ''
    )
      .toString()
      .toLowerCase();
  }

  private getEmploymentBadge(): string {
    return (
      this.currentUser?.employmentStatus ||
      this.currentUser?.employment ||
      this.currentUser?.workStatus ||
      'Not Updated'
    );
  }

  private buildEmploymentHelper(): string {
    return [
      this.currentUser?.employmentDetails?.employmentType,
      this.currentUser?.employmentDetails?.workLocation,
      this.currentUser?.employmentDetails?.industry,
      this.currentUser?.employmentType,
      this.currentUser?.workLocation,
    ]
      .filter((v) => typeof v === 'string' && v.trim().length > 0)
      .join(' · ');
  }

  private parseDate(raw: string): Date | null {
    if (!raw) return null;

    const d = new Date(`${raw}T00:00:00`);

    return isNaN(d.getTime()) ? null : d;
  }
}