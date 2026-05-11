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
          text: 'Your resubmitted verification request is currently under review. Please wait for the officer’s decision.',
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
                  ${remarks}
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

      if (user.isActive === false) {
        this.stopLoading();
        await Swal.fire({
          icon: 'error',
          title: 'Account Disabled',
          text: 'Your account is inactive. Please contact the administrator.',
        });
        await this.authService.logout();
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
}