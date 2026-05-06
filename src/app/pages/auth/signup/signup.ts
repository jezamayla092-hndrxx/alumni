import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { VerificationService } from '../../../services/verification.service';
import { User } from '../../../models/user.model';

interface SelectedVerificationDocument {
  file: File;
  previewUrl: string;
  kind: 'image' | 'pdf';
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
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrls: ['./signup.scss'],
})
export class Signup implements OnDestroy {
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
  loading = false;
  showPassword = false;
  showConfirmPassword = false;
  programDropdownOpen = false; // Make sure this is initialized as false
  countryDropdownOpen = false;
  uploadModalOpen = false;

  countries: CountryOption[] = [
    { name: 'Philippines', dialCode: '+63', example: '9123456789' },
    { name: 'United States', dialCode: '+1', example: '2025550125' },
    { name: 'Canada', dialCode: '+1', example: '4165550125' },
    { name: 'United Kingdom', dialCode: '+44', example: '7123456789' },
    { name: 'Australia', dialCode: '+61', example: '412345678' },
    { name: 'New Zealand', dialCode: '+64', example: '211234567' },
    { name: 'Singapore', dialCode: '+65', example: '81234567' },
    { name: 'Malaysia', dialCode: '+60', example: '123456789' },
    { name: 'Indonesia', dialCode: '+62', example: '8123456789' },
    { name: 'Thailand', dialCode: '+66', example: '812345678' },
    { name: 'Vietnam', dialCode: '+84', example: '912345678' },
    { name: 'Japan', dialCode: '+81', example: '9012345678' },
    { name: 'South Korea', dialCode: '+82', example: '1012345678' },
    { name: 'China', dialCode: '+86', example: '13123456789' },
    { name: 'Hong Kong', dialCode: '+852', example: '51234567' },
    { name: 'Taiwan', dialCode: '+886', example: '912345678' },
    { name: 'India', dialCode: '+91', example: '9876543210' },
    { name: 'United Arab Emirates', dialCode: '+971', example: '501234567' },
    { name: 'Saudi Arabia', dialCode: '+966', example: '501234567' },
    { name: 'Qatar', dialCode: '+974', example: '33123456' },
    { name: 'Kuwait', dialCode: '+965', example: '51234567' },
    { name: 'Bahrain', dialCode: '+973', example: '36001234' },
    { name: 'Oman', dialCode: '+968', example: '91234567' },
    { name: 'Germany', dialCode: '+49', example: '15123456789' },
    { name: 'France', dialCode: '+33', example: '612345678' },
    { name: 'Italy', dialCode: '+39', example: '3123456789' },
    { name: 'Spain', dialCode: '+34', example: '612345678' },
    { name: 'Netherlands', dialCode: '+31', example: '612345678' },
  ];

  selectedCountry: CountryOption = this.countries[0];

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

  @HostListener('document:click')
  handleClickOutside(): void {
    this.programDropdownOpen = false;
    this.countryDropdownOpen = false;
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.programDropdownOpen = false;
    this.countryDropdownOpen = false;

    if (this.uploadModalOpen) {
      this.uploadModalOpen = false;
    }
  }

  ngOnDestroy(): void {
    this.selectedDocuments.forEach((doc) => URL.revokeObjectURL(doc.previewUrl));
  }

  openUploadModal(): void {
    if (this.loading) return;
    this.uploadModalOpen = true;
    document.body.classList.add('modal-open'); // Prevent body scroll
  }

  closeUploadModal(): void {
    this.uploadModalOpen = false;
    document.body.classList.remove('modal-open'); // Allow body scroll
  }

  onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    if (files.length === 0) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5 MB max size
    const maxFiles = 6;

