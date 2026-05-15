import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  JobPosting,
  JOB_CATEGORIES,
  EMPLOYMENT_TYPES,
  WORK_SETUPS,
} from '../../../models/job-postings.model';
import { JobPostingsService } from '../../../services/job-postings.service';

@Component({
  selector: 'app-job-postings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-postings.html',
  styleUrls: ['./job-postings.scss'],
})
export class AlumniJobPostings implements OnInit, OnDestroy {
  jobs: JobPosting[] = [];
  filteredJobs: JobPosting[] = [];

  loading = false;
  loadError = '';

  searchTerm = '';
  filterEmploymentType = '';
  filterWorkSetup = '';
  filterCategory = '';

  showViewModal = false;
  selectedJob: JobPosting | null = null;

  readonly categories = JOB_CATEGORIES;
  readonly employmentTypes = EMPLOYMENT_TYPES;
  readonly workSetups = WORK_SETUPS;

  private jobsSub?: Subscription;

  constructor(
    private jobPostingsService: JobPostingsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  ngOnDestroy(): void {
    this.jobsSub?.unsubscribe();
  }

  loadJobs(): void {
    this.loading = true;
    this.loadError = '';
    this.jobsSub?.unsubscribe();

    this.jobsSub = this.jobPostingsService.getJobPostings().subscribe({
      next: (records) => {
        this.jobs = (Array.isArray(records) ? records : [])
          .filter((job) => job.status === 'Active')
          .map((job) => ({
            ...job,
            recommendedPrograms: Array.isArray(job.recommendedPrograms)
              ? job.recommendedPrograms
              : [],
          }))
          .sort((a, b) => this.toTime(b.createdAt) - this.toTime(a.createdAt));

        this.applyFilters(false);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load alumni job postings:', err);
        this.loadError = 'Failed to load job postings.';
        this.jobs = [];
        this.filteredJobs = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters(triggerDetectChanges = true): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredJobs = this.jobs
      .filter((job) => {
        const jobTitle = (job.jobTitle || '').toLowerCase();
        const companyName = (job.companyName || '').toLowerCase();
        const location = (job.location || '').toLowerCase();
        const category = (job.category || '').toLowerCase();
        const employmentType = (job.employmentType || '').toLowerCase();
        const workSetup = (job.workSetup || '').toLowerCase();

        const matchesSearch =
          !term ||
          jobTitle.includes(term) ||
          companyName.includes(term) ||
          location.includes(term) ||
          category.includes(term) ||
          employmentType.includes(term) ||
          workSetup.includes(term);

        const matchesType =
          !this.filterEmploymentType || job.employmentType === this.filterEmploymentType;

        const matchesSetup =
          !this.filterWorkSetup || job.workSetup === this.filterWorkSetup;

        const matchesCategory =
          !this.filterCategory || job.category === this.filterCategory;

        return matchesSearch && matchesType && matchesSetup && matchesCategory;
      })
      .sort((a, b) => this.toTime(b.createdAt) - this.toTime(a.createdAt));

    if (triggerDetectChanges) {
      this.cdr.detectChanges();
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterEmploymentType = '';
    this.filterWorkSetup = '';
    this.filterCategory = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.filterEmploymentType ||
      this.filterWorkSetup ||
      this.filterCategory
    );
  }

  get totalCount(): number {
    return this.jobs.length;
  }

  openView(job: JobPosting): void {
    this.selectedJob = job;
    this.showViewModal = true;
    this.cdr.detectChanges();
  }

  closeView(): void {
    this.showViewModal = false;
    this.selectedJob = null;
    this.cdr.detectChanges();
  }

  isDeadlinePast(deadline: string): boolean {
    if (!deadline) return false;

    const deadlineDate = new Date(`${deadline}T23:59:59`);
    const today = new Date();

    return deadlineDate < today;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';

    const date = new Date(`${dateStr}T00:00:00`);

    if (isNaN(date.getTime())) return dateStr;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatPostedDate(createdAt: any): string {
    if (!createdAt) return '—';

    const value =
      typeof createdAt === 'string'
        ? createdAt
        : createdAt?.toDate?.() ?? createdAt;

    const date = new Date(value);

    if (isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  getRecommendedPrograms(job: JobPosting | null): string[] {
    return Array.isArray(job?.recommendedPrograms) ? job!.recommendedPrograms : [];
  }

  trackByJob(index: number, job: JobPosting): string {
    return job.id ?? index.toString();
  }

  private toTime(value: any): number {
    if (!value) return 0;

    const resolved =
      typeof value === 'string'
        ? value
        : value?.toDate?.() ?? value;

    const time = new Date(resolved).getTime();

    return isNaN(time) ? 0 : time;
  }
}