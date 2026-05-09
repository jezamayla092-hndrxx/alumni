import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  JobPosting,
  JobStatus,
  JOB_CATEGORIES,
  EMPLOYMENT_TYPES,
  WORK_SETUPS,
  APPLICATION_METHODS,
  JOB_STATUSES,
  RECOMMENDED_PROGRAMS,
} from '../../../models/job-postings.model';
import { JobPostingsService } from '../../../services/job-postings.service';

interface JobForm {
  jobTitle: string;
  companyName: string;
  companyLogo: string;
  location: string;
  category: string;
  employmentType: string;
  workSetup: string;
  salaryRange: string;
  jobDescription: string;
  qualifications: string;
  applicationMethod: string;
  applicationLink: string;
  contactEmail: string;
  deadline: string;
  status: JobStatus;
  openToAllAlumni: boolean;
  recommendedPrograms: string[];
}

@Component({
  selector: 'app-job-postings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-postings.html',
  styleUrls: ['./job-postings.scss'],
})
export class JobPostings implements OnInit {
  // ─── Data ─────────────────────────────────────────────────────────────────
  jobs: JobPosting[] = [];
  filteredJobs: JobPosting[] = [];

  // ─── State ────────────────────────────────────────────────────────────────
  loading = false;
  saving = false;
  deleting = false;
  loadError = '';
  formError = '';

  // ─── Modals ───────────────────────────────────────────────────────────────
  showFormModal = false;
  showViewModal = false;
  showDeleteModal = false;
  isEditMode = false;

  selectedJob: JobPosting | null = null;
  jobToDelete: JobPosting | null = null;

  // ─── Filters ──────────────────────────────────────────────────────────────
  searchTerm = '';
  filterEmploymentType = '';
  filterWorkSetup = '';
  filterStatus = '';
  filterCategory = '';

  // ─── Options ──────────────────────────────────────────────────────────────
  readonly categories = JOB_CATEGORIES;
  readonly employmentTypes = EMPLOYMENT_TYPES;
  readonly workSetups = WORK_SETUPS;
  readonly applicationMethods = APPLICATION_METHODS;
  readonly jobStatuses = JOB_STATUSES;
  readonly programs = RECOMMENDED_PROGRAMS;

  // ─── Form ─────────────────────────────────────────────────────────────────
  form: JobForm = this.getEmptyForm();

