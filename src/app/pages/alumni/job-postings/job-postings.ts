import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { JobPosting, JOB_CATEGORIES, EMPLOYMENT_TYPES, WORK_SETUPS } from '../../../models/job-postings.model';
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

  ngOnInit(): void { this.loadJobs(); }
  ngOnDestroy(): void { this.jobsSub?.unsubscribe(); }

  loadJobs(): void {
    this.loading = true;
    this.loadError = '';
    this.jobsSub?.unsubscribe();
    this.jobsSub = this.jobPostingsService.getJobPostings().subscribe({
      next: (records) => {
        // Alumni only sees Active jobs
        this.jobs = (records ?? []).filter((j) => j.status === 'Active');
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loadError = 'Failed to load job postings.';
        this.jobs = [];
        this.filteredJobs = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredJobs = this.jobs.filter((j) => {
      const matchesSearch = !term ||
        j.jobTitle?.toLowerCase().includes(term) ||
        j.companyName?.toLowerCase().includes(term) ||
        j.location?.toLowerCase().includes(term) ||
        j.category?.toLowerCase().includes(term);
      const matchesType   = !this.filterEmploymentType || j.employmentType === this.filterEmploymentType;
      const matchesSetup  = !this.filterWorkSetup      || j.workSetup === this.filterWorkSetup;
      const matchesCat    = !this.filterCategory       || j.category === this.filterCategory;
      return matchesSearch && matchesType && matchesSetup && matchesCat;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterEmploymentType = '';
    this.filterWorkSetup = '';
    this.filterCategory = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterEmploymentType || this.filterWorkSetup || this.filterCategory);
  }

  get totalCount(): number  { return this.jobs.length; }

  openView(job: JobPosting): void { this.selectedJob = job; this.showViewModal = true; this.cdr.detectChanges(); }
  closeView(): void { this.showViewModal = false; this.selectedJob = null; this.cdr.detectChanges(); }

  isDeadlinePast(deadline: string): boolean {
    if (!deadline) return false;
    return new Date(`${deadline}T23:59:59`) < new Date();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatPostedDate(createdAt: any): string {
    if (!createdAt) return '—';
    const val = typeof createdAt === 'string' ? createdAt : createdAt?.toDate?.() ?? createdAt;
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  trackByJob(_: number, job: JobPosting): string { return job.id ?? _.toString(); }
}