import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { SupportService } from '../../services/support.service';

type ConcernType =
  | 'Disabled Account'
  | 'Verification Concern'
  | 'Login Problem'
  | 'Incorrect Account Information'
  | 'Other';

@Component({
  selector: 'app-contact-support',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './contact-support.html',
  styleUrls: ['./contact-support.scss'],
})
export class ContactSupport implements OnInit {
  private supportService = inject(SupportService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  submitting = false;

  fullName = '';
  email = '';
  alumniId = '';
  userUid = '';
  concernType: ConcernType = 'Disabled Account';
  message = '';
  disabledReason = '';
  accountIssue = '';

  readonly concernTypes: ConcernType[] = [
    'Disabled Account',
    'Verification Concern',
    'Login Problem',
    'Incorrect Account Information',
    'Other',
  ];

  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const queryParams = this.route.snapshot.queryParamMap;

      this.userUid = queryParams.get('uid') || '';
      this.fullName = queryParams.get('name') || '';
      this.email = queryParams.get('email') || '';
      this.disabledReason = queryParams.get('reason') || '';
      this.accountIssue = queryParams.get('issue') || '';

      const concern = queryParams.get('concern') || '';

      if (this.concernTypes.includes(concern as ConcernType)) {
        this.concernType = concern as ConcernType;
      }

      if (this.userUid) {
        const userInfo = await this.supportService.getUserBasicInfo(this.userUid);

        if (userInfo) {
          this.fullName = this.fullName || userInfo.fullName || '';
          this.email = this.email || userInfo.email || '';
          this.alumniId = userInfo.alumniId || '';
          this.disabledReason = this.disabledReason || userInfo.disabledReason || '';
          this.accountIssue = this.accountIssue || userInfo.accountIssue || '';
        }
      }

      if (this.disabledReason && !this.message.trim()) {
        this.message =
          'My account was disabled and I would like to request assistance or clarification regarding this concern.';
      }
    } catch (error) {
      console.error('Failed to load support page data:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async submitTicket(): Promise<void> {
    if (this.submitting) return;

    const fullName = this.fullName.trim();
    const email = this.email.trim().toLowerCase();
    const message = this.message.trim();

    if (!fullName || !email || !this.concernType || !message) {
      await Swal.fire({
        icon: 'warning',
        title: 'Incomplete Form',
        text: 'Please provide your full name, email, concern type, and message.',
        confirmButtonColor: '#7c5cff',
      });
      return;
    }

    if (!this.isValidEmail(email)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Email',
        text: 'Please enter a valid email address.',
        confirmButtonColor: '#7c5cff',
      });
      return;
    }

    this.submitting = true;
    this.cdr.detectChanges();

    try {
      const ticketId = await this.supportService.createSupportTicket({
        fullName,
        email,
        alumniId: this.alumniId.trim(),
        userUid: this.userUid.trim(),
        concernType: this.concernType,
        message,
        accountIssue: this.accountIssue || this.concernType,
        disabledReason: this.disabledReason.trim(),
        status: 'open',
      });

      await Swal.fire({
        icon: 'success',
        title: 'Support Ticket Submitted',
        html: `
          <p style="margin:0 0 0.75rem;color:#374151;font-size:0.95rem;line-height:1.5;">
            Your concern has been submitted successfully.
          </p>
          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:0.75rem;text-align:left;">
            <p style="margin:0;font-size:0.8rem;color:#6b7280;">Ticket Reference</p>
            <p style="margin:0.25rem 0 0;font-size:0.9rem;color:#111827;font-weight:700;">${ticketId}</p>
          </div>
        `,
        confirmButtonText: 'Back to Login',
        confirmButtonColor: '#7c5cff',
      });

      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('Failed to submit support ticket:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: 'Something went wrong while submitting your concern. Please try again.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  clearForm(): void {
    this.fullName = '';
    this.email = '';
    this.alumniId = '';
    this.userUid = '';
    this.concernType = 'Disabled Account';
    this.message = '';
    this.disabledReason = '';
    this.accountIssue = '';
    this.cdr.detectChanges();
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}