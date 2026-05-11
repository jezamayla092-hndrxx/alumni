import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
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
export class MyProfile implements OnInit, OnDestroy {
  private destroyed = false;

  isEditing = false;
  loading = true;
  saving = false;
  errorMessage = '';
  profilePhotoError = '';

  profile: User = {
    email: '',
    role: 'officer',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    fullName: '',
    contactNumber: '',
    address: '',
    photoUrl: '',
    studentId: '',
    program: '',
    yearGraduated: undefined,
    birthDate: '',
    sex: '',
    verificationDocuments: [],
    isActive: true,
    status: 'verified',
    verificationStatus: 'verified',
    campus: 'USTP Villanueva Campus',
  };

  originalProfile: User | null = null;
  selectedProfilePhotoFile: File | null = null;
  profilePhotoPreviewUrl = '';
  private currentUid = '';

  private readonly cloudinaryCloudName = 'dr10qcgym';
  private readonly cloudinaryUploadPreset = 'atms_unsigned_upload';

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.revokeProfilePhotoPreview();
  }

  get isAlumni(): boolean {
    return this.profile.role === 'alumni';
  }

  get isOfficer(): boolean {
    return this.profile.role === 'officer';
  }

  get isAdmin(): boolean {
    return this.profile.role === 'admin';
  }

  get isStaffOrAdmin(): boolean {
    return this.isOfficer || this.isAdmin;
  }

  get displayName(): string {
    return (
      this.profile.fullName ||
      this.buildFullName(
        this.profile.firstName || '',
        this.profile.middleName || '',
        this.profile.lastName || '',
        this.isAlumni ? this.profile.suffix || '' : ''
      ) ||
      this.profile.email ||
      'User'
    );
  }

  get displayInitials(): string {
    const source =
      (this.profile.firstName || '').trim() ||
      (this.profile.fullName || '').trim() ||
      (this.profile.email || '').trim() ||
      'U';

    return source.charAt(0).toUpperCase();
  }

  get displayRole(): string {
    switch (this.profile.role) {
      case 'admin':
        return 'Admin';
      case 'officer':
        return 'Alumni Officer';
      case 'alumni':
        return 'Alumni';
      default:
        return 'User';
    }
  }

  get accountStatusLabel(): string {
    return this.profile.isActive !== false ? 'Active' : 'Inactive';
  }

  get verificationStatusLabel(): string {
    const status = this.profile.verificationStatus || this.profile.status;

    switch (status) {
      case 'verified':
        return 'Verified';
      case 'pending':
        return 'Pending';
      case 'under_review':
        return 'Under Review';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  get displayBirthDate(): string {
    if (!this.profile.birthDate) {
      return '';
    }

    const date = new Date(`${this.profile.birthDate}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return this.profile.birthDate;
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  }

  get hasVerificationDocuments(): boolean {
    return !!this.profile.verificationDocuments?.length;
  }

  get visibleProfilePhoto(): string {
    return this.profilePhotoPreviewUrl || this.profile.photoUrl || '';
  }

  get hasProfilePhoto(): boolean {
    return !!(this.profilePhotoPreviewUrl || this.profile.photoUrl || '').trim();
  }

  get hasAddress(): boolean {
    return !!(this.profile.address || '').trim();
  }

  get profileCompletionPercent(): number {
    if (!this.isAlumni) return 100;
    if (!this.hasProfilePhoto) return 75;
    if (!this.hasAddress) return 90;
    return 100;
  }

  async loadProfile(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.profilePhotoError = '';
    this.isEditing = false;
    this.cdr.detectChanges();

    try {
      const authUser = await this.authService.getAuthState();

      if (this.destroyed) return;

      if (!authUser) {
        await this.router.navigate(['/login']);
        return;
      }

      this.currentUid = authUser.uid;

      const userDoc = await this.usersService.getUserById(authUser.uid);

      if (this.destroyed) return;

      if (!userDoc) {
        this.errorMessage = 'Profile record not found.';
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }

      const profileStatus =
        userDoc.verificationStatus ||
        userDoc.status ||
        (userDoc.role === 'alumni' ? 'pending' : 'verified');

      this.profile = {
        ...userDoc,
        firstName: userDoc.firstName ?? '',
        middleName: userDoc.middleName ?? '',
        lastName: userDoc.lastName ?? '',
        suffix: userDoc.suffix ?? '',
        fullName: userDoc.fullName ?? '',
        contactNumber: userDoc.contactNumber ?? '',
        address: userDoc.address ?? '',
        photoUrl: userDoc.photoUrl ?? '',
        studentId: userDoc.studentId ?? '',
        program: userDoc.program ?? '',
        yearGraduated: userDoc.yearGraduated ?? undefined,
        birthDate: userDoc.birthDate ?? '',
        sex: userDoc.sex ?? '',
        verificationDocuments: userDoc.verificationDocuments ?? [],
        status: profileStatus,
        verificationStatus: profileStatus,
        isActive: userDoc.isActive ?? true,
        campus: userDoc.campus ?? 'USTP Villanueva Campus',
      };

      this.originalProfile = JSON.parse(JSON.stringify(this.profile));
    } catch (error) {
      if (this.destroyed) return;
      console.error('Failed to load profile:', error);
      this.errorMessage = 'Failed to load profile data.';
    } finally {
      if (this.destroyed) return;
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  toggleEdit(): void {
    if (this.loading || this.saving) return;

    this.originalProfile = JSON.parse(JSON.stringify(this.profile));
    this.isEditing = true;
    this.profilePhotoError = '';
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.profilePhotoError = '';
    this.errorMessage = '';
    this.selectedProfilePhotoFile = null;
    this.revokeProfilePhotoPreview();

    if (this.originalProfile) {
      this.profile = JSON.parse(JSON.stringify(this.originalProfile));
    }

    this.cdr.detectChanges();
  }

  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.profilePhotoError = '';

    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.profilePhotoError = 'Please upload a JPG, PNG, or WEBP image.';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    if (file.size > maxSize) {
      this.profilePhotoError = 'Profile photo must be 5MB or smaller.';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    this.selectedProfilePhotoFile = file;
    this.revokeProfilePhotoPreview();
    this.profilePhotoPreviewUrl = URL.createObjectURL(file);

    input.value = '';
    this.cdr.detectChanges();
  }

  removeProfilePhoto(): void {
    this.profilePhotoError = '';
    this.selectedProfilePhotoFile = null;
    this.revokeProfilePhotoPreview();
    this.profile.photoUrl = '';
    this.cdr.detectChanges();
  }

  async saveProfile(): Promise<void> {
    if (!this.currentUid) {
      this.errorMessage = 'Missing user ID.';
      this.cdr.detectChanges();
      return;
    }

    if (this.saving) return;

    this.saving = true;
    this.errorMessage = '';
    this.profilePhotoError = '';
    this.cdr.detectChanges();

    try {
      const firstName = (this.profile.firstName || '').trim();
      const middleName = (this.profile.middleName || '').trim();
      const lastName = (this.profile.lastName || '').trim();
      const suffix = this.isAlumni ? (this.profile.suffix || '').trim() : '';

      if (!firstName || !lastName) {
        this.errorMessage = 'First name and last name are required.';
        this.saving = false;
        this.cdr.detectChanges();
        return;
      }

      let photoUrl = (this.profile.photoUrl || '').trim();

      if (this.selectedProfilePhotoFile) {
        photoUrl = await this.withTimeout(
          this.uploadProfilePhoto(this.selectedProfilePhotoFile),
          45000,
          'Uploading profile photo took too long. Please check your internet connection or Cloudinary upload preset.'
        );
      }

      const updatePayload: Partial<User> = {
        firstName,
        middleName,
        lastName,
        fullName: this.buildFullName(firstName, middleName, lastName, suffix),
        contactNumber: (this.profile.contactNumber || '').trim(),
        photoUrl,
        updatedAt: new Date().toISOString(),
      };

      if (this.isAlumni) {
        updatePayload.suffix = suffix;
        updatePayload.birthDate = (this.profile.birthDate || '').trim();
        updatePayload.sex = (this.profile.sex || '').trim();
        updatePayload.address = (this.profile.address || '').trim();
      }

      await this.usersService.updateUser(this.currentUid, updatePayload);

      this.profile = {
        ...this.profile,
        ...updatePayload,
      };

      this.selectedProfilePhotoFile = null;
      this.revokeProfilePhotoPreview();
      this.originalProfile = JSON.parse(JSON.stringify(this.profile));
      this.isEditing = false;
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      this.errorMessage = error?.message || 'Failed to save profile changes.';
    } finally {
      if (this.destroyed) return;
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  openVerificationDocument(url: string): void {
    if (!url) {
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private async uploadProfilePhoto(file: File): Promise<string> {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudinaryCloudName}/image/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.cloudinaryUploadPreset);
    formData.append('folder', 'atms-profile-photos');

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('CLOUDINARY PROFILE PHOTO UPLOAD ERROR:', result);
      throw new Error(result?.error?.message || 'Cloudinary profile photo upload failed.');
    }

    return result.secure_url;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    milliseconds: number,
    message: string
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), milliseconds);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private buildFullName(
    firstName: string,
    middleName: string,
    lastName: string,
    suffix: string
  ): string {
    const middleInitial = middleName ? `${middleName.charAt(0).toUpperCase()}.` : '';

    return [firstName, middleInitial, lastName, suffix].filter(Boolean).join(' ').trim();
  }

  private revokeProfilePhotoPreview(): void {
    if (this.profilePhotoPreviewUrl) {
      URL.revokeObjectURL(this.profilePhotoPreviewUrl);
      this.profilePhotoPreviewUrl = '';
    }
  }
}