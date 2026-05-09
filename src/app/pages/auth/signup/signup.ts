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
  code: string;
}

interface CalCell {
  date: Date;
  day: number;
  thisMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
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
  programDropdownOpen = false;
  countryDropdownOpen = false;
  uploadModalOpen = false;
  countrySearch = '';
  birthDate = '';
  sex = '';
  sexDropdownOpen = false;
  dataPrivacyConsent = false;

  birthDateDisplay = '';
  calendarOpen = false;
  yearMode = false;
  calViewMonth = new Date().getMonth();
  calViewYear  = new Date().getFullYear();

  readonly calMonthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  readonly calDayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  yearGraduatedDropdownOpen = false;
  readonly yearGraduatedOptions = [2025, 2024];

  sexOptions = ['Male', 'Female'];

  get calCells(): CalCell[] {
    const year  = this.calViewYear;
    const month = this.calViewMonth;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth     = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayMidnight = new Date();
    todayMidnight.setHours(23, 59, 59, 999);

    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);

    const selected = this.birthDate ? new Date(this.birthDate + 'T00:00:00') : null;
    const cells: CalCell[] = [];

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push({ date: d, day: d.getDate(), thisMonth: false, isToday: false, isSelected: false, isDisabled: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isToday =
        date.getFullYear() === todayZero.getFullYear() &&
        date.getMonth()    === todayZero.getMonth()    &&
        date.getDate()     === todayZero.getDate();
      const isSelected = selected
        ? date.getFullYear() === selected.getFullYear() &&
          date.getMonth()    === selected.getMonth()    &&
          date.getDate()     === selected.getDate()
        : false;
      cells.push({ date, day: d, thisMonth: true, isToday, isSelected, isDisabled: date > todayMidnight });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      cells.push({ date, day: d, thisMonth: false, isToday: false, isSelected: false, isDisabled: true });
    }

    return cells;
  }

  get yearList(): number[] {
    const current = new Date().getFullYear();
    const result: number[] = [];
    for (let y = current; y >= current - 100; y--) result.push(y);
    return result;
  }

  countries: CountryOption[] = [
    { name: 'Philippines',          dialCode: '+63',  example: '9123456789',  code: 'ph' },
    { name: 'United States',        dialCode: '+1',   example: '2025550125',  code: 'us' },
    { name: 'Canada',               dialCode: '+1',   example: '4165550125',  code: 'ca' },
    { name: 'United Kingdom',       dialCode: '+44',  example: '7123456789',  code: 'gb' },
    { name: 'Australia',            dialCode: '+61',  example: '412345678',   code: 'au' },
    { name: 'New Zealand',          dialCode: '+64',  example: '211234567',   code: 'nz' },
    { name: 'Singapore',            dialCode: '+65',  example: '81234567',    code: 'sg' },
    { name: 'Malaysia',             dialCode: '+60',  example: '123456789',   code: 'my' },
    { name: 'Indonesia',            dialCode: '+62',  example: '8123456789',  code: 'id' },
    { name: 'Thailand',             dialCode: '+66',  example: '812345678',   code: 'th' },
    { name: 'Vietnam',              dialCode: '+84',  example: '912345678',   code: 'vn' },
    { name: 'Japan',                dialCode: '+81',  example: '9012345678',  code: 'jp' },
    { name: 'South Korea',          dialCode: '+82',  example: '1012345678',  code: 'kr' },
    { name: 'China',                dialCode: '+86',  example: '13123456789', code: 'cn' },
    { name: 'Hong Kong',            dialCode: '+852', example: '51234567',    code: 'hk' },
    { name: 'Taiwan',               dialCode: '+886', example: '912345678',   code: 'tw' },
    { name: 'India',                dialCode: '+91',  example: '9876543210',  code: 'in' },
    { name: 'United Arab Emirates', dialCode: '+971', example: '501234567',   code: 'ae' },
    { name: 'Saudi Arabia',         dialCode: '+966', example: '501234567',   code: 'sa' },
    { name: 'Qatar',                dialCode: '+974', example: '33123456',    code: 'qa' },
    { name: 'Kuwait',               dialCode: '+965', example: '51234567',    code: 'kw' },
    { name: 'Bahrain',              dialCode: '+973', example: '36001234',    code: 'bh' },
    { name: 'Oman',                 dialCode: '+968', example: '91234567',    code: 'om' },
    { name: 'Germany',              dialCode: '+49',  example: '15123456789', code: 'de' },
    { name: 'France',               dialCode: '+33',  example: '612345678',   code: 'fr' },
    { name: 'Italy',                dialCode: '+39',  example: '3123456789',  code: 'it' },
    { name: 'Spain',                dialCode: '+34',  example: '612345678',   code: 'es' },
    { name: 'Netherlands',          dialCode: '+31',  example: '612345678',   code: 'nl' },
  ];

