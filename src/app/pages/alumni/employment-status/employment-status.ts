import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type EmploymentStatusType =
  | 'employed'
  | 'self_employed'
  | 'studying'
  | 'unemployed';

interface EmploymentFormData {
  employed: {
    companyName: string;
    jobTitle: string;
    employmentType: string;
    industry: string;
    workLocation: string;
    dateHired: string;
  };
  selfEmployed: {
    businessName: string;
    businessType: string;
    businessLocation: string;
  };
  studying: {
    schoolName: string;
    degreeProgram: string;
  };
  unemployed: {
    notes: string;
  };
}

@Component({
  selector: 'app-employment-status',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employment-status.html',
  styleUrls: ['./employment-status.scss'],
})
export class EmploymentStatusComponent {
  selectedStatus: EmploymentStatusType = 'employed';
  savedStatus: EmploymentStatusType = 'employed';

  // TEMPORARY: demo-only sidebar/user values
  alumniName = 'Maria Dela Cruz';
  batchLabel = 'Batch 2019';

  // TEMPORARY: demo-only updated date display
  lastUpdated = 'March 28, 2026';

  employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Freelance'];
  industries = [
    'Information Technology',
    'Education',
    'Healthcare',
    'Finance',
    'Retail',
    'Engineering',
    'Government',
    'Other',
  ];

  formData: EmploymentFormData = {
    employed: {
      companyName: 'TechCorp Philippines',
      jobTitle: 'Frontend Developer',
      employmentType: 'Full-time',
      industry: 'Information Technology',
      workLocation: 'Makati City',
      dateHired: '2025-01-15',
    },
    selfEmployed: {
      businessName: '',
      businessType: '',
      businessLocation: '',
    },
    studying: {
      schoolName: '',
      degreeProgram: '',
    },
    unemployed: {
      notes: '',
    },
  };

  setStatus(status: EmploymentStatusType): void {
    this.selectedStatus = status;
  }

  saveChanges(): void {
    this.savedStatus = this.selectedStatus;
    this.lastUpdated = this.formatDate(new Date());

    // TEMPORARY SHORTCUT:
    // This currently only updates the UI state locally.
    // Replace this later with service call to Firebase / backend.
    console.log('Saved employment status:', {
      status: this.savedStatus,
      data: this.getSavedData(),
      lastUpdated: this.lastUpdated,
    });
  }

  get currentStatusTitle(): string {
    switch (this.savedStatus) {
      case 'employed':
        return 'Employed';
      case 'self_employed':
        return 'Self-employed';
      case 'studying':
        return 'Studying';
      case 'unemployed':
        return 'Unemployed';
      default:
        return 'Employment Status';
    }
  }

  get currentStatusDescription(): string {
    switch (this.savedStatus) {
      case 'employed':
        return 'Currently working at a company or organization';
      case 'self_employed':
        return 'Running your own business or freelancing';
      case 'studying':
        return 'Pursuing further education or a degree';
      case 'unemployed':
        return 'Currently not employed';
      default:
        return '';
    }
  }

  get statusBadgeClass(): string {
    switch (this.savedStatus) {
      case 'employed':
        return 'badge-employed';
      case 'self_employed':
        return 'badge-self-employed';
      case 'studying':
        return 'badge-studying';
      case 'unemployed':
        return 'badge-unemployed';
      default:
        return '';
    }
  }

  get statusCardIconClass(): string {
    switch (this.savedStatus) {
      case 'employed':
        return 'icon-employed';
      case 'self_employed':
        return 'icon-self-employed';
      case 'studying':
        return 'icon-studying';
      case 'unemployed':
        return 'icon-unemployed';
      default:
        return '';
    }
  }

  getSavedData(): { label: string; value: string }[] {
    switch (this.savedStatus) {
      case 'employed':
        return [
          {
            label: 'Company',
            value: this.formData.employed.companyName || '—',
          },
          {
            label: 'Position',
            value: this.formData.employed.jobTitle || '—',
          },
          {
            label: 'Type',
            value: this.formData.employed.employmentType || '—',
          },
        ];

      case 'self_employed':
        return [
          {
            label: 'Business',
            value: this.formData.selfEmployed.businessName || '—',
          },
          {
            label: 'Type',
            value: this.formData.selfEmployed.businessType || '—',
          },
          {
            label: 'Location',
            value: this.formData.selfEmployed.businessLocation || '—',
          },
        ];

      case 'studying':
        return [
          {
            label: 'School',
            value: this.formData.studying.schoolName || '—',
          },
          {
            label: 'Program',
            value: this.formData.studying.degreeProgram || '—',
          },
          {
            label: 'Status',
            value: 'Continuing Education',
          },
        ];

      case 'unemployed':
        return [
          {
            label: 'Status',
            value: 'Currently not employed',
          },
          {
            label: 'Activity',
            value: this.formData.unemployed.notes || 'No notes provided',
          },
          {
            label: 'Availability',
            value: 'Open',
          },
        ];

      default:
        return [];
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}