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
          text: 'User record not found.',
        });

        await this.authService.logout();
        return;
      }

      if (user.isActive === false) {
        await Swal.fire({
          icon: 'error',
          title: 'Account Disabled',
          text: 'Your account is inactive.',
        });

        await this.authService.logout();
        return;
      }

      // TEMPORARY: allow pending users for UI testing only
      if (user.status === 'pending') {
        await Swal.fire({
          icon: 'info',
          title: 'Development Mode',
          text: 'Pending account allowed for UI testing.',
          timer: 1200,
          showConfirmButton: false,
        });
      }

      // KEEP THIS BLOCK
      if (user.status === 'rejected') {
        await Swal.fire({
          icon: 'error',
          title: 'Account Rejected',
          text: 'Your account has been rejected.',
        });

        await this.authService.logout();
        return;
      }

      await Swal.fire({
        icon: 'success',
        title: 'Login Successful',
        text: `Welcome back, ${user.fullName || user.email}!`,
        timer: 1200,
        showConfirmButton: false,
      });

      /**
       * TEMPORARY HARD CODED REDIRECT
       * Current phase is Officer UI building.
       * Later replace this with role-based routing:
       * - admin -> /admin/dashboard
       * - officer -> /officer/dashboard
       * - alumni -> /alumni/dashboard
       */
      await this.router.navigate(['/officer/dashboard']);

    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: 'Invalid email or password.',
      });
    } finally {
      this.loading = false;
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}