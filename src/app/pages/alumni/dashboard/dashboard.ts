import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { User } from '../../../models/user.model';

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
  type: 'profile' | 'verification' | 'employment';
}

interface EventItem {
  month: string;
  day: string;
  title: string;
  location: string;
}

interface AnnouncementItem {
  title: string;
  date: string;
  tag: string;
  tagClass: string;
  highlighted?: boolean;
}

interface RecommendedJob {
  title: string;
  company: string;
  location: string;
  match: number;
}

interface ActivityItem {
  title: string;
  description: string;
  time: string;
  icon: string;
  iconClass: string;
}

@Component({
  selector: 'app-alumni-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit {
  loading = true;
  errorMessage = '';
  currentUser: AlumniDashboardUser | null = null;

  alumniName = 'Alumni User';
  program = 'Program not set';
  batch = 'Batch not set';

  topCards: TopCard[] = [];

  upcomingEvents: EventItem[] = [
    {
      month: 'APR',
      day: '15',
      title: 'Alumni Homecoming 2026',
      location: 'Main Campus Auditorium',
    },
    {
      month: 'APR',
      day: '22',
      title: 'Career Networking Night',
      location: 'Virtual (Zoom)',
    },
    {
      month: 'MAY',
      day: '3',
      title: 'Tech Talk: AI in Industry',
      location: 'IT Building, Rm 301',
    },
  ];

  announcements: AnnouncementItem[] = [
    {
      title: 'Alumni ID Card Distribution',
      date: 'March 28, 2026',
      tag: 'Important',
      tagClass: 'tag-important',
      highlighted: true,
    },
    {
      title: 'Updated Employment Survey Form',
      date: 'March 25, 2026',
      tag: 'Update',
      tagClass: 'tag-update',
    },
    {
      title: 'Scholarship Applications Open',
      date: 'March 20, 2026',
      tag: 'Opportunity',
      tagClass: 'tag-opportunity',
    },
  ];

  recommendedJobs: RecommendedJob[] = [
    {
      title: 'Frontend Developer',
      company: 'TechCorp Philippines',
      location: 'Makati City',
      match: 95,
    },
    {
      title: 'IT Support Specialist',
      company: 'GlobalServe Inc.',
      location: 'Quezon City',
      match: 88,
    },
    {
      title: 'Web Developer',
      company: 'StartupHub',
      location: 'Remote',
      match: 82,
    },
  ];

  recentActivities: ActivityItem[] = [
    {
      title: 'Dashboard loaded',
      description: 'Current alumni account overview displayed',
      time: 'Just now',
      icon: 'pi pi-user',
      iconClass: 'activity-purple',
    },
    {
      title: 'Verification status checked',
      description: 'Current account status retrieved',
      time: 'Today',
      icon: 'pi pi-shield',
      iconClass: 'activity-blue',
    },
    {
      title: 'Employment section available',
      description: 'You can update your latest work information',
      time: 'Today',
      icon: 'pi pi-briefcase',
      iconClass: 'activity-green',
    },
    {
      title: 'Events and announcements loaded',
      description: 'Recent alumni updates are ready to view',
      time: 'Today',
      icon: 'pi pi-calendar',
      iconClass: 'activity-yellow',
    },
  ];

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadCurrentUser();
  }

  async loadCurrentUser(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const authUser = await this.authService.getAuthState();

      console.log('AUTH USER:', authUser);
      console.log('AUTH UID:', authUser?.uid);

      if (!authUser) {
        this.errorMessage = 'No logged-in user found.';
        return;
      }

      const userDoc = await this.usersService.getUserById(authUser.uid);

      console.log('USER DOC:', userDoc);

      if (!userDoc) {
        this.errorMessage = 'Alumni record not found.';
        return;
      }

      this.currentUser = userDoc as AlumniDashboardUser;
      this.syncDashboardFromUser();
    } catch (error) {
      console.error('Failed to load alumni dashboard user:', error);
      this.errorMessage = 'Failed to load alumni dashboard data.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
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
    const missingHint = this.buildProfileHint();

    const employmentBadge = this.getEmploymentBadge();

    this.topCards = [
      {
        title: 'Profile',
        icon: 'pi pi-user',
        badge: completion === 100 ? 'Complete' : 'In Progress',
        badgeClass: completion === 100 ? 'badge-success' : 'badge-warning',
        mainValue: `${completion}%`,
        subtitle: 'Complete',
        helperText: missingHint,
        actionText: 'Complete now',
        type: 'profile',
      },
      {
        title: 'Verification',
        icon: 'pi pi-shield',
        badge: this.getVerificationBadge(),
        badgeClass: this.getVerificationBadgeClass(),
        mainValue: this.getVerificationMainValue(),
        subtitle: this.getVerificationSubtitle(),
        actionText: 'View details',
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
          this.currentUser.currentJobTitle ||
          'No employment record yet',
        subtitle:
          this.currentUser.employmentDetails?.companyName ||
          this.currentUser.company ||
          this.currentUser.companyName ||
          this.currentUser.employer ||
          'Update your work information.',
        helperText:
          this.buildEmploymentHelper() ||
          'Keep your alumni data current.',
        actionText: 'Update status',
        type: 'employment',
      },
    ];
  }

  private computeProfileCompletion(): number {
    if (!this.currentUser) return 0;

    const checks = [
      this.currentUser.firstName,
      this.currentUser.lastName,
      this.currentUser.email,
      this.currentUser.contactNumber,
      this.currentUser.address,
      this.currentUser.photoUrl,
      this.currentUser.program,
      this.currentUser.yearGraduated,
    ];

    const filled = checks.filter((value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (typeof value === 'number') return true;
      return value !== null && value !== undefined;
    }).length;

    return Math.min(100, Math.round((filled / checks.length) * 100));
  }

  private buildProfileHint(): string {
    if (!this.currentUser) return 'Loading profile data...';

    const missing: string[] = [];

    if (!this.currentUser.address?.trim()) missing.push('address');
    if (!this.currentUser.contactNumber?.trim()) {
      missing.push('contact number');
    }
    if (!this.currentUser.program?.trim()) missing.push('program');
    if (!this.currentUser.yearGraduated) missing.push('year graduated');
    if (!this.currentUser.photoUrl?.trim()) missing.push('photo');

    if (!missing.length) return 'Your profile looks complete.';

    return `Missing: ${missing.slice(0, 2).join(', ')}${
      missing.length > 2 ? '...' : ''
    }`;
  }

  private getVerificationBadge(): string {
    switch (this.currentUser?.status) {
      case 'verified':
        return 'Approved';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  private getVerificationBadgeClass(): string {
    switch (this.currentUser?.status) {
      case 'verified':
        return 'badge-success';
      case 'pending':
        return 'badge-warning';
      case 'rejected':
        return 'badge-danger';
      default:
        return 'badge-warning';
    }
  }

  private getVerificationMainValue(): string {
    switch (this.currentUser?.status) {
      case 'verified':
        return "You're a verified alumni";
      case 'pending':
        return 'Verification in review';
      case 'rejected':
        return 'Verification was rejected';
      default:
        return 'Verification unavailable';
    }
  }

  private getVerificationSubtitle(): string {
    switch (this.currentUser?.status) {
      case 'verified':
        return 'Your alumni account is already verified.';
      case 'pending':
        return 'Your submitted documents are under review.';
      case 'rejected':
        return 'Please review your documents and resubmit.';
      default:
        return 'No verification record available.';
    }
  }

  private getEmploymentBadge(): string {
    if (!this.currentUser) return 'Not Updated';

    return (
      this.currentUser.employmentStatus ||
      this.currentUser.employment ||
      this.currentUser.workStatus ||
      'Not Updated'
    );
  }

  private buildEmploymentHelper(): string {
    if (!this.currentUser) return '';

    return [
      this.currentUser.employmentDetails?.employmentType,
      this.currentUser.employmentDetails?.workLocation,
      this.currentUser.employmentDetails?.industry,
      this.currentUser.employmentType,
      this.currentUser.jobType,
      this.currentUser.workLocation,
      this.currentUser.jobLocation,
    ]
      .filter((v) => typeof v === 'string' && v.trim().length > 0)
      .join(' · ');
  }

  trackByIndex(index: number): number {
    return index;
  }
}