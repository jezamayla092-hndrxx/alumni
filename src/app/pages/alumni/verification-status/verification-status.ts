import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
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
  loading = true;
  errorMessage = '';

  verification: VerificationRequest | null = null;

  private verificationSub?: Subscription;

  constructor(
    private authService: AuthService,
    private verificationService: VerificationService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadMyVerificationStatus();
  }

  ngOnDestroy(): void {
    this.verificationSub?.unsubscribe();
  }

  get hasVerification(): boolean {
    return !!this.verification;
  }

  get status(): 'pending' | 'under_review' | 'approved' | 'rejected' | 'none' {
    return this.verification?.status ?? 'none';
  }

  get statusLabel(): string {
    switch (this.status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'under_review':
        return 'Under Review';
      case 'pending':
        return 'Pending';
      default:
        return 'No Request Yet';
    }
  }

  get titleText(): string {
    switch (this.status) {
      case 'approved':
        return "You're Verified";
      case 'rejected':
        return 'Verification Rejected';
      case 'under_review':
        return 'Verification In Progress';
      case 'pending':
        return 'Request Submitted';
      default:
        return 'No Verification Request Found';
    }
  }

  get descriptionText(): string {
    switch (this.status) {
      case 'approved':
        return 'Your alumni status has been successfully verified. You now have full access to all alumni services and benefits.';
      case 'rejected':
        return (
          this.verification?.remarks?.trim() ||
          'Your verification request was reviewed but could not be approved.'
        );
      case 'under_review':
        return 'Your submitted verification request is currently being reviewed by the Alumni Affairs Office.';
      case 'pending':
        return 'Your verification request has been submitted successfully and is waiting for review.';
      default:
        return 'We could not find any verification request linked to your account yet.';
    }
  }

  get alumniId(): string {
    return this.verification?.alumniId?.trim() || 'Not assigned yet';
  }

  get submittedDate(): string {
    return this.formatDate(this.verification?.submittedAt);
  }

  get reviewedDate(): string {
    return this.formatDate(this.verification?.reviewedAt);
  }

  get reviewedBy(): string {
    return this.verification?.reviewedBy?.trim() || 'Alumni Office';
  }

  get remarks(): string {
    return this.verification?.remarks?.trim() || 'No remarks available.';
  }

  async loadMyVerificationStatus(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const authUser = await this.authService.getAuthState();

      if (!authUser?.email) {
        this.zone.run(() => {
          this.loading = false;
          this.errorMessage = 'No logged-in user email found.';
          this.cdr.detectChanges();
        });
        return;
      }

      this.verificationSub?.unsubscribe();

      this.verificationSub = this.verificationService
        .getLatestVerificationRequestByEmail(authUser.email)
        .subscribe({
          next: (request) => {
            this.zone.run(() => {
              this.verification = request;
              this.loading = false;
              this.errorMessage = '';
              this.cdr.detectChanges();
            });
          },
          error: (error) => {
            console.error('Failed to load verification status:', error);

            this.zone.run(() => {
              this.verification = null;
              this.errorMessage =
                'Failed to load your verification status. Please try again.';
              this.loading = false;
              this.cdr.detectChanges();
            });
          },
        });
    } catch (error) {
      console.error('Failed to initialize verification status:', error);

      this.zone.run(() => {
        this.verification = null;
        this.errorMessage =
          'Failed to load your verification status. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  private formatDate(value: any): string {
    if (!value) {
      return 'Not available';
    }

    let date: Date | null = null;

    if (typeof value?.toDate === 'function') {
      date = value.toDate();
    } else if (value instanceof Date) {
      date = value;
    } else {
      const parsed = new Date(value);
      date = Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (!date) {
      return 'Not available';
    }

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }
}