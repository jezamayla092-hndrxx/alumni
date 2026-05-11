import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { VerificationService } from '../../../services/verification.service';
import { VerificationRequest } from '../../../models/verification.model';

@Component({
  selector: 'app-verification-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verification-status.html',
  styleUrls: ['./verification-status.scss'],
})
export class VerificationStatus implements OnInit, OnDestroy {
  verificationRequest: VerificationRequest | null = null;

  loading = true;
  errorMessage = '';

  private requestSub?: Subscription;

  constructor(
    private authService: AuthService,
    private verificationService: VerificationService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    const user = await this.authService.waitForAuthReady();

    if (!user) {
      await this.router.navigate(['/login']);
      return;
    }

    this.loadVerificationStatus(user.uid, user.email || '');
  }

  ngOnDestroy(): void {
    this.requestSub?.unsubscribe();
  }

  private loadVerificationStatus(userUid: string, email: string): void {
    this.loading = true;
    this.errorMessage = '';
    this.requestSub?.unsubscribe();

    this.requestSub = this.verificationService
      .getLatestVerificationRequestByUser(userUid, email)
      .subscribe({
        next: (request) => {
          this.zone.run(() => {
            this.verificationRequest = request
              ? {
                  ...request,
                  status: this.normalizeStatus(request.status),
                }
              : null;

            this.loading = false;
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          this.zone.run(() => {
            console.error('Failed to load verification status:', error);

            this.verificationRequest = null;
            this.loading = false;
            this.errorMessage = 'Unable to load verification status. Please try again later.';

            this.cdr.detectChanges();
          });
        },
      });
  }

  private normalizeStatus(status: any): VerificationRequest['status'] {
    const value = String(status ?? '').toLowerCase().replace(/\s+/g, '_').trim();

    switch (value) {
      case 'approved':
      case 'verified':
        return 'approved';

      case 'under_review':
      case 'underreview':
      case 'review':
        return 'under_review';

      case 'rejected':
      case 'declined':
        return 'rejected';

      case 'pending':
      default:
        return 'pending';
    }
  }

  getStatusLabel(status: any): string {
    switch (this.normalizeStatus(status)) {
      case 'approved':
        return 'Approved';

      case 'under_review':
        return 'Under Review';

      case 'rejected':
        return 'Rejected';

      case 'pending':
      default:
        return 'Pending';
    }
  }

  getStatusClass(status: any): string {
    switch (this.normalizeStatus(status)) {
      case 'approved':
        return 'status-approved';

      case 'under_review':
        return 'status-review';

      case 'rejected':
        return 'status-rejected';

      case 'pending':
      default:
        return 'status-pending';
    }
  }

  getSubmittedDateLabel(request: VerificationRequest): string {
    return this.formatDate(request.submittedAt);
  }

  getReviewedDateLabel(request: VerificationRequest): string {
    return this.formatDate(request.reviewedAt || request.updatedAt);
  }

  getIssuedDateLabel(request: VerificationRequest): string {
    return this.formatDate(request.alumniIdIssuedAt || request.reviewedAt || request.updatedAt);
  }

  getReviewerLabel(request: VerificationRequest): string {
    return request.reviewedBy?.trim() || '—';
  }

  getRemarksLabel(request: VerificationRequest): string {
    return request.remarks?.trim() || 'No remarks available.';
  }

  getUniversityIdLabel(request: VerificationRequest): string {
    return request.studentId?.trim() || '—';
  }

  getAlumniIdLabel(request: VerificationRequest): string {
    return request.alumniId?.trim() || 'Not assigned yet';
  }

  getCampusLabel(request: VerificationRequest): string {
    return request.campus?.trim() || 'USTP Villanueva Campus';
  }

  formatDate(value: any): string {
    if (!value) {
      return '—';
    }

    let date: Date;

    if (typeof value?.toDate === 'function') {
      date = value.toDate();
    } else if (value?.seconds) {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}