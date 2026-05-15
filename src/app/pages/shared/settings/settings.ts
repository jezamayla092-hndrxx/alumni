import { NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [NgIf, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class Settings implements OnInit {
  loading = true;
  sendingPasswordReset = false;

  currentUid = '';
  currentEmail = '';
  currentUserName = '';
  currentUserRole = '';

  errorMessage = '';

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadSecurityData();
  }

  async loadSecurityData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const authUser = await this.authService.getAuthState();

      if (!authUser) {
        await this.router.navigate(['/login']);
        return;
      }

      this.currentUid = authUser.uid;
      this.currentEmail = authUser.email || '';

      const userDoc = await this.usersService.getUserById(authUser.uid);

      this.currentUserName =
        this.getUserDisplayName(userDoc) ||
        authUser.displayName ||
        this.currentEmail ||
        'User';

      this.currentUserRole = userDoc?.role || '';
    } catch (error) {
      console.error('Failed to load account security data:', error);
      this.errorMessage = 'Failed to load password and security settings.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async sendPasswordReset(): Promise<void> {
    if (!this.currentEmail) {
      await Swal.fire({
        icon: 'error',
        title: 'Missing Email',
        text: 'No email address is linked to this account.',
        confirmButtonColor: '#1e3a8a',
      });
      return;
    }

    const result = await Swal.fire({
      icon: 'question',
      title: 'Send Password Reset Link?',
      text: `A password reset link will be sent to ${this.currentEmail}.`,
      showCancelButton: true,
      confirmButtonText: 'Send Link',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1e3a8a',
      cancelButtonColor: '#64748b',
    });

    if (!result.isConfirmed) return;

    this.sendingPasswordReset = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      await this.authService.sendPasswordResetEmail(this.currentEmail);

      await Swal.fire({
        icon: 'success',
        title: 'Reset Link Sent',
        text: 'Please check your email inbox for the password reset link.',
        confirmButtonColor: '#1e3a8a',
      });
    } catch (error: any) {
      console.error('Failed to send password reset link:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Failed to Send Link',
        text: error?.message || 'Unable to send password reset link. Please try again.',
        confirmButtonColor: '#1e3a8a',
      });
    } finally {
      this.sendingPasswordReset = false;
      this.cdr.detectChanges();
    }
  }

  private getUserDisplayName(user: User | null): string {
    if (!user) return '';

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
      ''
    );
  }
}