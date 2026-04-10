import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UsersService } from '../../../services/users.service';
import { User } from '../../../models/user.model';

type DisplayEmploymentStatus =
  | 'Employed'
  | 'Self-Employed'
  | 'Unemployed'
  | 'Further Studies'
  | 'N/A';

type AccountStatus = 'Active' | 'Inactive';

interface AlumniRecordView {
  id?: string;
  fullName: string;
  email: string;
  program: string;
  yearGraduated: string;
  employmentStatus: DisplayEmploymentStatus;
  accountStatus: AccountStatus;
}

@Component({
  selector: 'app-alumni-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alumni-records.html',
  styleUrls: ['./alumni-records.scss'],
})
export class AlumniRecords implements OnInit {
  searchTerm = '';
  selectedProgram = 'All Programs';
  selectedYear = 'All Years';
  selectedStatus = 'All Status';

  programOptions: string[] = ['All Programs'];
  yearOptions: string[] = ['All Years'];
  statusOptions: string[] = ['All Status', 'Active', 'Inactive'];

  alumniRecords: AlumniRecordView[] = [];
  filteredAlumniRecords: AlumniRecordView[] = [];

  loading = true;
  loadError = '';

  constructor(
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadAlumni();
  }

  async loadAlumni(): Promise<void> {
    this.zone.run(() => {
      this.loading = true;
      this.loadError = '';
      this.cdr.detectChanges();
    });

    try {
      const alumniUsers = await this.usersService.getAlumniUsers();

      this.zone.run(() => {
        this.alumniRecords = alumniUsers.map((user) => this.mapUserToView(user));

        const programs = Array.from(
          new Set(
            this.alumniRecords
              .map((record) => record.program)
              .filter((program) => !!program && program !== 'N/A')
          )
        ).sort((a, b) => a.localeCompare(b));

        this.programOptions = ['All Programs', ...programs];

        const years = Array.from(
          new Set(
            this.alumniRecords
              .map((record) => record.yearGraduated)
              .filter((year) => !!year && year !== 'N/A')
          )
        ).sort((a, b) => Number(b) - Number(a));

        this.yearOptions = ['All Years', ...years];

        this.applyFilters(false);
      });
    } catch (error) {
      console.error('Failed to load alumni records:', error);

      this.zone.run(() => {
        this.loadError = 'Failed to load alumni records.';
        this.alumniRecords = [];
        this.filteredAlumniRecords = [];
        this.programOptions = ['All Programs'];
        this.yearOptions = ['All Years'];
      });
    } finally {
      this.zone.run(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  applyFilters(triggerDetectChanges = true): void {
    const search = this.searchTerm.trim().toLowerCase();

    this.filteredAlumniRecords = this.alumniRecords.filter((record) => {
      const matchesSearch =
        !search ||
        record.fullName.toLowerCase().includes(search) ||
        record.program.toLowerCase().includes(search) ||
        record.email.toLowerCase().includes(search) ||
        record.yearGraduated.toLowerCase().includes(search);

      const matchesProgram =
        this.selectedProgram === 'All Programs' ||
        record.program === this.selectedProgram;

      const matchesYear =
        this.selectedYear === 'All Years' ||
        record.yearGraduated === this.selectedYear;

      const matchesStatus =
        this.selectedStatus === 'All Status' ||
        record.accountStatus === this.selectedStatus;

      return matchesSearch && matchesProgram && matchesYear && matchesStatus;
    });

    if (triggerDetectChanges) {
      this.cdr.detectChanges();
    }
  }

  trackByRecord(index: number, record: AlumniRecordView): string {
    return record.id || `${record.fullName}-${record.email}-${index}`;
  }

  private mapUserToView(user: User): AlumniRecordView {
    const firstName = user.firstName?.trim() ?? '';
    const lastName = user.lastName?.trim() ?? '';
    const fallbackFullName = user.fullName?.trim() ?? '';

    const fullName =
      `${firstName} ${lastName}`.trim() ||
      fallbackFullName ||
      user.email?.trim() ||
      'Unnamed Alumni';

    return {
      id: user.id,
      fullName,
      email: user.email?.trim() ?? '',
      program: user.program?.trim() || 'N/A',
      yearGraduated:
        user.yearGraduated !== undefined &&
        user.yearGraduated !== null &&
        !Number.isNaN(Number(user.yearGraduated))
          ? String(user.yearGraduated)
          : 'N/A',
      employmentStatus: this.normalizeEmploymentStatus(user.employmentStatus),
      accountStatus: user.isActive ? 'Active' : 'Inactive',
    };
  }

  private normalizeEmploymentStatus(
    value: User['employmentStatus']
  ): DisplayEmploymentStatus {
    if (
      value === 'Employed' ||
      value === 'Self-Employed' ||
      value === 'Unemployed' ||
      value === 'Further Studies'
    ) {
      return value;
    }

    return 'N/A';
  }
}