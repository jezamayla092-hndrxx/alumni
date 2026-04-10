import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-profile.html',
  styleUrls: ['./my-profile.scss'],
})
export class MyProfile implements OnInit {
  isEditing = false;
  loading = true;
  saving = false;
  errorMessage = '';

  profile: User = {
    email: '',
    role: 'officer',
    firstName: '',
    lastName: '',
    fullName: '',
    contactNumber: '',
    address: '',
    photoUrl: '',
    isActive: true,
    status: 'verified',
  };

  originalProfile: User | null = null;
  private currentUid = '';

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  get displayName(): string {
    return (
      this.profile.fullName ||
      [this.profile.firstName, this.profile.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      this.profile.email ||
      'User'
    );
  }

  get displayInitials(): string {
    const first = this.profile.firstName?.charAt(0) || '';
    const last = this.profile.lastName?.charAt(0) || '';

    if (first || last) {
      return `${first}${last}`.toUpperCase();
    }

    return (this.profile.email?.charAt(0) || 'U').toUpperCase();
  }

  get displayRole(): string {
    switch (this.profile.role) {
      case 'admin':
        return 'Administrator';
      case 'officer':
        return 'Alumni Officer';
      case 'alumni':
        return 'Alumni';
      default:
        return 'User';
    }
  }

  get accountStatusLabel(): string {
    return this.profile.isActive ? 'Active' : 'Inactive';
  }

  get verificationStatusLabel(): string {
    switch (this.profile.status) {
      case 'verified':
        return 'Verified';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  async loadProfile(): Promise<void> {
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

      const userDoc = await this.usersService.getUserById(authUser.uid);

      if (!userDoc) {
        this.errorMessage = 'Profile record not found.';
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }

      this.profile = {
        ...userDoc,
        firstName: userDoc.firstName ?? '',
        lastName: userDoc.lastName ?? '',
        fullName: userDoc.fullName ?? '',
        contactNumber: userDoc.contactNumber ?? '',
        address: userDoc.address ?? '',
        photoUrl: userDoc.photoUrl ?? '',
      };

      this.originalProfile = JSON.parse(JSON.stringify(this.profile));
    } catch (error) {
      console.error('Failed to load profile:', error);
      this.errorMessage = 'Failed to load profile data.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  toggleEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;

    if (this.originalProfile) {
      this.profile = JSON.parse(JSON.stringify(this.originalProfile));
    }

    this.cdr.detectChanges();
  }

  async saveProfile(): Promise<void> {
    if (!this.currentUid) {
      this.errorMessage = 'Missing user ID.';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const firstName = (this.profile.firstName || '').trim();
      const lastName = (this.profile.lastName || '').trim();

      const updatePayload: Partial<User> = {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        contactNumber: (this.profile.contactNumber || '').trim(),
        address: (this.profile.address || '').trim(),
        photoUrl: (this.profile.photoUrl || '').trim(),
      };

      await this.usersService.updateUser(this.currentUid, updatePayload);

      this.profile = {
        ...this.profile,
        ...updatePayload,
      };

      this.originalProfile = JSON.parse(JSON.stringify(this.profile));
      this.isEditing = false;
    } catch (error) {
      console.error('Failed to save profile:', error);
      this.errorMessage = 'Failed to save profile changes.';
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }
}