  selectedCountry: CountryOption = this.countries[0];

  get filteredCountries(): CountryOption[] {
    const q = this.countrySearch.trim().toLowerCase();
    if (!q) return this.countries;
    return this.countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q)
    );
  }

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

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      target.closest('.program-field')        ||
      target.closest('.phone-field')          ||
      target.closest('.sex-field')            ||
      target.closest('.birth-date-field')     ||
      target.closest('.year-graduated-field')
    ) return;
    this.programDropdownOpen       = false;
    this.countryDropdownOpen       = false;
    this.sexDropdownOpen           = false;
    this.calendarOpen              = false;
    this.yearGraduatedDropdownOpen = false;
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.programDropdownOpen       = false;
    this.countryDropdownOpen       = false;
    this.sexDropdownOpen           = false;
    this.calendarOpen              = false;
    this.yearGraduatedDropdownOpen = false;
    if (this.uploadModalOpen) this.closeUploadModal();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    this.selectedDocuments.forEach((doc) => URL.revokeObjectURL(doc.previewUrl));
  }

  // ── Upload modal ─────────────────────────────────────────────────
  openUploadModal(): void {
    if (this.loading) return;
    this.uploadModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeUploadModal(): void {
    this.uploadModalOpen = false;
    document.body.style.overflow = '';
  }

  openPdf(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize  = 5 * 1024 * 1024;
    const maxFiles = 6;

    for (const file of files) {
      if (this.selectedDocuments.length >= maxFiles) {
        Swal.fire({ icon: 'warning', title: 'Upload Limit Reached', text: `You can upload up to ${maxFiles} documents only.`, confirmButtonText: 'OK' });
        break;
      }
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({ icon: 'warning', title: 'Invalid File', text: `${file.name} is not supported. Please upload PDF, JPG, or PNG only.`, confirmButtonText: 'OK' });
        continue;
      }
      if (file.size > maxSize) {
        Swal.fire({ icon: 'warning', title: 'File Too Large', text: `${file.name} exceeds 5MB.`, confirmButtonText: 'OK' });
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
    if (removed) URL.revokeObjectURL(removed.previewUrl);
  }

  // CHANGE 1: file size formatter used in card template
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Submit ───────────────────────────────────────────────────────
  async onSignup(): Promise<void> {
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
      !studentId || !program  || !this.yearGraduated     ||
      !password  || !confirmPassword                     ||
      !this.birthDate || !this.sex
    ) {
      await Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please complete all required fields.', confirmButtonText: 'OK' });
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

    try {
      const credential = await this.authService.signup(email, password);
      const uid        = credential.user.uid;
      const fullName   = this.buildFullName(firstName, middleName, lastName, suffix);
      const now        = new Date().toISOString();

      const uploadedDocuments: UploadedVerificationDocument[] = [];
      for (const doc of this.selectedDocuments) {
        uploadedDocuments.push(await this.uploadVerificationDocument(uid, doc.file));
      }

      this.contactNumber = contactNumber;

      const userData: User = {
        id: uid, email, role: 'alumni',
        firstName, middleName, lastName, suffix, fullName,
        contactNumber,
        contactCountry:  this.selectedCountry.name,
        contactDialCode: this.selectedCountry.dialCode,
        studentId, program,
        yearGraduated: Number(this.yearGraduated),
        birthDate: this.birthDate,
        sex: this.sex,
        verificationDocuments: uploadedDocuments,
        status: 'pending', verificationStatus: 'pending', isActive: false,
        createdAt: now, updatedAt: now,
      } as User;

      try {
        await this.usersService.createUser(uid, userData);
        await this.verificationService.createVerificationRequest({
          userUid: uid, alumniId: studentId, fullName, email, program,
          yearGraduated: Number(this.yearGraduated),
          studentId, contactNumber,
          contactCountry:  this.selectedCountry.name,
          contactDialCode: this.selectedCountry.dialCode,
          birthDate: this.birthDate,
          sex: this.sex,
          verificationDocuments: uploadedDocuments,
        } as any);
      } catch (firestoreError) {
        console.error('FIRESTORE ERROR:', firestoreError);
        await this.authService.deleteCurrentAuthUser();
        throw firestoreError;
      }

      await Swal.fire({ icon: 'success', title: 'Signup Successful', text: 'Your alumni account has been created and sent for verification.', confirmButtonText: 'Go to Login' });
      await this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('SIGNUP ERROR:', error);
      await Swal.fire({ icon: 'error', title: 'Signup Failed', text: this.getErrorMessage(error?.code), confirmButtonText: 'OK' });
    } finally {
      this.loading = false;
    }
  }

  // ── Password toggles ─────────────────────────────────────────────
  togglePassword(): void        { this.showPassword = !this.showPassword; }
  toggleConfirmPassword(): void { this.showConfirmPassword = !this.showConfirmPassword; }

  // ── Program dropdown ─────────────────────────────────────────────
  toggleProgramDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (this.loading) return;
    this.countryDropdownOpen       = false;
    this.sexDropdownOpen           = false;
    this.calendarOpen              = false;
    this.yearGraduatedDropdownOpen = false;
    this.programDropdownOpen       = !this.programDropdownOpen;
  }

  selectProgram(program: string, event?: MouseEvent): void {
    event?.stopPropagation();
    if (this.loading) return;
    this.program = program;
    this.programDropdownOpen = false;
  }

  // ── Country dropdown ─────────────────────────────────────────────
  toggleCountryDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (this.loading) return;
    this.programDropdownOpen       = false;
    this.sexDropdownOpen           = false;
    this.calendarOpen              = false;
    this.yearGraduatedDropdownOpen = false;
    if (!this.countryDropdownOpen) this.countrySearch = '';
    this.countryDropdownOpen = !this.countryDropdownOpen;
  }

  selectCountry(country: CountryOption): void {
    this.selectedCountry = country;
    this.countryDropdownOpen = false;
    this.countrySearch = '';
  }

  // ── Sex dropdown ─────────────────────────────────────────────────
  toggleSexDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (this.loading) return;
    this.programDropdownOpen       = false;
    this.countryDropdownOpen       = false;
    this.calendarOpen              = false;
    this.yearGraduatedDropdownOpen = false;
    this.sexDropdownOpen           = !this.sexDropdownOpen;
  }

  selectSex(sex: string): void {
    this.sex = sex;
    this.sexDropdownOpen = false;
  }

  // ── Year Graduated dropdown ──────────────────────────────────────
  toggleYearGraduatedDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (this.loading) return;
    this.programDropdownOpen = false;
    this.countryDropdownOpen = false;
    this.sexDropdownOpen     = false;
    this.calendarOpen        = false;
    this.yearGraduatedDropdownOpen = !this.yearGraduatedDropdownOpen;
  }

  selectYearGraduated(year: number): void {
    this.yearGraduated = year;
    this.yearGraduatedDropdownOpen = false;
  }

  // ── Birth date calendar ──────────────────────────────────────────
  toggleCalendar(event: MouseEvent): void {
    event.stopPropagation();
    if (this.loading) return;
    this.programDropdownOpen       = false;
    this.countryDropdownOpen       = false;
    this.sexDropdownOpen           = false;
    this.yearGraduatedDropdownOpen = false;
    this.calendarOpen              = !this.calendarOpen;
  }

  // openCalendar kept in TS; binding removed from input in HTML (CHANGE 5)
  openCalendar(): void {
    if (this.loading || this.calendarOpen) return;
    this.programDropdownOpen       = false;
    this.countryDropdownOpen       = false;
    this.sexDropdownOpen           = false;
    this.yearGraduatedDropdownOpen = false;
    this.calendarOpen              = true;
  }

  prevMonth(): void {
    if (this.calViewMonth === 0) { this.calViewMonth = 11; this.calViewYear--; }
    else { this.calViewMonth--; }
  }

  nextMonth(): void {
    const today    = new Date();
    const newMonth = this.calViewMonth === 11 ? 0 : this.calViewMonth + 1;
    const newYear  = this.calViewMonth === 11 ? this.calViewYear + 1 : this.calViewYear;
    if (newYear > today.getFullYear()) return;
    if (newYear === today.getFullYear() && newMonth > today.getMonth()) return;
    this.calViewMonth = newMonth;
    this.calViewYear  = newYear;
  }

  prevYear(): void {
    this.calViewYear--;
    this.yearMode = false;
  }

  nextYear(): void {
    const today = new Date();
    if (this.calViewYear >= today.getFullYear()) return;
    this.calViewYear++;
    if (this.calViewYear === today.getFullYear() && this.calViewMonth > today.getMonth()) {
      this.calViewMonth = today.getMonth();
    }
    this.yearMode = false;
  }

  toggleYearMode(): void { this.yearMode = !this.yearMode; }

  pickYear(year: number): void {
    this.calViewYear = year;
    const today = new Date();
    if (year === today.getFullYear() && this.calViewMonth > today.getMonth()) {
      this.calViewMonth = today.getMonth();
    }
    this.yearMode = false;
  }

  selectCalDay(cell: CalCell): void {
    if (cell.isDisabled || !cell.thisMonth) return;
    const d  = cell.date;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = d.getFullYear();
    this.birthDate        = `${yy}-${mm}-${dd}`;
    this.birthDateDisplay = `${mm}/${dd}/${yy}`;
    this.calendarOpen     = false;
  }

  onBirthDateInput(event: Event): void {
    const input  = event.target as HTMLInputElement;
    let digits   = input.value.replace(/\D/g, '');
    if (digits.length > 8) digits = digits.slice(0, 8);

    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 4) {
      formatted = digits.slice(0, 2) + '/' + digits.slice(2);
    } else {
      formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
    }

    this.birthDateDisplay = formatted;
    input.value           = formatted;

    if (digits.length === 8) {
      const mm   = parseInt(digits.slice(0, 2), 10);
      const dd   = parseInt(digits.slice(2, 4), 10);
      const yyyy = parseInt(digits.slice(4, 8), 10);
      const date = new Date(yyyy, mm - 1, dd);
      const ceiling = new Date();
      ceiling.setHours(23, 59, 59, 999);

      const valid =
        mm >= 1 && mm <= 12 &&
        dd >= 1 && dd <= 31 &&
        date.getFullYear() === yyyy &&
        date.getMonth()    === mm - 1 &&
        date.getDate()     === dd &&
        date <= ceiling;

      if (valid) {
        this.birthDate    = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        this.calViewMonth = mm - 1;
        this.calViewYear  = yyyy;
      } else {
        this.birthDate = '';
      }
    } else {
      this.birthDate = '';
    }
  }

  // ── Private helpers ──────────────────────────────────────────────
  private async uploadVerificationDocument(uid: string, file: File): Promise<UploadedVerificationDocument> {
    const storage  = getStorage();
    const safeFile = file.name.replace(/\s+/g, '_');
    const filePath = `verification-documents/${uid}/${Date.now()}_${safeFile}`;
    const fileRef  = ref(storage, filePath);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return { fileName: file.name, fileType: file.type, url };
  }

  private buildFullName(first: string, middle: string, last: string, suffix: string): string {
    const mi = middle ? `${middle.charAt(0).toUpperCase()}.` : '';
    return [first, mi, last, suffix].filter(Boolean).join(' ');
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use': return 'This email is already registered.';
      case 'auth/invalid-email':        return 'Invalid email format.';
      case 'auth/weak-password':        return 'Password is too weak.';
      case 'storage/unauthorized':      return 'Firebase Storage denied the upload. Please check your Storage rules.';
      case 'permission-denied':         return 'Firestore denied access. Please check your Firestore rules.';
      case 'unavailable':               return 'Service is temporarily unavailable. Please try again.';
      default:                          return 'Signup failed. Please try again.';
    }
  }
}