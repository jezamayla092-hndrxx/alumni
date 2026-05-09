import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';

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

        await Swal.fire({
          icon: 'error',
          title: 'Account Disabled',
          text: 'Your account is inactive.',
        });

        await this.authService.logout();
        return;
      }

      if (user.status === 'pending') {
        this.stopLoading();

        await Swal.fire({
          icon: 'warning',
          title: 'Account Pending',
          text: 'Your account is still pending approval.',
        });

        await this.authService.logout();
        return;
      }

      if (user.status === 'rejected') {
        this.stopLoading();

        await Swal.fire({
          icon: 'error',
          title: 'Account Rejected',
          text: 'Your account has been rejected.',
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