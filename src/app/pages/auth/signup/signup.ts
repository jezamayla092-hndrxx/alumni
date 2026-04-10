import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { VerificationService } from '../../../services/verification.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrls: ['./signup.scss'],
})
export class Signup {
  firstName = '';
  lastName = '';
  email = '';
  studentId = '';
  program = '';
  yearGraduated: number | null = null;
  password = '';
  confirmPassword = '';

  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  programs = [
    'Information Technology',
    'Technology Communication Management',
    'Electro-Mechanical Technology',
  ];

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private verificationService: VerificationService,
    private router: Router
  ) {}

  async onSignup(): Promise<void> {
    const firstName = this.firstName.trim();
    const lastName = this.lastName.trim();
    const email = this.email.trim().toLowerCase();
    const studentId = this.studentId.trim();
    const program = this.program.trim();
    const password = this.password.trim();
    const confirmPassword = this.confirmPassword.trim();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !studentId ||
      !program ||
      !this.yearGraduated ||
      !password ||
      !confirmPassword
    ) {
      await Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please complete all required fields.',
        confirmButtonText: 'OK',
      });
      return;
    }

    if (password.length < 6) {
      await Swal.fire({
        icon: 'warning',
        title: 'Weak Password',
        text: 'Password must be at least 6 characters.',
        confirmButtonText: 'OK',
      });
      return;
    }

    if (password !== confirmPassword) {
      await Swal.fire({
        icon: 'error',
        title: 'Password Mismatch',
        text: 'Password and confirm password do not match.',
        confirmButtonText: 'OK',
      });
      return;
    }

    this.loading = true;

    try {
      const credential = await this.authService.signup(email, password);
      const uid = credential.user.uid;
      const fullName = `${firstName} ${lastName}`;

      const userData: User = {
        id: uid,
        email,
        role: 'alumni',
        fullName,
        firstName,
        lastName,
        studentId,
        program,
        yearGraduated: Number(this.yearGraduated),
        status: 'pending',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      try {
        await this.usersService.createUser(uid, userData);
        console.log('USER CREATED:', uid);

        await this.verificationService.createVerificationRequest({
          userUid: uid,
          alumniId: studentId,
          fullName,
          email,
          program,
          yearGraduated: Number(this.yearGraduated),
          studentId,
        });
        console.log('VERIFICATION REQUEST CREATED:', studentId);
      } catch (firestoreError) {
        console.error('FIRESTORE ERROR:', firestoreError);
        await this.authService.deleteCurrentAuthUser();
        throw firestoreError;
      }

      await Swal.fire({
        icon: 'success',
        title: 'Signup Successful',
        text: 'Your alumni account has been created and sent for verification.',
        confirmButtonText: 'Go to Login',
      });

      await this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('SIGNUP ERROR:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Signup Failed',
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

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered.';
      case 'auth/invalid-email':
        return 'Invalid email format.';
      case 'auth/weak-password':
        return 'Password is too weak.';
      case 'permission-denied':
        return 'Firestore denied access. Please check your Firestore rules.';
      case 'unavailable':
        return 'Service is temporarily unavailable. Please try again.';
      default:
        return 'Signup failed. Please try again.';
    }
  }
}