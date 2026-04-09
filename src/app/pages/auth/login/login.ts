import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { User } from '../../../models/user.model';

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
    private router: Router
  ) {}

  async onLogin(): Promise<void> {
    const email = this.email.trim().toLowerCase();
    const password = this.password.trim();

    if (!email || !password) {
      await Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please enter your email and password.',
        confirmButtonText: 'OK',
      });
      return;
    }

    this.loading = true;

    try {
      const credential = await this.authService.login(email, password);
      const uid = credential.user.uid;

      const user = await this.usersService.getUserById(uid);

      if (!user) {
        await Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: 'User record was not found in Firestore.',
          confirmButtonText: 'OK',
        });

        await this.authService.logout();
        return;
      }

      if (user.isActive === false) {
        await Swal.fire({
          icon: 'error',
          title: 'Account Disabled',
          text: 'Your account is inactive. Please contact the administrator.',
          confirmButtonText: 'OK',
        });

        await this.authService.logout();
        return;
      }

      if (user.status === 'pending') {
        await Swal.fire({
          icon: 'info',
          title: 'Account Pending',
          text: 'Your account is still waiting for officer approval.',
          confirmButtonText: 'OK',
        });

        await this.authService.logout();
        return;
      }

      if (user.status === 'rejected') {
        await Swal.fire({
          icon: 'error',
          title: 'Account Rejected',
          text: 'Your account request has been rejected. Please contact the alumni office.',
          confirmButtonText: 'OK',
        });

        await this.authService.logout();
        return;
      }

      await Swal.fire({
        icon: 'success',
        title: 'Login Successful',
        text: `Welcome back, ${user.fullName || user.email}!`,
        timer: 1500,
        showConfirmButton: false,
      });

      await this.redirectByRole(user);
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: this.getErrorMessage(error?.code),
        confirmButtonText: 'OK',
      });
    } finally {
      this.loading = false;
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  private async redirectByRole(user: User): Promise<void> {
    await this.router.navigate(['/layout-test']);
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/invalid-email':
        return 'Invalid email format.';
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password.';
      case 'auth/missing-password':
        return 'Password is required.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return 'Login failed. Please try again.';
    }
  }
}