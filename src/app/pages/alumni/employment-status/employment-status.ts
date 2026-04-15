import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  EmploymentDetails,
  EmploymentStatus,
  User,
} from '../../../models/user.model';
import { EmploymentStatusService } from '../../../services/employment-status.service';

type EmploymentTab = 'Employed' | 'Self-employed' | 'Studying' | 'Unemployed';

type EmploymentFormValue = {
  companyName: string;
  jobTitle: string;
  employmentType: string;
  industry: string;
  workLocation: string;
  dateHired: string;

  businessName: string;
  businessType: string;
  businessLocation: string;

  schoolName: string;
  degreeProgram: string;

  notes: string;
};

@Component({
  selector: 'app-employment-status',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employment-status.html',
  styleUrls: ['./employment-status.scss'],
})
export class EmploymentStatusComponent implements OnInit {
  private fb = inject(FormBuilder);
  private employmentService = inject(EmploymentStatusService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  saving = false;
  saveMessage = '';
  loadError = '';

  selectedStatus: EmploymentTab = 'Employed';
  lastUpdatedLabel = 'Last updated —';

  employmentTypeOptions = [
    'Full-time',
    'Part-time',
    'Contract',
    'Freelance',
    'Internship',
    'Temporary',
  ];

  industryOptions = [
    'Information Technology',
    'Education',
    'Healthcare',
    'Finance',
    'Retail',
    'Government',
    'Engineering',
    'Business Process Outsourcing',
    'Hospitality',
    'Others',
  ];

  form = this.fb.nonNullable.group({
    companyName: [''],
    jobTitle: [''],
    employmentType: ['Full-time'],
    industry: ['Information Technology'],
    workLocation: [''],
    dateHired: [''],

    businessName: [''],
    businessType: [''],
    businessLocation: [''],

    schoolName: [''],
    degreeProgram: [''],

    notes: [''],
  });

  ngOnInit(): void {
    this.loadEmployment();
  }

  loadEmployment(): void {
    this.loading = true;
    this.loadError = '';

    this.employmentService.getCurrentUserEmployment().subscribe({
      next: (data: User | null) => {
        if (data) {
          this.selectedStatus = this.mapStoredStatusToTab(data.employmentStatus);

          this.form.patchValue({
            companyName: data.employmentDetails?.companyName ?? '',
            jobTitle: data.employmentDetails?.jobTitle ?? '',
            employmentType: data.employmentDetails?.employmentType ?? 'Full-time',
            industry:
              data.employmentDetails?.industry ?? 'Information Technology',
            workLocation: data.employmentDetails?.workLocation ?? '',
            dateHired: this.normalizeDateForInput(
              data.employmentDetails?.dateHired ?? ''
            ),

            businessName: data.employmentDetails?.businessName ?? '',
            businessType: data.employmentDetails?.businessType ?? '',
            businessLocation: data.employmentDetails?.businessLocation ?? '',

            schoolName: data.employmentDetails?.schoolName ?? '',
            degreeProgram: data.employmentDetails?.degreeProgram ?? '',

            notes: data.employmentDetails?.notes ?? '',
          });

          this.lastUpdatedLabel = this.formatUpdatedAt(
            data.employmentDetails?.updatedAt
          );
        }

        this.applyValidators();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        console.error('Failed to load employment data:', err);
        this.loadError = 'Failed to load employment information.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectStatus(status: EmploymentTab): void {
    this.selectedStatus = status;
    this.saveMessage = '';
    this.applyValidators();
  }

  applyValidators(): void {
    const controls = this.form.controls;

    controls.companyName.clearValidators();
    controls.jobTitle.clearValidators();
    controls.employmentType.clearValidators();
    controls.industry.clearValidators();
    controls.workLocation.clearValidators();
    controls.dateHired.clearValidators();

    controls.businessName.clearValidators();
    controls.businessType.clearValidators();
    controls.businessLocation.clearValidators();

    controls.schoolName.clearValidators();
    controls.degreeProgram.clearValidators();

    controls.notes.clearValidators();

    if (this.selectedStatus === 'Employed') {
      controls.companyName.setValidators([Validators.required]);
      controls.jobTitle.setValidators([Validators.required]);
      controls.employmentType.setValidators([Validators.required]);
      controls.industry.setValidators([Validators.required]);
      controls.workLocation.setValidators([Validators.required]);
      controls.dateHired.setValidators([Validators.required]);
    }

    if (this.selectedStatus === 'Self-employed') {
      controls.businessName.setValidators([Validators.required]);
      controls.businessType.setValidators([Validators.required]);
      controls.businessLocation.setValidators([Validators.required]);
    }

    if (this.selectedStatus === 'Studying') {
      controls.schoolName.setValidators([Validators.required]);
      controls.degreeProgram.setValidators([Validators.required]);
    }

    controls.companyName.updateValueAndValidity({ emitEvent: false });
    controls.jobTitle.updateValueAndValidity({ emitEvent: false });
    controls.employmentType.updateValueAndValidity({ emitEvent: false });
    controls.industry.updateValueAndValidity({ emitEvent: false });
    controls.workLocation.updateValueAndValidity({ emitEvent: false });
    controls.dateHired.updateValueAndValidity({ emitEvent: false });

    controls.businessName.updateValueAndValidity({ emitEvent: false });
    controls.businessType.updateValueAndValidity({ emitEvent: false });
    controls.businessLocation.updateValueAndValidity({ emitEvent: false });

    controls.schoolName.updateValueAndValidity({ emitEvent: false });
    controls.degreeProgram.updateValueAndValidity({ emitEvent: false });

    controls.notes.updateValueAndValidity({ emitEvent: false });
  }

  async saveEmployment(): Promise<void> {
    this.saveMessage = '';
    this.applyValidators();
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.saveMessage = 'Please complete the required fields first.';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.cdr.detectChanges();

    const raw: EmploymentFormValue = this.form.getRawValue();

    const employmentStatus: EmploymentStatus =
      this.mapTabToStoredStatus(this.selectedStatus);

    const employmentDetails: EmploymentDetails = {};

    if (this.selectedStatus === 'Employed') {
      employmentDetails.companyName = raw.companyName.trim();
      employmentDetails.jobTitle = raw.jobTitle.trim();
      employmentDetails.employmentType = raw.employmentType;
      employmentDetails.industry = raw.industry;
      employmentDetails.workLocation = raw.workLocation.trim();
      employmentDetails.dateHired = raw.dateHired;
    }

    if (this.selectedStatus === 'Self-employed') {
      employmentDetails.businessName = raw.businessName.trim();
      employmentDetails.businessType = raw.businessType.trim();
      employmentDetails.businessLocation = raw.businessLocation.trim();
    }

    if (this.selectedStatus === 'Studying') {
      employmentDetails.schoolName = raw.schoolName.trim();
      employmentDetails.degreeProgram = raw.degreeProgram.trim();
    }

    if (this.selectedStatus === 'Unemployed') {
      employmentDetails.notes = raw.notes.trim();
    }

    try {
      console.log('[EmploymentComponent] saving started');

      await this.employmentService.saveEmployment(
        employmentStatus,
        employmentDetails
      );

      console.log('[EmploymentComponent] saving finished');

      this.saveMessage = 'Employment information saved successfully.';
      this.lastUpdatedLabel = 'Last updated just now';
    } catch (err: unknown) {
      console.error('[EmploymentComponent] save failed:', err);
      this.saveMessage = 'Failed to save employment information.';
    } finally {
      this.saving = false;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.cdr.detectChanges();
      }, 0);
    }
  }

  hasError(controlName: keyof EmploymentFormValue): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getStatusDescription(): string {
    switch (this.selectedStatus) {
      case 'Employed':
        return 'Currently working at a company or organization';
      case 'Self-employed':
        return 'Running your own business or freelancing';
      case 'Studying':
        return 'Pursuing further education or a degree';
      case 'Unemployed':
        return 'Currently not employed';
    }
  }

  getStatusClass(): string {
    switch (this.selectedStatus) {
      case 'Employed':
        return 'employed';
      case 'Self-employed':
        return 'self-employed';
      case 'Studying':
        return 'studying';
      case 'Unemployed':
        return 'unemployed';
    }
  }

  getSummaryPrimary(): string {
    const raw: EmploymentFormValue = this.form.getRawValue();

    switch (this.selectedStatus) {
      case 'Employed':
        return raw.companyName || '—';
      case 'Self-employed':
        return raw.businessName || '—';
      case 'Studying':
        return raw.schoolName || '—';
      case 'Unemployed':
        return raw.notes || '—';
    }
  }

  getSummarySecondary(): string {
    const raw: EmploymentFormValue = this.form.getRawValue();

    switch (this.selectedStatus) {
      case 'Employed':
        return raw.jobTitle || '—';
      case 'Self-employed':
        return raw.businessType || '—';
      case 'Studying':
        return raw.degreeProgram || '—';
      case 'Unemployed':
        return 'Not currently employed';
    }
  }

  getSummaryTertiary(): string {
    const raw: EmploymentFormValue = this.form.getRawValue();

    switch (this.selectedStatus) {
      case 'Employed':
        return raw.employmentType || '—';
      case 'Self-employed':
        return raw.businessLocation || '—';
      case 'Studying':
        return 'Further Studies';
      case 'Unemployed':
        return 'Available';
    }
  }

  private mapTabToStoredStatus(tab: EmploymentTab): EmploymentStatus {
    switch (tab) {
      case 'Employed':
        return 'Employed';
      case 'Self-employed':
        return 'Self-Employed';
      case 'Studying':
        return 'Further Studies';
      case 'Unemployed':
        return 'Unemployed';
    }
  }

  private mapStoredStatusToTab(status?: EmploymentStatus): EmploymentTab {
    switch (status) {
      case 'Employed':
        return 'Employed';
      case 'Self-Employed':
        return 'Self-employed';
      case 'Further Studies':
        return 'Studying';
      case 'Unemployed':
        return 'Unemployed';
      default:
        return 'Employed';
    }
  }

  private formatUpdatedAt(updatedAt: unknown): string {
    if (!updatedAt) {
      return 'Last updated —';
    }

    try {
      const maybeTimestamp = updatedAt as { toDate?: () => Date };
      const date =
        typeof maybeTimestamp.toDate === 'function'
          ? maybeTimestamp.toDate()
          : new Date(updatedAt as string | number | Date);

      return `Last updated ${date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}`;
    } catch {
      return 'Last updated recently';
    }
  }

  private normalizeDateForInput(value: string): string {
    if (!value) return '';

    // already yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // dd/mm/yyyy -> yyyy-mm-dd
    const slashMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      const [, dd, mm, yyyy] = slashMatch;
      return `${yyyy}-${mm}-${dd}`;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}