import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { User } from '../../../models/user.model';

interface AlumniRecordView {
  id?: string;
  fullName: string;
  email: string;
  alumniId: string;
  program: string;
  yearGraduated: string;
}

@Component({
  selector: 'app-alumni-records',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule],
  templateUrl: './alumni-records.html',
  styleUrls: ['./alumni-records.scss'],
})
export class AlumniRecords implements OnInit, OnDestroy {
  private destroyed = false;

  searchTerm = '';
  selectedProgram = 'All Programs';
  selectedYear = 'All Years';

  programOptions: string[] = ['All Programs'];
  yearOptions: string[] = ['All Years'];

  alumniRecords: AlumniRecordView[] = [];
  filteredAlumniRecords: AlumniRecordView[] = [];

  loading = true;
  loadError = '';

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    this.zone.run(() => {
      this.loading = true;
      this.loadError = '';
      this.cdr.detectChanges();
    });

    const authUser = await this.authService.waitForAuthReady();

    if (this.destroyed) return;

    if (!authUser) {
      this.zone.run(() => {
        if (this.destroyed) return;

        this.loading = false;
        this.loadError = 'Your login session is not ready. Please log in again.';
        this.alumniRecords = [];
        this.filteredAlumniRecords = [];
        this.cdr.detectChanges();
      });

      return;
    }

    await this.loadAlumni();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  async loadAlumni(): Promise<void> {
    this.zone.run(() => {
      if (this.destroyed) return;

      this.loading = true;
      this.loadError = '';
      this.cdr.detectChanges();
    });

    try {
      const authUser = await this.authService.waitForAuthReady();

      if (this.destroyed) return;

      if (!authUser) {
        throw new Error('No authenticated user found before loading alumni records.');
      }

      const alumniUsers = await this.usersService.getAlumniUsers();

      if (this.destroyed) return;

      this.zone.run(() => {
        if (this.destroyed) return;

        this.alumniRecords = alumniUsers
          .map((user) => this.mapUserToView(user))
          .sort((a, b) => a.fullName.localeCompare(b.fullName));

        const programs = Array.from(
          new Set(
            this.alumniRecords
              .map((record) => record.program)
              .filter((program) => program !== 'N/A')
          )
        ).sort();

        this.programOptions = ['All Programs', ...programs];

        const years = Array.from(
          new Set(
            this.alumniRecords
              .map((record) => record.yearGraduated)
              .filter((year) => year !== 'N/A')
          )
        ).sort((a, b) => Number(b) - Number(a));

        this.yearOptions = ['All Years', ...years];

        this.applyFilters(false);
        this.cdr.detectChanges();
      });
    } catch (error) {
      console.error('Failed to load alumni records:', error);

      this.zone.run(() => {
        if (this.destroyed) return;

        this.loadError = 'Failed to load alumni records.';
        this.alumniRecords = [];
        this.filteredAlumniRecords = [];
        this.cdr.detectChanges();
      });
    } finally {
      this.zone.run(() => {
        if (this.destroyed) return;

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
        record.email.toLowerCase().includes(search) ||
        record.alumniId.toLowerCase().includes(search) ||
        record.program.toLowerCase().includes(search) ||
        record.yearGraduated.toLowerCase().includes(search);

      const matchesProgram =
        this.selectedProgram === 'All Programs' ||
        record.program === this.selectedProgram;

      const matchesYear =
        this.selectedYear === 'All Years' ||
        record.yearGraduated === this.selectedYear;

      return matchesSearch && matchesProgram && matchesYear;
    });

    if (triggerDetectChanges) {
      this.cdr.detectChanges();
    }
  }

  trackByRecord(index: number, record: AlumniRecordView): string {
    return record.id || `${record.fullName}-${record.email}-${index}`;
  }

  viewRecord(record: AlumniRecordView): void {
    if (!record.id) return;

    this.router.navigate(['/officer/alumni-records', record.id]);
  }

  private mapUserToView(user: User): AlumniRecordView {
    const firstName = user.firstName?.trim() ?? '';
    const middleName = user.middleName?.trim() ?? '';
    const lastName = user.lastName?.trim() ?? '';
    const suffix = user.suffix?.trim() ?? '';
    const fallbackFullName = user.fullName?.trim() ?? '';

    const middleInitial = middleName
      ? `${middleName.charAt(0).toUpperCase()}.`
      : '';

    const fullName =
      [firstName, middleInitial, lastName, suffix].filter(Boolean).join(' ').trim() ||
      fallbackFullName ||
      user.email ||
      'Unnamed Alumni';

    return {
      id: user.id,
      fullName,
      email: user.email ?? '',
      alumniId: this.getAlumniIdLabel(user),
      program: user.program ?? 'N/A',
      yearGraduated: user.yearGraduated ? String(user.yearGraduated) : 'N/A',
    };
  }

  private getAlumniIdLabel(user: User): string {
    const alumniId = String((user as any).alumniId || '').trim();

    if (alumniId) {
      return alumniId;
    }

    return 'Not assigned';
  }
}