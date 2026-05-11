import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { UsersService } from '../../../../services/users.service';
import { EmploymentStatusService } from '../../../../services/employment-status.service';
import { VerificationService } from '../../../../services/verification.service';
import { AuthService } from '../../../../services/auth.service';

import { User } from '../../../../models/user.model';
import { EmploymentStatusData } from '../../../../models/employment-status.model';
import { VerificationRequest } from '../../../../models/verification.model';

@Component({
  selector: 'app-alumni-record-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumni-record-details.html',
  styleUrls: ['./alumni-record-details.scss'],
})
export class AlumniRecordDetails implements OnInit, OnDestroy {
  private destroyed = false;
  private verificationSub?: Subscription;

  alumniUid = '';
  loading = true;
  errorMessage = '';

  profile: User | null = null;
  employmentStatus: EmploymentStatusData | null = null;
  verificationRequest: VerificationRequest | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usersService: UsersService,
    private employmentStatusService: EmploymentStatusService,
    private verificationService: VerificationService,
    private authService: AuthService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    const authUser = await this.authService.waitForAuthReady();

    if (this.destroyed) return;

    if (!authUser) {
      await this.router.navigate(['/login']);
      return;
    }

    const uid = this.route.snapshot.paramMap.get('id') || '';

    if (!uid) {
      this.zone.run(() => {
        this.loading = false;
        this.errorMessage = 'No alumni record was selected.';
        this.cdr.detectChanges();
      });
      return;
    }

