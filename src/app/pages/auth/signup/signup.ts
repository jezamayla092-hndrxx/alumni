import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { VerificationService } from '../../../services/verification.service';
import { User } from '../../../models/user.model';

interface SelectedVerificationDocument {
  file: File;
  previewUrl: string;
  kind: 'image';
}

interface UploadedVerificationDocument {
  fileName: string;
  fileType: string;
  url: string;
}

interface CountryOption {
  name: string;
  dialCode: string;
  example: string;
  code: string;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrls: ['./signup.scss'],
})
export class Signup implements OnInit, OnDestroy {
  isAppealMode = false;
  appealUid = '';
  appealRequestId = '';

  firstName = '';
  middleName = '';
  lastName = '';
  suffix = '';
  email = '';
  contactNumber = '';
  phoneNumber = '';
  studentId = '';
  program = '';
  yearGraduated: number | null = null;
  password = '';
  confirmPassword = '';

  selectedDocuments: SelectedVerificationDocument[] = [];

  // ── ID Photo (face photo for Digital ID) ─────────────────────────────────
  idPhotoFile: File | null = null;
  idPhotoPreviewUrl = '';
  idPhotoUploading = false;
  idPhotoProgress = 0;

  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  birthDate = '';
  birthDateDisplay = '';
  sex = '';
  dataPrivacyConsent = false;

  private readonly cloudinaryCloudName = 'dr10qcgym';
  private readonly cloudinaryUploadPreset = 'atms_unsigned_upload';
  private readonly cloudinaryFolder = 'atms-verification-documents';
  private readonly cloudinaryIdPhotoFolder = 'atms-id-photos';

  readonly yearGraduatedOptions = [2025, 2024];
  readonly sexOptions = ['Male', 'Female'];

  readonly countries: CountryOption[] = [
    { name: 'Philippines',        dialCode: '+63',  example: '9123456789', code: 'ph' },
    { name: 'United States',      dialCode: '+1',   example: '2025550125', code: 'us' },
    { name: 'Canada',             dialCode: '+1',   example: '4165550125', code: 'ca' },
    { name: 'United Kingdom',     dialCode: '+44',  example: '7123456789', code: 'gb' },
    { name: 'Australia',          dialCode: '+61',  example: '412345678',  code: 'au' },
    { name: 'New Zealand',        dialCode: '+64',  example: '211234567',  code: 'nz' },
    { name: 'Singapore',          dialCode: '+65',  example: '81234567',   code: 'sg' },
    { name: 'Malaysia',           dialCode: '+60',  example: '123456789',  code: 'my' },
    { name: 'Indonesia',          dialCode: '+62',  example: '8123456789', code: 'id' },
    { name: 'Thailand',           dialCode: '+66',  example: '812345678',  code: 'th' },
    { name: 'Vietnam',            dialCode: '+84',  example: '912345678',  code: 'vn' },
    { name: 'Japan',              dialCode: '+81',  example: '9012345678', code: 'jp' },
    { name: 'South Korea',        dialCode: '+82',  example: '1012345678', code: 'kr' },
    { name: 'China',              dialCode: '+86',  example: '13123456789',code: 'cn' },
    { name: 'Hong Kong',          dialCode: '+852', example: '51234567',   code: 'hk' },
    { name: 'Taiwan',             dialCode: '+886', example: '912345678',  code: 'tw' },
    { name: 'India',              dialCode: '+91',  example: '9876543210', code: 'in' },
    { name: 'United Arab Emirates',dialCode: '+971',example: '501234567',  code: 'ae' },
    { name: 'Saudi Arabia',       dialCode: '+966', example: '501234567',  code: 'sa' },
    { name: 'Qatar',              dialCode: '+974', example: '33123456',   code: 'qa' },
    { name: 'Kuwait',             dialCode: '+965', example: '51234567',   code: 'kw' },
    { name: 'Bahrain',            dialCode: '+973', example: '36001234',   code: 'bh' },
    { name: 'Oman',               dialCode: '+968', example: '91234567',   code: 'om' },
    { name: 'Germany',            dialCode: '+49',  example: '15123456789',code: 'de' },
    { name: 'France',             dialCode: '+33',  example: '612345678',  code: 'fr' },
    { name: 'Italy',              dialCode: '+39',  example: '3123456789', code: 'it' },
    { name: 'Spain',              dialCode: '+34',  example: '612345678',  code: 'es' },
    { name: 'Netherlands',        dialCode: '+31',  example: '612345678',  code: 'nl' },
  ];

