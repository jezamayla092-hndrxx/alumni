import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

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
  middleName = '';
  lastName = '';
  suffix = '';
  email = '';
  contactNumber = '';
  studentId = '';
  program = '';
  yearGraduated: number | null = null;
  password = '';
  confirmPassword = '';

  selectedDocuments: File[] = [];

  loading = false;
  showPassword = false;
  showConfirmPassword = false;
  programDropdownOpen = false;

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
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.programDropdownOpen = false;
  }

  onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files) return;

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!allowed.includes(file.type) || file.size > maxSize) continue;

      this.selectedDocuments.push(file);
    }

    input.value = '';
  }

  async onSignup(): Promise<void> {
    this.loading = true;

    try {
      const credential = await this.authService.signup(this.email, this.password);
      const uid = credential.user.uid;

      let documentUrls: string[] = [];

      for (const file of this.selectedDocuments) {
        const res = await this.uploadVerificationDocument(uid, file);
        documentUrls.push(res);
      }

      const userData: User = {
        id: uid,
        email: this.email,
        role: 'alumni',
        fullName: `${this.firstName} ${this.lastName}`,
        program: this.program,
        yearGraduated: Number(this.yearGraduated),
        verificationDocuments: documentUrls,
        status: 'pending',
        createdAt: new Date().toISOString(),
      } as User;

      await this.usersService.createUser(uid, userData);

      await Swal.fire({
        icon: 'success',
        title: 'Signup Successful',
      });

      this.router.navigate(['/login']);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Signup Failed',
      });
    } finally {
      this.loading = false;
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  toggleProgramDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.programDropdownOpen = !this.programDropdownOpen;
  }

  selectProgram(program: string) {
    this.program = program;
    this.programDropdownOpen = false;
  }

  private async uploadVerificationDocument(uid: string, file: File): Promise<string> {
    const storage = getStorage();
    const fileRef = ref(storage, `verification/${uid}/${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }
}