    for (const file of files) {
      if (this.selectedDocuments.length >= maxFiles) {
        Swal.fire({
          icon: 'warning',
          title: 'Upload Limit Reached',
          text: `You can upload up to ${maxFiles} documents only.`,
          confirmButtonText: 'OK',
        });
        break;
      }

      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid File',
          text: `${file.name} is not supported. Please upload PDF, JPG, or PNG only.`,
          confirmButtonText: 'OK',
        });
        continue;
      }

      if (file.size > maxSize) {
        Swal.fire({
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
        kind: file.type === 'application/pdf' ? 'pdf' : 'image',
      });
    }

    input.value = '';
  }

  removeDocument(index: number): void {
    const [removed] = this.selectedDocuments.splice(index, 1);

    if (removed) {
      URL.revokeObjectURL(removed.previewUrl);
    }
  }

  async onSignup(): Promise<void> {
    const firstName = this.firstName.trim();
    const middleName = this.middleName.trim();
    const lastName = this.lastName.trim();
    const suffix = this.suffix.trim();
    const email = this.email.trim().toLowerCase();
    const studentId = this.studentId.trim();
    const program = this.program.trim();
    const cleanedPhoneNumber = this.phoneNumber.replace(/\D/g, '');
    const contactNumber = `${this.selectedCountry.dialCode}${cleanedPhoneNumber}`;
    const password = this.password.trim();
    const confirmPassword = this.confirmPassword.trim();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !cleanedPhoneNumber ||
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

    if (!/^\+[0-9]{10,15}$/.test(contactNumber)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Contact Number',
        text: `Please enter a valid contact number. Example: ${this.selectedCountry.dialCode}${this.selectedCountry.example}`,
        confirmButtonText: 'OK',
      });
      return;
    }

    if (!this.isValidEmail(email)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Email',
        text: 'Please enter a valid email address.',
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

      const fullName = this.buildFullName(firstName, middleName, lastName, suffix);
      const now = new Date().toISOString();

      const uploadedDocuments: UploadedVerificationDocument[] = [];

      for (const doc of this.selectedDocuments) {
        const uploaded = await this.uploadVerificationDocument(uid, doc.file);
        uploadedDocuments.push(uploaded);
      }

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

        verificationDocuments: uploadedDocuments,

        status: 'pending',
        verificationStatus: 'pending',
        isActive: false,

        createdAt: now,
        updatedAt: now,
      } as User;

      try {
        await this.usersService.createUser(uid, userData);

        await this.verificationService.createVerificationRequest({
          userUid: uid,
          alumniId: studentId,
          fullName,
          email,
          program,
          yearGraduated: Number(this.yearGraduated),
          studentId,
          contactNumber,
          contactCountry: this.selectedCountry.name,
          contactDialCode: this.selectedCountry.dialCode,
          verificationDocuments: uploadedDocuments,
        } as any);
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

  toggleProgramDropdown(event: MouseEvent): void {
    event.stopPropagation();

    if (this.loading) return;

    this.countryDropdownOpen = false;
    this.programDropdownOpen = !this.programDropdownOpen;
  }

  toggleCountryDropdown(event: MouseEvent): void {
    event.stopPropagation();

    if (this.loading) return;

    this.programDropdownOpen = false;
    this.countryDropdownOpen = !this.countryDropdownOpen;
  }

  selectProgram(program: string): void {
    this.program = program;
    this.programDropdownOpen = false;
  }

  selectCountry(country: CountryOption): void {
    this.selectedCountry = country;
    this.countryDropdownOpen = false;
  }

  private async uploadVerificationDocument(
    uid: string,
    file: File
  ): Promise<UploadedVerificationDocument> {
    const storage = getStorage();
    const safeFileName = file.name.replace(/\s+/g, '_');
    const filePath = `verification-documents/${uid}/${Date.now()}_${safeFileName}`;
    const fileRef = ref(storage, filePath);

    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    return {
      fileName: file.name,
      fileType: file.type,
      url,
    };
  }

  private buildFullName(
    firstName: string,
    middleName: string,
    lastName: string,
    suffix: string
  ): string {
    const middleInitial = middleName
      ? `${middleName.charAt(0).toUpperCase()}.`
      : '';

    return [firstName, middleInitial, lastName, suffix]
      .filter(Boolean)
      .join(' ');
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered.';
      case 'auth/invalid-email':
        return 'Invalid email format.';
      case 'auth/weak-password':
        return 'Password is too weak.';
      case 'storage/unauthorized':
        return 'Firebase Storage denied the upload. Please check your Storage rules.';
      case 'permission-denied':
        return 'Firestore denied access. Please check your Firestore rules.';
      case 'unavailable':
        return 'Service is temporarily unavailable. Please try again.';
      default:
        return 'Signup failed. Please try again.';
    }
  }
}