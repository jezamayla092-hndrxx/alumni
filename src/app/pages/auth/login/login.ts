import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { VerificationService } from '../../../services/verification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  email = '';
  password = '';
  loading = false;
  showPassword = false;

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private verificationService: VerificationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async onLogin(): Promise<void> {
    if (this.loading) return;

    const email = this.email.trim().toLowerCase();
    const password = this.password.trim();

    if (!email || !password) {
      await Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please enter your email and password.',
      });
      return;
    }

    this.loading = true;

    try {
      const credential = await this.authService.login(email, password);
      const uid = credential.user.uid;
      const user = await this.usersService.getUserById(uid);

      if (!user) {
        this.stopLoading();
        await Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: 'User record not found.',
        });
        await this.authService.logout();
        return;
      }

      if (user.isActive === false) {
        this.stopLoading();

        const disabledReason = ((user as any).disabledReason || '').trim();
        const disabledByName = ((user as any).disabledByName || '').trim();
        const disabledAt = (user as any).disabledAt || null;

        const result = await Swal.fire({
          icon: 'error',
          title: 'Account Disabled',
          html: `
            <p style="margin:0 0 0.75rem;color:#374151;font-size:0.95rem;line-height:1.5;">
              Your account has been disabled by the administrator.
            </p>

            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:0.85rem 1rem;text-align:left;margin-bottom:0.75rem;">
              <p style="margin:0 0 0.35rem;font-size:0.75rem;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:0.05em;">
                Reason / Remarks
              </p>

              <p style="margin:0;font-size:0.9rem;color:#7f1d1d;font-weight:600;line-height:1.5;">
                ${
                  disabledReason
                    ? this.escapeHtml(disabledReason)
                    : 'No reason was provided. Please contact the alumni office for assistance.'
                }
              </p>
            </div>

            ${
              disabledByName || disabledAt
                ? `
                  <p style="margin:0 0 0.65rem;color:#6b7280;font-size:0.82rem;line-height:1.4;">
                    ${
                      disabledByName
                        ? `Disabled by: <strong>${this.escapeHtml(disabledByName)}</strong><br>`
                        : ''
                    }
                    ${
                      disabledAt
                        ? `Date disabled: <strong>${this.escapeHtml(this.formatDate(disabledAt))}</strong>`
                        : ''
                    }
                  </p>
                `
                : ''
            }

            <p style="margin:0;color:#6b7280;font-size:0.85rem;line-height:1.45;">
              You may contact support if you believe this needs clarification or review.
            </p>
          `,
          showCancelButton: true,
          confirmButtonText: 'Contact Support',
          cancelButtonText: 'Close',
          confirmButtonColor: '#7c5cff',
          cancelButtonColor: '#6b7280',
          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        // ✅ Navigate BEFORE logout to prevent auth state change from redirecting first
        if (result.isConfirmed) {
          await this.router.navigate(['/contact-support'], {
            queryParams: {
              uid,
              name: this.getAccountName(user),
              email: user.email || email,
              reason: disabledReason,
              issue: 'Disabled Account',
              concern: 'Disabled Account',
            },
          });
        }

        await this.authService.logout();
        return;
      }

      const userStatus = (user.verificationStatus || user.status || '').toLowerCase();

      if (user.role === 'alumni' && userStatus === 'pending') {
        this.stopLoading();
        await Swal.fire({
          icon: 'info',
          title: 'Account Pending Verification',
          text: 'Your account is still waiting for officer verification. Please wait until your account is approved.',
        });
        await this.authService.logout();
        return;
      }

      if (user.role === 'alumni' && userStatus === 'under_review') {
        this.stopLoading();
        await Swal.fire({
          icon: 'info',
          title: 'Account Under Review',
          text: 'Your resubmitted verification request is currently under review. Please wait for the officer\u2019s decision.',
        });
        await this.authService.logout();
        return;
      }

      if (user.role === 'alumni' && userStatus === 'rejected') {
        this.stopLoading();

        const remarks = ((user as any).remarks || '').trim();
        const requestId = await this.verificationService.getLatestRequestIdByUserUid(uid);

        sessionStorage.setItem(
          'appealSession',
          JSON.stringify({
            uid,
            requestId: requestId || '',
            firstName: user.firstName || '',
            middleName: user.middleName || '',
            lastName: user.lastName || '',
            suffix: user.suffix || '',
            email: user.email || '',
            contactNumber: user.contactNumber || '',
            contactDialCode: (user as any).contactDialCode || '+63',
            studentId: (user as any).studentId || '',
            program: user.program || '',
            yearGraduated: user.yearGraduated || null,
            birthDate: (user as any).birthDate || '',
            sex: (user as any).sex || '',
          })
        );

        const result = await Swal.fire({
          icon: 'error',
          title: 'Verification Rejected',
          html: remarks
            ? `
              <p style="margin:0 0 0.75rem;color:#374151;font-size:0.95rem;">
                Your alumni verification request has been rejected.
              </p>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:0.75rem 1rem;text-align:left;margin-bottom:0.75rem;">
                <p style="margin:0 0 0.3rem;font-size:0.75rem;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.05em;">
                  Officer's Remarks
                </p>
                <p style="margin:0;font-size:0.9rem;color:#7f1d1d;font-weight:500;line-height:1.5;">
                  ${this.escapeHtml(remarks)}
                </p>
              </div>
              <p style="margin:0;color:#6b7280;font-size:0.85rem;">
                You may correct your information and resubmit for appeal.
              </p>
            `
            : `<p style="margin:0;color:#374151;font-size:0.95rem;">Your alumni verification request has been rejected. Please correct your information and resubmit for appeal.</p>`,
          showCancelButton: true,
          confirmButtonText: 'Appeal / Resubmit',
          cancelButtonText: 'Dismiss',
          confirmButtonColor: '#7c5cff',
          cancelButtonColor: '#6b7280',
          reverseButtons: false,
        });

        if (result.isConfirmed) {
          await this.router.navigate(['/signup'], {
            queryParams: { mode: 'appeal' },
          });
        } else {
          sessionStorage.removeItem('appealSession');
          await this.authService.logout();
        }

        return;
      }

      Swal.close();
      document.body.classList.remove(
        'swal2-height-auto',
        'swal2-shown',
        'swal2-no-backdrop'
      );
      document.body.style.removeProperty('padding-right');
      document.body.style.removeProperty('overflow');

      switch (user.role) {
        case 'admin':
          await this.router.navigate(['/admin/dashboard']);
          break;

        case 'officer':
          await this.router.navigate(['/officer/dashboard']);
          break;

        case 'alumni':
          await this.router.navigate(['/alumni/dashboard']);
          break;

        default:
          this.stopLoading();
          await Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: 'Unknown user role.',
          });
          await this.authService.logout();
          return;
      }

      void Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Welcome back, ${user.fullName || user.email}!`,
        showConfirmButton: false,
        timer: 1800,
        timerProgressBar: true,
      });
    } catch (error) {
      this.stopLoading();
      await Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: 'Invalid email or password.',
      });
      return;
    } finally {
      this.loading = false;
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  private stopLoading(): void {
    this.loading = false;
    this.cdr.detectChanges();
  }

  private getAccountName(user: any): string {
    return (
      user.fullName ||
      [
        user.firstName,
        user.middleName ? `${user.middleName.charAt(0).toUpperCase()}.` : '',
        user.lastName,
        user.suffix,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      user.email ||
      'User'
    );
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatDate(value: any): string {
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
}