    this.alumniUid = uid;
    await this.loadAlumniRecord(uid);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.verificationSub?.unsubscribe();
  }

  async loadAlumniRecord(uid: string): Promise<void> {
    this.zone.run(() => {
      this.loading = true;
      this.errorMessage = '';
      this.profile = null;
      this.employmentStatus = null;
      this.verificationRequest = null;
      this.cdr.detectChanges();
    });

    try {
      const profile = await this.usersService.getUserById(uid);

      if (this.destroyed) return;

      if (!profile) {
        this.zone.run(() => {
          this.loading = false;
          this.errorMessage = 'Alumni record was not found.';
          this.cdr.detectChanges();
        });
        return;
      }

      const employmentStatus = await this.getEmploymentStatusSafely(uid);

      if (this.destroyed) return;

      this.zone.run(() => {
        this.profile = profile;
        this.employmentStatus = employmentStatus;
        this.cdr.detectChanges();
      });

      this.loadVerificationRequest(uid, profile.email || '');
    } catch (error) {
      console.error('Failed to load alumni record details:', error);

      this.zone.run(() => {
        if (this.destroyed) return;

        this.loading = false;
        this.errorMessage = 'Failed to load alumni record details.';
        this.cdr.detectChanges();
      });
    }
  }

  private async getEmploymentStatusSafely(
    uid: string
  ): Promise<EmploymentStatusData | null> {
    try {
      return await this.employmentStatusService.getByUid(uid);
    } catch (error) {
      console.error('Failed to load employment status:', error);
      return null;
    }
  }

  private loadVerificationRequest(uid: string, email: string): void {
    this.verificationSub?.unsubscribe();

    this.verificationSub = this.verificationService
      .getLatestVerificationRequestByUser(uid, email)
      .subscribe({
        next: (request) => {
          this.zone.run(() => {
            if (this.destroyed) return;

            this.verificationRequest = request;
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          console.error('Failed to load verification request:', error);

          this.zone.run(() => {
            if (this.destroyed) return;

            this.verificationRequest = null;
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/officer/alumni-records']);
  }

  getDisplayName(): string {
    const profile = this.profile as any;

    const firstName = String(profile?.firstName || '').trim();
    const middleName = String(profile?.middleName || '').trim();
    const lastName = String(profile?.lastName || '').trim();
    const suffix = String(profile?.suffix || '').trim();
    const fullName = String(profile?.fullName || '').trim();

    const middleInitial = middleName
      ? `${middleName.charAt(0).toUpperCase()}.`
      : '';

    return (
      [firstName, middleInitial, lastName, suffix].filter(Boolean).join(' ').trim() ||
      fullName ||
      this.getEmailLabel() ||
      'Unnamed Alumni'
    );
  }

  getInitials(): string {
    const name = this.getDisplayName();

    const parts = name
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) return 'A';

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  getProfilePhotoUrl(): string {
    const profile = this.profile as any;

    return String(
      profile?.photoUrl ||
        profile?.profilePhotoUrl ||
        profile?.avatarUrl ||
        profile?.imageUrl ||
        ''
    ).trim();
  }

  getEmailLabel(): string {
    return this.value((this.profile as any)?.email);
  }

  getRoleLabel(): string {
    return 'Alumni';
  }

  getAlumniIdLabel(): string {
    const requestAlumniId = String(this.verificationRequest?.alumniId || '').trim();
    const userAlumniId = String((this.profile as any)?.alumniId || '').trim();

    return requestAlumniId || userAlumniId || 'Not assigned';
  }

  getUniversityIdLabel(): string {
    const requestStudentId = String(this.verificationRequest?.studentId || '').trim();
    const userStudentId = String((this.profile as any)?.studentId || '').trim();

    return requestStudentId || userStudentId || '—';
  }

  getProgramLabel(): string {
    return (
      this.value(this.verificationRequest?.program) ||
      this.value((this.profile as any)?.program)
    );
  }

  getYearGraduatedLabel(): string {
    const requestYear = this.verificationRequest?.yearGraduated;
    const profileYear = (this.profile as any)?.yearGraduated;

    return this.value(requestYear) || this.value(profileYear);
  }

  getCampusLabel(): string {
    return (
      this.value(this.verificationRequest?.campus) ||
      this.value((this.profile as any)?.campus) ||
      'USTP Villanueva Campus'
    );
  }

  getContactNumberLabel(): string {
    return (
      this.value(this.verificationRequest?.contactNumber) ||
      this.value((this.profile as any)?.contactNumber)
    );
  }

  getBirthDateLabel(): string {
    const requestBirthDate = this.verificationRequest?.birthDate;
    const profileBirthDate = (this.profile as any)?.birthDate;

    return this.formatDate(requestBirthDate || profileBirthDate);
  }

  getSexLabel(): string {
    return (
      this.value(this.verificationRequest?.sex) ||
      this.value((this.profile as any)?.sex)
    );
  }

  getVerificationStatusLabel(): string {
    const rawStatus = String(
      this.verificationRequest?.status ||
        (this.profile as any)?.verificationStatus ||
        (this.profile as any)?.status ||
        ''
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');

    switch (rawStatus) {
      case 'approved':
      case 'verified':
        return 'Approved';

      case 'under_review':
      case 'underreview':
      case 'review':
        return 'Under Review';

      case 'rejected':
      case 'declined':
        return 'Rejected';

      case 'pending':
        return 'Pending';

      default:
        return 'Not available';
    }
  }

  getVerificationStatusClass(): string {
    const label = this.getVerificationStatusLabel();

    switch (label) {
      case 'Approved':
        return 'status-approved';

      case 'Under Review':
        return 'status-review';

      case 'Rejected':
        return 'status-rejected';

      case 'Pending':
        return 'status-pending';

      default:
        return 'status-neutral';
    }
  }

  getSubmittedDateLabel(): string {
    return this.formatDate(this.verificationRequest?.submittedAt);
  }

  getReviewedDateLabel(): string {
    return this.formatDate(
      this.verificationRequest?.reviewedAt ||
        this.verificationRequest?.updatedAt
    );
  }

  getIssuedDateLabel(): string {
    return this.formatDate(
      this.verificationRequest?.alumniIdIssuedAt ||
        this.verificationRequest?.reviewedAt ||
        this.verificationRequest?.updatedAt
    );
  }

  getReviewerLabel(): string {
    return this.value(this.verificationRequest?.reviewedBy);
  }

  getRemarksLabel(): string {
    return this.value(this.verificationRequest?.remarks) || 'No remarks available.';
  }

  getPostGraduationStatusLabel(): string {
    return this.value((this.employmentStatus as any)?.status) || 'Not updated';
  }

  getPostGraduationStatusClass(): string {
    const status = this.getPostGraduationStatusLabel().toLowerCase();

    switch (status) {
      case 'employed':
        return 'status-employed';

      case 'self-employed':
      case 'self employed':
      case 'self_employed':
        return 'status-self-employed';

      case 'unemployed':
        return 'status-unemployed';

      case 'further studies':
      case 'further_studies':
        return 'status-studies';

      case 'employed and studying':
      case 'employed_and_studying':
        return 'status-employed-studying';

      case 'not currently seeking employment':
      case 'not_currently_seeking_employment':
        return 'status-not-seeking';

      default:
        return 'status-neutral';
    }
  }

  isEmployedOrEmployedStudying(): boolean {
    const status = this.getPostGraduationStatusLabel().toLowerCase();

    return status === 'employed' || status === 'employed and studying';
  }

  isSelfEmployed(): boolean {
    return this.getPostGraduationStatusLabel().toLowerCase() === 'self-employed';
  }

  isUnemployed(): boolean {
    return this.getPostGraduationStatusLabel().toLowerCase() === 'unemployed';
  }

  isFurtherStudiesOrEmployedStudying(): boolean {
    const status = this.getPostGraduationStatusLabel().toLowerCase();

    return status === 'further studies' || status === 'employed and studying';
  }

  isNotSeeking(): boolean {
    return (
      this.getPostGraduationStatusLabel().toLowerCase() ===
      'not currently seeking employment'
    );
  }

  getEmploymentValue(field: string): string {
    return this.value((this.employmentStatus as any)?.[field]);
  }

  getEmploymentDate(field: string): string {
    return this.formatDate((this.employmentStatus as any)?.[field]);
  }

  getEmploymentDateTime(field: string): string {
    return this.formatDateTime((this.employmentStatus as any)?.[field]);
  }

  getCareerCategories(): string[] {
    const categories = (this.employmentStatus as any)?.careerCategories;

    return Array.isArray(categories)
      ? categories.map((category) => String(category).trim()).filter(Boolean)
      : [];
  }

  hasCareerCategories(): boolean {
    return this.getCareerCategories().length > 0;
  }

  formatDate(value: any): string {
    if (!value) return '—';

    let date: Date;

    if (typeof value?.toDate === 'function') {
      date = value.toDate();
    } else if (value?.seconds) {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatDateTime(value: any): string {
    if (!value) return '—';

    let date: Date;

    if (typeof value?.toDate === 'function') {
      date = value.toDate();
    } else if (value?.seconds) {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private value(value: any): string {
    const normalized = String(value ?? '').trim();

    return normalized || '—';
  }
}