import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { VerificationService } from '../../../services/verification.service';
import { VerificationRequest } from '../../../models/verification.model';
import { User } from '../../../models/user.model';

const CLOUDINARY_CLOUD_NAME = 'dr10qcgym';
const CLOUDINARY_UPLOAD_PRESET = 'atms_unsigned_upload';

@Component({
  selector: 'app-verification-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verification-status.html',
  styleUrls: ['./verification-status.scss'],
})
export class VerificationStatus implements OnInit, OnDestroy {
  verificationRequest: VerificationRequest | null = null;
  currentUser: User | null = null;

  loading = true;
  errorMessage = '';

  uploading = false;
  uploadProgress = 0;

  private currentUid = '';
  private requestSub?: Subscription;

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private verificationService: VerificationService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    const user = await this.authService.waitForAuthReady();

    if (!user) {
      await this.router.navigate(['/login']);
      return;
    }

    this.currentUid = user.uid;

    try {
      this.currentUser = await this.usersService.getUserById(user.uid);
    } catch {
      // Non-fatal — ID card degrades gracefully
    }

    this.loadVerificationStatus(user.uid, user.email || '');
  }

  ngOnDestroy(): void {
    this.requestSub?.unsubscribe();
  }

  // ── Computed display helpers ──────────────────────────────────────────────

  get displayName(): string {
    const u = this.currentUser;
    if (!u) return '';
    return (
      u.fullName ||
      [
        u.firstName,
        u.middleName ? `${u.middleName.charAt(0).toUpperCase()}.` : '',
        u.lastName,
        u.suffix,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      u.email ||
      ''
    );
  }

  get photoUrl(): string {
    return (this.currentUser?.photoUrl || '').trim();
  }

  get program(): string {
    return (
      this.currentUser?.program ||
      (this.verificationRequest as any)?.program ||
      ''
    );
  }

  get yearGraduated(): number | string {
    return this.currentUser?.yearGraduated || '';
  }

  get campus(): string {
    return (
      this.verificationRequest?.campus ||
      this.currentUser?.campus ||
      'USTP Villanueva Campus'
    );
  }

  // ── Photo upload via Cloudinary ───────────────────────────────────────────

  triggerPhotoUpload(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = (e) => this.handlePhotoFile(e);
    input.click();
  }

  private async handlePhotoFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.currentUid) return;

    if (file.size > 5 * 1024 * 1024) {
      await Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'Please upload an image under 5 MB.',
        confirmButtonColor: '#1e3a8a',
      });
      return;
    }

    this.uploading = true;
    this.uploadProgress = 0;
    this.cdr.detectChanges();

    try {
      const url = await this.uploadToCloudinary(file);

      await this.usersService.updateUser(this.currentUid, { photoUrl: url });
      this.currentUser = { ...this.currentUser!, photoUrl: url };

      await Swal.fire({
        icon: 'success',
        title: 'Photo Saved',
        text: 'Your ID photo has been updated successfully.',
        confirmButtonColor: '#1e3a8a',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error('Photo upload failed:', err);

      // Detect Cloudinary moderation rejection
      const isModerationRejected =
        err?.moderated === true ||
        String(err?.message || '')
          .toLowerCase()
          .includes('moderat');

      if (isModerationRejected) {
        await Swal.fire({
          icon: 'error',
          title: 'Photo Rejected',
          html: `
            <p style="margin:0 0 0.6rem;color:#374151;font-size:0.92rem;line-height:1.5;">
              Your photo was rejected because it may contain <strong>inappropriate content</strong>.
            </p>
            <p style="margin:0;color:#6b7280;font-size:0.84rem;line-height:1.45;">
              Please upload a clear, professional photo of yourself with a plain background.
              Your ID photo represents you as an official USTP alumni.
            </p>
          `,
          confirmButtonText: 'Try Again',
          confirmButtonColor: '#1e3a8a',
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Upload Failed',
          text:
            err?.message ||
            'Unable to upload your photo. Please try again.',
          confirmButtonColor: '#1e3a8a',
        });
      }
    } finally {
      this.uploading = false;
      this.cdr.detectChanges();
    }
  }

  private uploadToCloudinary(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      // Using uid as public_id so re-uploads overwrite the same asset
      formData.append('public_id', `alumni-id-photos/${this.currentUid}`);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          this.uploadProgress = Math.round((e.loaded / e.total) * 100);
          this.cdr.detectChanges();
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);

            // Cloudinary moderation: image was flagged and held/rejected
            if (
              response.moderation &&
              response.moderation.length > 0 &&
              response.moderation[0].status === 'rejected'
            ) {
              reject({ moderated: true, message: 'Image rejected by moderation.' });
              return;
            }

            resolve(response.secure_url);
          } catch {
            reject(new Error('Invalid response from Cloudinary.'));
          }
        } else {
          // Parse Cloudinary error body for moderation-specific messages
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            const errorMsg: string =
              errorResponse?.error?.message || `Upload failed with status ${xhr.status}.`;

            const isModerated =
              errorMsg.toLowerCase().includes('moderat') ||
              errorMsg.toLowerCase().includes('inappropriate') ||
              errorMsg.toLowerCase().includes('explicit');

            reject({
              moderated: isModerated,
              message: errorMsg,
            });
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}.`));
          }
        }
      });

      xhr.addEventListener('error', () =>
        reject(new Error('Network error during upload.'))
      );

      xhr.open(
        'POST',
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
      );
      xhr.send(formData);
    });
  }

  // ── Print ─────────────────────────────────────────────────────────────────

  printDigitalId(): void {
    window.print();
  }

  // ── Verification loading ──────────────────────────────────────────────────

  private loadVerificationStatus(userUid: string, email: string): void {
    this.loading = true;
    this.errorMessage = '';
    this.requestSub?.unsubscribe();

    this.requestSub = this.verificationService
      .getLatestVerificationRequestByUser(userUid, email)
      .subscribe({
        next: (request) => {
          this.zone.run(() => {
            this.verificationRequest = request
              ? { ...request, status: this.normalizeStatus(request.status) }
              : null;
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          this.zone.run(() => {
            console.error('Failed to load verification status:', error);
            this.verificationRequest = null;
            this.loading = false;
            this.errorMessage =
              'Unable to load verification status. Please try again later.';
            this.cdr.detectChanges();
          });
        },
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private normalizeStatus(status: any): VerificationRequest['status'] {
    const value = String(status ?? '')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .trim();

    switch (value) {
      case 'approved':
      case 'verified':
        return 'approved';
      case 'under_review':
      case 'underreview':
      case 'review':
        return 'under_review';
      case 'rejected':
      case 'declined':
        return 'rejected';
      case 'pending':
      default:
        return 'pending';
    }
  }

  formatDate(value: any): string {
    if (!value) return '—';

    let date: Date;

    if (typeof value?.toDate === 'function') {
      date = value.toDate();
    } else if (value?.seconds) {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}