  constructor(
    private jobPostingsService: JobPostingsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  // ─── Summary counts ───────────────────────────────────────────────────────
  get activeCount(): number {
    return this.jobs.filter((j) => j.status === 'Active').length;
  }

  get draftCount(): number {
    return this.jobs.filter((j) => j.status === 'Draft').length;
  }

  get closedCount(): number {
    return this.jobs.filter((j) => j.status === 'Closed').length;
  }

  get totalCount(): number {
    return this.jobs.length;
  }

  // ─── Load ─────────────────────────────────────────────────────────────────
  loadJobs(): void {
    this.loading = true;
    this.loadError = '';

    this.jobPostingsService.getJobPostings().subscribe({
      next: (records: JobPosting[]) => {
        this.jobs = records ?? [];
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        console.error('Failed to load job postings:', error);
        this.loadError = 'Failed to load job postings.';
        this.jobs = [];
        this.filteredJobs = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ─── Filters ──────────────────────────────────────────────────────────────
  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredJobs = this.jobs.filter((job) => {
      const matchesSearch =
        !term ||
        job.jobTitle.toLowerCase().includes(term) ||
        job.companyName.toLowerCase().includes(term) ||
        job.location.toLowerCase().includes(term) ||
        job.category.toLowerCase().includes(term);

      const matchesType =
        !this.filterEmploymentType ||
        job.employmentType === this.filterEmploymentType;

      const matchesSetup =
        !this.filterWorkSetup || job.workSetup === this.filterWorkSetup;

      const matchesStatus =
        !this.filterStatus || job.status === this.filterStatus;

      const matchesCategory =
        !this.filterCategory || job.category === this.filterCategory;

      return matchesSearch && matchesType && matchesSetup && matchesStatus && matchesCategory;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterEmploymentType = '';
    this.filterWorkSetup = '';
    this.filterStatus = '';
    this.filterCategory = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.filterEmploymentType ||
      this.filterWorkSetup ||
      this.filterStatus ||
      this.filterCategory
    );
  }

  // ─── Form Modal ───────────────────────────────────────────────────────────
  openAddModal(): void {
    this.isEditMode = false;
    this.selectedJob = null;
    this.form = this.getEmptyForm();
    this.formError = '';
    this.showFormModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(job: JobPosting): void {
    this.isEditMode = true;
    this.selectedJob = job;
    this.form = {
      jobTitle: job.jobTitle,
      companyName: job.companyName,
      companyLogo: job.companyLogo ?? '',
      location: job.location,
      category: job.category,
      employmentType: job.employmentType,
      workSetup: job.workSetup,
      salaryRange: job.salaryRange ?? '',
      jobDescription: job.jobDescription,
      qualifications: job.qualifications,
      applicationMethod: job.applicationMethod,
      applicationLink: job.applicationLink ?? '',
      contactEmail: job.contactEmail ?? '',
      deadline: job.deadline,
      status: job.status,
      openToAllAlumni: job.openToAllAlumni,
      recommendedPrograms: [...(job.recommendedPrograms ?? [])],
    };
    this.formError = '';
    this.showFormModal = true;
    this.cdr.detectChanges();
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.isEditMode = false;
    this.selectedJob = null;
    this.form = this.getEmptyForm();
    this.formError = '';
    this.saving = false;
    this.cdr.detectChanges();
  }

  // ─── View Modal ───────────────────────────────────────────────────────────
  openViewModal(job: JobPosting): void {
    this.selectedJob = job;
    this.showViewModal = true;
    this.cdr.detectChanges();
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedJob = null;
    this.cdr.detectChanges();
  }

  openEditFromView(): void {
    const job = this.selectedJob;
    this.closeViewModal();
    if (job) this.openEditModal(job);
  }

  // ─── Delete Modal ─────────────────────────────────────────────────────────
  openDeleteModal(job: JobPosting): void {
    this.jobToDelete = job;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.jobToDelete = null;
    this.deleting = false;
    this.cdr.detectChanges();
  }

  async confirmDelete(): Promise<void> {
    if (!this.jobToDelete?.id || this.deleting) return;

    this.deleting = true;
    this.cdr.detectChanges();

    try {
      await this.jobPostingsService.deleteJobPosting(this.jobToDelete.id);
      this.showDeleteModal = false;
      this.jobToDelete = null;
      this.deleting = false;
      this.cdr.detectChanges();
    } catch (error: unknown) {
      console.error('Failed to delete job posting:', error);
      this.deleting = false;
      this.cdr.detectChanges();
    }
  }

  // ─── Save / Publish ───────────────────────────────────────────────────────
  async saveAsDraft(): Promise<void> {
    this.form.status = 'Draft';
    await this.submitForm();
  }

  async publishJob(): Promise<void> {
    this.form.status = 'Active';
    await this.submitForm();
  }

  async updateJob(): Promise<void> {
    await this.submitForm();
  }

  private async submitForm(): Promise<void> {
    if (this.saving) return;

    this.formError = this.validateForm();
    if (this.formError) {
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.formError = '';
    this.cdr.detectChanges();

    const now = new Date().toISOString();

    const payload: Omit<JobPosting, 'id'> = {
      jobTitle: this.form.jobTitle.trim(),
      companyName: this.form.companyName.trim(),
      companyLogo: this.form.companyLogo.trim() || undefined,
      location: this.form.location.trim(),
      category: this.form.category,
      employmentType: this.form.employmentType,
      workSetup: this.form.workSetup,
      salaryRange: this.form.salaryRange.trim() || undefined,
      jobDescription: this.form.jobDescription.trim(),
      qualifications: this.form.qualifications.trim(),
      applicationMethod: this.form.applicationMethod,
      applicationLink:
        this.form.applicationMethod === 'Application Link'
          ? this.form.applicationLink.trim()
          : undefined,
      contactEmail:
        this.form.applicationMethod === 'Email'
          ? this.form.contactEmail.trim()
          : undefined,
      deadline: this.form.deadline,
      status: this.form.status,
      openToAllAlumni: this.form.openToAllAlumni,
      recommendedPrograms: [...this.form.recommendedPrograms],
      createdAt: this.isEditMode ? (this.selectedJob?.createdAt ?? now) : now,
      updatedAt: now,
      postedBy: this.selectedJob?.postedBy ?? undefined,
    };

    try {
      if (this.isEditMode && this.selectedJob?.id) {
        await this.jobPostingsService.updateJobPosting(this.selectedJob.id, {
          ...payload,
          updatedAt: now,
        });
      } else {
        await this.jobPostingsService.addJobPosting({ ...payload, createdAt: now });
      }

      this.closeFormModal();
    } catch (error: unknown) {
      console.error('Failed to save job posting:', error);
      this.formError =
        error instanceof Error ? error.message : 'Failed to save. Please try again.';
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  // ─── Programs Checkbox ────────────────────────────────────────────────────
  toggleProgram(program: string): void {
    const idx = this.form.recommendedPrograms.indexOf(program);
    if (idx >= 0) {
      this.form.recommendedPrograms.splice(idx, 1);
    } else {
      this.form.recommendedPrograms.push(program);
    }
  }

  isProgramSelected(program: string): boolean {
    return this.form.recommendedPrograms.includes(program);
  }

  // ─── Validation ───────────────────────────────────────────────────────────
  private validateForm(): string {
    if (!this.form.jobTitle.trim()) return 'Job title is required.';
    if (!this.form.companyName.trim()) return 'Company name is required.';
    if (!this.form.location.trim()) return 'Location is required.';
    if (!this.form.category) return 'Category / Industry is required.';
    if (!this.form.employmentType) return 'Employment type is required.';
    if (!this.form.workSetup) return 'Work setup is required.';
    if (!this.form.jobDescription.trim()) return 'Job description is required.';
    if (!this.form.qualifications.trim()) return 'Qualifications are required.';
    if (!this.form.applicationMethod) return 'Application method is required.';
    if (
      this.form.applicationMethod === 'Application Link' &&
      !this.form.applicationLink.trim()
    )
      return 'Application link is required when method is "Application Link".';
    if (
      this.form.applicationMethod === 'Email' &&
      !this.form.contactEmail.trim()
    )
      return 'Contact email is required when method is "Email".';
    if (!this.form.deadline) return 'Application deadline is required.';
    return '';
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatPostedDate(createdAt: any): string {
    if (!createdAt) return '—';
    const d = new Date(
      typeof createdAt === 'string' ? createdAt : createdAt?.toDate?.() ?? createdAt
    );
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  isDeadlinePast(deadline: string): boolean {
    if (!deadline) return false;
    return new Date(deadline + 'T00:00:00') < new Date();
  }

  trackByJob(index: number, job: JobPosting): string {
    return job.id ?? index.toString();
  }

  private getEmptyForm(): JobForm {
    return {
      jobTitle: '',
      companyName: '',
      companyLogo: '',
      location: '',
      category: '',
      employmentType: '',
      workSetup: '',
      salaryRange: '',
      jobDescription: '',
      qualifications: '',
      applicationMethod: '',
      applicationLink: '',
      contactEmail: '',
      deadline: '',
      status: 'Active',
      openToAllAlumni: true,
      recommendedPrograms: [],
    };
  }
}