  selectedCountry: CountryOption = this.countries[0];

  readonly programs = [
    'Information Technology',
    'Technology Communication Management',
    'Electro-Mechanical Technology',
  ];

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private verificationService: VerificationService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (mode === 'appeal') {
      this.isAppealMode = true;
      this.prefillFromAppealSession();
    }
  }

  ngOnDestroy(): void {
    this.selectedDocuments.forEach((doc) => URL.revokeObjectURL(doc.previewUrl));
    if (this.idPhotoPreviewUrl) URL.revokeObjectURL(this.idPhotoPreviewUrl);
  }

  // ── ID Photo ──────────────────────────────────────────────────────────────

  onIdPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // reset so re-selecting same file triggers change

    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      void Swal.fire({
        icon: 'warning',
        title: 'Invalid File Type',
        text: 'Please upload a JPG, PNG, or WEBP image for your ID photo.',
        confirmButtonColor: '#6d28d9',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      void Swal.fire({
        icon: 'warning',
        title: 'File Too Large',
        text: 'Your ID photo must be under 5 MB.',
        confirmButtonColor: '#6d28d9',
      });
      return;
    }

    if (this.idPhotoPreviewUrl) URL.revokeObjectURL(this.idPhotoPreviewUrl);

    this.idPhotoFile = file;
    this.idPhotoPreviewUrl = URL.createObjectURL(file);
    this.cdr.detectChanges();
  }

  removeIdPhoto(): void {
    if (this.idPhotoPreviewUrl) URL.revokeObjectURL(this.idPhotoPreviewUrl);
    this.idPhotoFile = null;
    this.idPhotoPreviewUrl = '';
    this.cdr.detectChanges();
  }

  private async uploadIdPhoto(uid: string): Promise<string> {
    if (!this.idPhotoFile) return '';

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', this.idPhotoFile!);
      formData.append('upload_preset', this.cloudinaryUploadPreset);
      // Use uid as public_id so it's uniquely identifiable and replaceable
      formData.append('public_id', `${this.cloudinaryIdPhotoFolder}/${uid}`);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          this.idPhotoProgress = Math.round((e.loaded / e.total) * 100);
          this.cdr.detectChanges();
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);

            // Check Cloudinary AI moderation rejection
            if (
              response.moderation?.length > 0 &&
              response.moderation[0].status === 'rejected'
            ) {
              reject({ moderated: true, message: 'ID photo rejected by moderation.' });
              return;
            }

            resolve(response.secure_url);
          } catch {
            reject(new Error('Invalid response from Cloudinary.'));
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            const errorMsg: string = errorResponse?.error?.message || `Upload failed (${xhr.status}).`;
            const isModerated =
              errorMsg.toLowerCase().includes('moderat') ||
              errorMsg.toLowerCase().includes('inappropriate') ||
              errorMsg.toLowerCase().includes('explicit');
            reject({ moderated: isModerated, message: errorMsg });
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}.`));
          }
        }
      });

      xhr.addEventListener('error', () =>
        reject(new Error('Network error during ID photo upload.'))
      );

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${this.cloudinaryCloudName}/image/upload`);
      xhr.send(formData);
    });
  }

  private async handleIdPhotoUploadError(err: any): Promise<boolean> {
    const isModerated = err?.moderated === true ||
      String(err?.message || '').toLowerCase().includes('moderat');

    if (isModerated) {
      await Swal.fire({
        icon: 'error',
        title: 'ID Photo Rejected',
        html: `
          <p style="margin:0 0 0.6rem;color:#374151;font-size:0.92rem;line-height:1.5;">
            Your photo was rejected because it may contain <strong>inappropriate content</strong>.
          </p>
          <p style="margin:0;color:#6b7280;font-size:0.84rem;line-height:1.45;">
            Please upload a clear, professional face photo with a plain background.
            This photo will appear on your official Alumni Digital ID.
          </p>
        `,
        confirmButtonText: 'Try Again',
        confirmButtonColor: '#6d28d9',
      });
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Photo Upload Failed',
        text: err?.message || 'Unable to upload your ID photo. Please try again.',
        confirmButtonColor: '#6d28d9',
      });
    }

    return false; // signals caller to abort
  }

  // ── Document selection ────────────────────────────────────────────────────

  onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    const maxFiles = 6;

    for (const file of files) {
      if (this.selectedDocuments.length >= maxFiles) {
        void Swal.fire({
          icon: 'warning',
          title: 'Upload Limit Reached',
          text: `You can upload up to ${maxFiles} document images only.`,
          confirmButtonText: 'OK',
        });
        break;
      }

      if (!allowedTypes.includes(file.type)) {
        void Swal.fire({
          icon: 'warning',
          title: 'Invalid File',
          text: `${file.name} is not supported. Please upload JPG, PNG, or WEBP only.`,
          confirmButtonText: 'OK',
        });
        continue;
      }

      if (file.size > maxSize) {
        void Swal.fire({
          icon: 'warning',
          title: 'File Too Large',
          text: `${file.name} exceeds 5MB.`,
          confirmButtonText: 'OK',
        });
        continue;
      }

      const alreadyAdded = this.selectedDocuments.some(
        (doc) => doc.file.name === file.name && doc.file.size === file.size
      );
      if (alreadyAdded) continue;

      this.selectedDocuments.push({
        file,
        previewUrl: URL.createObjectURL(file),
        kind: 'image',
      });
    }

    this.selectedDocuments = [...this.selectedDocuments];
    input.value = '';
    this.cdr.detectChanges();
  }

  removeDocument(index: number): void {
    const [removed] = this.selectedDocuments.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    this.selectedDocuments = [...this.selectedDocuments];
    this.cdr.detectChanges();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Signup / Appeal ───────────────────────────────────────────────────────

  async onSignup(): Promise<void> {
    if (this.loading) return;
    if (this.isAppealMode) {
      await this.onAppealResubmit();
      return;
    }
    await this.onNewSignup();
  }

  private async onNewSignup(): Promise<void> {
    const firstName       = this.firstName.trim();
    const middleName      = this.middleName.trim();
    const lastName        = this.lastName.trim();
    const suffix          = this.suffix.trim();
    const email           = this.email.trim().toLowerCase();
    const studentId       = this.studentId.trim();
    const program         = this.program.trim();
    const cleanedPhone    = this.phoneNumber.replace(/\D/g, '');
    const contactNumber   = `${this.selectedCountry.dialCode}${cleanedPhone}`;
    const password        = this.password.trim();
    const confirmPassword = this.confirmPassword.trim();

    if (
      !firstName || !lastName || !email || !cleanedPhone ||
      !studentId || !program || !this.yearGraduated ||
      !password || !confirmPassword || !this.birthDate || !this.sex
    ) {
      await Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please complete all required fields.', confirmButtonText: 'OK' });
      return;
    }

    if (!this.idPhotoFile) {
      await Swal.fire({
        icon: 'warning',
        title: 'ID Photo Required',
        text: 'Please upload a clear face photo for your Digital Alumni ID.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#6d28d9',
      });
      return;
    }

    if (this.selectedDocuments.length === 0) {
      await Swal.fire({ icon: 'warning', title: 'Missing Documents', text: 'Please upload at least one verification document image.', confirmButtonText: 'OK' });
      return;
    }

    if (!/^\+[0-9]{10,15}$/.test(contactNumber)) {
      await Swal.fire({ icon: 'warning', title: 'Invalid Contact Number', text: `Please enter a valid contact number. Example: ${this.selectedCountry.dialCode}${this.selectedCountry.example}`, confirmButtonText: 'OK' });
      return;
    }

    if (!this.isValidEmail(email)) {
      await Swal.fire({ icon: 'warning', title: 'Invalid Email', text: 'Please enter a valid email address.', confirmButtonText: 'OK' });
      return;
    }

    if (password.length < 6) {
      await Swal.fire({ icon: 'warning', title: 'Weak Password', text: 'Password must be at least 6 characters.', confirmButtonText: 'OK' });
      return;
    }

    if (password !== confirmPassword) {
      await Swal.fire({ icon: 'error', title: 'Password Mismatch', text: 'Password and confirm password do not match.', confirmButtonText: 'OK' });
      return;
    }

    if (!this.dataPrivacyConsent) {
      await Swal.fire({ icon: 'warning', title: 'Data Privacy Consent', text: 'Please confirm the data privacy consent before proceeding.', confirmButtonText: 'OK' });
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    let authUserCreated = false;

    try {
      const credential = await this.withTimeout(
        this.authService.signup(email, password),
        25000,
        'Creating the authentication account took too long.'
      );

      authUserCreated = true;
      const uid = credential.user.uid;

      // Upload ID photo first — if moderation rejects it, abort before creating the user
      let idPhotoUrl = '';
      try {
        idPhotoUrl = await this.uploadIdPhoto(uid);
      } catch (photoErr: any) {
        await this.handleIdPhotoUploadError(photoErr);
        // Clean up the auth user since we're aborting
        try { await this.authService.deleteCurrentAuthUser(); } catch {}
        return;
      }

      const fullName = this.buildFullName(firstName, middleName, lastName, suffix);
      const now = new Date().toISOString();
      const uploadedDocuments = await this.uploadAllDocuments();

      this.contactNumber = contactNumber;

      const userData: User = {
        id: uid,
        email,
        role: 'alumni',
        firstName,
        middleName,
        lastName,
        suffix,
        fullName,
        contactNumber,
        contactCountry: this.selectedCountry.name,
        contactDialCode: this.selectedCountry.dialCode,
        studentId,
        program,
        yearGraduated: Number(this.yearGraduated),
        birthDate: this.birthDate,
        sex: this.sex,
        verificationDocuments: uploadedDocuments,
        idPhotoUrl,
        status: 'pending',
        verificationStatus: 'pending',
        isVerified: false,
        isActive: true,
        campus: 'USTP Villanueva Campus',
        createdAt: now,
        updatedAt: now,
      };

      await this.withTimeout(
        this.usersService.createUser(uid, userData),
        25000,
        'Creating the user profile took too long.'
      );

      await this.withTimeout(
        this.verificationService.createVerificationRequest({
          userUid: uid,
          fullName,
          email,
          program,
          yearGraduated: Number(this.yearGraduated),
          studentId,
          contactNumber,
          contactCountry: this.selectedCountry.name,
          contactDialCode: this.selectedCountry.dialCode,
          birthDate: this.birthDate,
          sex: this.sex,
          verificationDocuments: uploadedDocuments,
          idPhotoUrl,
        }),
        25000,
        'Creating the verification request took too long.'
      );

      await Swal.fire({
        icon: 'success',
        title: 'Signup Successful',
        text: 'Your alumni account has been created and sent for verification.',
        confirmButtonText: 'Go to Login',
      });

      await this.authService.logout();
      await this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('SIGNUP ERROR:', error);

      if (authUserCreated) {
        try { await this.authService.deleteCurrentAuthUser(); } catch {}
      }

      await Swal.fire({
        icon: 'error',
        title: 'Signup Failed',
        text: this.getErrorMessage(error?.code, error?.message),
        confirmButtonText: 'OK',
      });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private async onAppealResubmit(): Promise<void> {
    const firstName     = this.firstName.trim();
    const middleName    = this.middleName.trim();
    const lastName      = this.lastName.trim();
    const suffix        = this.suffix.trim();
    const studentId     = this.studentId.trim();
    const program       = this.program.trim();
    const cleanedPhone  = this.phoneNumber.replace(/\D/g, '');
    const contactNumber = `${this.selectedCountry.dialCode}${cleanedPhone}`;

    if (
      !firstName || !lastName || !cleanedPhone ||
      !studentId || !program || !this.yearGraduated ||
      !this.birthDate || !this.sex
    ) {
      await Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please complete all required fields.', confirmButtonText: 'OK' });
      return;
    }

    if (!this.idPhotoFile) {
      await Swal.fire({
        icon: 'warning',
        title: 'ID Photo Required',
        text: 'Please upload a clear face photo for your Digital Alumni ID.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#6d28d9',
      });
      return;
    }

    if (this.selectedDocuments.length === 0) {
      await Swal.fire({ icon: 'warning', title: 'Missing Documents', text: 'Please upload at least one verification document image.', confirmButtonText: 'OK' });
      return;
    }

    if (!/^\+[0-9]{10,15}$/.test(contactNumber)) {
      await Swal.fire({ icon: 'warning', title: 'Invalid Contact Number', text: `Please enter a valid contact number. Example: ${this.selectedCountry.dialCode}${this.selectedCountry.example}`, confirmButtonText: 'OK' });
      return;
    }

    if (!this.dataPrivacyConsent) {
      await Swal.fire({ icon: 'warning', title: 'Data Privacy Consent', text: 'Please confirm the data privacy consent before proceeding.', confirmButtonText: 'OK' });
      return;
    }

    if (!this.appealUid || !this.appealRequestId) {
      await Swal.fire({ icon: 'error', title: 'Session Error', text: 'Appeal session expired. Please log in again.', confirmButtonText: 'OK' });
      await this.goBackToLogin();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    try {
      const authUser = await this.authService.getAuthState();

      if (!authUser || authUser.uid !== this.appealUid) {
        await Swal.fire({ icon: 'error', title: 'Session Expired', text: 'Please log in again and choose Appeal / Resubmit.', confirmButtonText: 'Go to Login' });
        await this.goBackToLogin();
        return;
      }

      // Upload new ID photo for the appeal
      let idPhotoUrl = '';
      try {
        idPhotoUrl = await this.uploadIdPhoto(this.appealUid);
      } catch (photoErr: any) {
        await this.handleIdPhotoUploadError(photoErr);
        return;
      }

      const fullName = this.buildFullName(firstName, middleName, lastName, suffix);
      const uploadedDocuments = await this.uploadAllDocuments();
      const now = new Date().toISOString();

      await this.withTimeout(
        this.verificationService.resubmitAppeal(this.appealUid, this.appealRequestId, {
          fullName,
          firstName,
          middleName,
          lastName,
          suffix,
          contactNumber,
          contactCountry: this.selectedCountry.name,
          contactDialCode: this.selectedCountry.dialCode,
          studentId,
          program,
          yearGraduated: Number(this.yearGraduated),
          birthDate: this.birthDate,
          sex: this.sex,
          verificationDocuments: uploadedDocuments,
          idPhotoUrl,
        }),
        45000,
        'Resubmitting your appeal took too long. Please try again.'
      );

      await this.withTimeout(
        this.usersService.updateUser(this.appealUid, {
          firstName,
          middleName,
          lastName,
          suffix,
          fullName,
          contactNumber,
          contactCountry: this.selectedCountry.name,
          contactDialCode: this.selectedCountry.dialCode,
          studentId,
          program,
          yearGraduated: Number(this.yearGraduated),
          birthDate: this.birthDate,
          sex: this.sex,
          verificationDocuments: uploadedDocuments,
          idPhotoUrl,
          status: 'under_review',
          verificationStatus: 'under_review',
          isVerified: false,
          isActive: true,
          updatedAt: now,
        }),
        25000,
        'Updating your account status took too long.'
      );

      sessionStorage.removeItem('appealSession');

      await Swal.fire({
        icon: 'success',
        title: 'Appeal Submitted!',
        text: 'Your updated information has been resubmitted for review. Please wait for officer verification.',
        confirmButtonText: 'Go to Login',
      });

      await this.authService.logout();
      await this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('APPEAL ERROR:', error);
      await Swal.fire({ icon: 'error', title: 'Resubmit Failed', text: error?.message || 'Something went wrong. Please try again.', confirmButtonText: 'OK' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async goBackToLogin(): Promise<void> {
    sessionStorage.removeItem('appealSession');
    if (this.isAppealMode) {
      try { await this.authService.logout(); } catch {}
    }
    await this.router.navigate(['/login']);
  }

  // ── Upload helpers ────────────────────────────────────────────────────────

  private async uploadAllDocuments(): Promise<UploadedVerificationDocument[]> {
    const uploaded: UploadedVerificationDocument[] = [];
    for (const doc of this.selectedDocuments) {
      uploaded.push(
        await this.withTimeout(
          this.uploadVerificationDocument(doc.file),
          45000,
          `Uploading "${doc.file.name}" took too long.`
        )
      );
    }
    return uploaded;
  }

  private async uploadVerificationDocument(file: File): Promise<UploadedVerificationDocument> {
    const url = `https://api.cloudinary.com/v1_1/${this.cloudinaryCloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.cloudinaryUploadPreset);
    formData.append('folder', this.cloudinaryFolder);

    const response = await fetch(url, { method: 'POST', body: formData });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error?.message || 'Cloudinary upload failed.');
    }

    return { fileName: file.name, fileType: file.type, url: result.secure_url };
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  togglePassword(): void { this.showPassword = !this.showPassword; }
  toggleConfirmPassword(): void { this.showConfirmPassword = !this.showConfirmPassword; }

  onBirthDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let digits = input.value.replace(/\D/g, '');
    if (digits.length > 8) digits = digits.slice(0, 8);

    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }

    this.birthDateDisplay = formatted;
    input.value = formatted;

    if (digits.length === 8) {
      const mm = parseInt(digits.slice(0, 2), 10);
      const dd = parseInt(digits.slice(2, 4), 10);
      const yyyy = parseInt(digits.slice(4, 8), 10);
      const date = new Date(yyyy, mm - 1, dd);
      const ceiling = new Date();
      ceiling.setHours(23, 59, 59, 999);

      const valid =
        mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 &&
        date.getFullYear() === yyyy && date.getMonth() === mm - 1 &&
        date.getDate() === dd && date <= ceiling;

      this.birthDate = valid
        ? `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
        : '';
    } else {
      this.birthDate = '';
    }
  }

  private prefillFromAppealSession(): void {
    const raw = sessionStorage.getItem('appealSession');
    if (!raw) return;

    try {
      const data = JSON.parse(raw);

      this.appealUid       = data.uid || '';
      this.appealRequestId = data.requestId || '';
      this.firstName       = data.firstName || '';
      this.middleName      = data.middleName || '';
      this.lastName        = data.lastName || '';
      this.suffix          = data.suffix || '';
      this.email           = data.email || '';
      this.studentId       = data.studentId || '';
      this.program         = data.program || '';
      this.sex             = data.sex || '';

      if (data.yearGraduated) this.yearGraduated = Number(data.yearGraduated);

      if (data.birthDate) {
        this.birthDate = data.birthDate;
        this.birthDateDisplay = this.isoToDisplayDate(data.birthDate);
      }

      const dialCode = data.contactDialCode || '+63';
      const matchedCountry = this.countries.find((c) => c.dialCode === dialCode);
      this.selectedCountry = matchedCountry || this.countries[0];

      if (data.contactNumber) {
        const bareNumber   = String(data.contactNumber).replace(/\D/g, '');
        const bareDialCode = String(dialCode).replace(/\D/g, '');
        this.phoneNumber = bareNumber.startsWith(bareDialCode)
          ? bareNumber.slice(bareDialCode.length)
          : bareNumber;
      }

      this.cdr.detectChanges();
    } catch (error) {
      console.warn('Failed to parse appeal session data:', error);
    }
  }

  private isoToDisplayDate(iso: string): string {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const [yyyy, mm, dd] = iso.split('-');
    return `${mm}/${dd}/${yyyy}`;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let tid: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      tid = setTimeout(() => reject(new Error(message)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (tid) clearTimeout(tid);
    }
  }

  private buildFullName(first: string, middle: string, last: string, suffix: string): string {
    const mi = middle ? `${middle.charAt(0).toUpperCase()}.` : '';
    return [first, mi, last, suffix].filter(Boolean).join(' ');
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private getErrorMessage(code?: string, message?: string): string {
    switch (code) {
      case 'auth/email-already-in-use': return 'This email is already registered.';
      case 'auth/invalid-email':        return 'Invalid email format.';
      case 'auth/weak-password':        return 'Password is too weak.';
      case 'permission-denied':         return 'Firestore denied access. Please check Firestore rules.';
      case 'unavailable':               return 'Service is temporarily unavailable. Please try again.';
      default:                          return message || 'Signup failed. Please try again.';
    }
  }
}