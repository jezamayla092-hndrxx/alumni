import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Swal from 'sweetalert2';

import { EmploymentStatusService } from '../../../services/employment-status.service';
import {
  EmploymentStatusData,
  createEmptyEmploymentStatus,
  EMPLOYMENT_STATUS_OPTIONS,
  JOB_OPPORTUNITY_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  INDUSTRY_OPTIONS,
  CAREER_LEVEL_OPTIONS,
  COURSE_RELEVANCE_OPTIONS,
  STUDY_LEVEL_OPTIONS,
  STUDY_STATUS_OPTIONS,
  LOOKING_FOR_WORK_OPTIONS,
  CURRENT_ACTIVITY_OPTIONS,
  CAREER_CATEGORIES,
  PREFERRED_WORK_TYPE_OPTIONS,
} from '../../../models/employment-status.model';

@Component({
  selector: 'app-employment-status',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employment-status.html',
  styleUrls: ['./employment-status.scss'],
})
export class EmploymentStatusComponent implements OnInit {
  form: EmploymentStatusData      = createEmptyEmploymentStatus();
  savedForm: EmploymentStatusData = createEmptyEmploymentStatus();

  loading   = true;
  saving    = false;
  attempted = false;

  readonly statusOptions          = EMPLOYMENT_STATUS_OPTIONS;
  readonly jobOpportunityOptions  = JOB_OPPORTUNITY_OPTIONS;
  readonly employmentTypeOptions  = EMPLOYMENT_TYPE_OPTIONS;
  readonly industryOptions        = INDUSTRY_OPTIONS;
  readonly careerLevelOptions     = CAREER_LEVEL_OPTIONS;
  readonly courseRelevanceOptions = COURSE_RELEVANCE_OPTIONS;
  readonly studyLevelOptions      = STUDY_LEVEL_OPTIONS;
  readonly studyStatusOptions     = STUDY_STATUS_OPTIONS;
  readonly lookingForWorkOptions  = LOOKING_FOR_WORK_OPTIONS;
  readonly currentActivityOptions = CURRENT_ACTIVITY_OPTIONS;
  readonly careerCategories       = CAREER_CATEGORIES;
  readonly preferredWorkTypeOpts  = PREFERRED_WORK_TYPE_OPTIONS;

  // ── ADDED: NgZone injected ───────────────────────────────────────
  constructor(
    private employmentStatusService: EmploymentStatusService,
    private ngZone: NgZone,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  // ── FIXED: wait for Firebase auth state before fetching ──────────
  private loadData(): Promise<void> {
    return new Promise((resolve) => {
      const auth        = getAuth();
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe(); // listen once, then stop

        if (!user) {
          this.ngZone.run(() => {
            this.loading = false;
            resolve();
          });
          return;
        }

        try {
          const data = await this.employmentStatusService.getByUid(user.uid);
          if (data) {
            this.form      = { ...createEmptyEmploymentStatus(), ...data };
            this.savedForm = { ...this.form, careerCategories: [...(this.form.careerCategories ?? [])] };
          }
        } catch (err) {
          console.error('Failed to load employment status:', err);
        } finally {
          // ngZone.run() ensures Angular's change detection sees the update
          this.ngZone.run(() => {
            this.loading = false;
            resolve();
          });
        }
      });
    });
  }

  // ── Status state helpers (unchanged) ────────────────────────────
  get isEmployed(): boolean            { return this.form.status === 'Employed'; }
  get isSelfEmployed(): boolean        { return this.form.status === 'Self-employed'; }
  get isUnemployed(): boolean          { return this.form.status === 'Unemployed'; }
  get isFurtherStudies(): boolean      { return this.form.status === 'Further Studies'; }
  get isEmployedAndStudying(): boolean { return this.form.status === 'Employed and Studying'; }
  get isNotSeeking(): boolean          { return this.form.status === 'Not currently seeking employment'; }

  get showEmploymentSection(): boolean { return this.isEmployed || this.isSelfEmployed || this.isEmployedAndStudying; }
  get showStudySection(): boolean      { return this.isFurtherStudies || this.isEmployedAndStudying; }

  onStatusChange(): void {
    if (!this.showEmploymentSection) {
      this.form.companyName     = '';
      this.form.jobPosition     = '';
      this.form.industry        = '';
      this.form.employmentType  = '';
      this.form.workLocation    = '';
      this.form.dateHired       = '';
      this.form.careerLevel     = '';
      this.form.courseRelevance = '';
      this.form.businessName    = '';
      this.form.businessRole    = '';
      this.form.businessLocation = '';
      this.form.dateStarted     = '';
    }
    if (!this.showStudySection) {
      this.form.institutionName        = '';
      this.form.programTaking          = '';
      this.form.studyLevel             = '';
      this.form.studyStatus            = '';
      this.form.fieldOfStudy           = '';
      this.form.startYear              = '';
      this.form.expectedCompletionYear = '';
      this.form.studyCourseRelevance   = '';
      this.form.studyNotes             = '';
    }
    if (!this.isUnemployed) {
      this.form.lookingForWork        = '';
      this.form.preferredIndustry     = '';
      this.form.preferredWorkType     = '';
      this.form.preferredWorkLocation = '';
      this.form.previousJobPosition   = '';
      this.form.previousCompany       = '';
      this.form.unemployedSkills      = '';
      this.form.unemployedNotes       = '';
    }
    if (!this.isNotSeeking) {
      this.form.currentActivity  = '';
      this.form.careerPlans      = '';
      this.form.notSeekingNotes  = '';
    }
    if (this.isSelfEmployed) {
      this.form.employmentType = 'Self-employed';
    } else if (this.form.employmentType === 'Self-employed') {
      this.form.employmentType = '';
    }
  }

  toggleCategory(cat: string): void {
    const cats = this.form.careerCategories ?? [];
    const idx  = cats.indexOf(cat);
    this.form.careerCategories = idx === -1
      ? [...cats, cat]
      : cats.filter(c => c !== cat);
  }

  isCategorySelected(cat: string): boolean {
    return (this.form.careerCategories ?? []).includes(cat);
  }

  fieldError(field: string): boolean {
    if (!this.attempted) return false;
    const f = this.form;
    switch (field) {
      case 'status':            return !f.status;
      case 'companyName':       return (this.isEmployed || this.isEmployedAndStudying) && !f.companyName.trim();
      case 'jobPosition':       return (this.isEmployed || this.isEmployedAndStudying) && !f.jobPosition.trim();
      case 'industry':          return (this.isEmployed || this.isEmployedAndStudying || this.isSelfEmployed) && !f.industry;
      case 'employmentType':    return (this.isEmployed || this.isEmployedAndStudying) && !f.employmentType;
      case 'courseRelevance':   return (this.isEmployed || this.isEmployedAndStudying) && !f.courseRelevance;
      case 'businessName':      return this.isSelfEmployed && !f.businessName.trim();
      case 'businessRole':      return this.isSelfEmployed && !f.businessRole.trim();
      case 'businessRelevance': return this.isSelfEmployed && !f.courseRelevance;
      case 'lookingForWork':    return this.isUnemployed && !f.lookingForWork;
      case 'institutionName':   return this.showStudySection && !f.institutionName.trim();
      case 'programTaking':     return this.showStudySection && !f.programTaking.trim();
      case 'studyLevel':        return this.showStudySection && !f.studyLevel;
      case 'studyStatus':       return this.isFurtherStudies && !f.studyStatus;
      case 'studyCourseRel':    return this.isFurtherStudies && !f.studyCourseRelevance;
      case 'currentActivity':   return this.isNotSeeking && !f.currentActivity;
      default: return false;
    }
  }

  private validateForm(): boolean {
    this.attempted = true;
    const f = this.form;
    if (!f.status) return false;
    if (this.isEmployed || this.isEmployedAndStudying) {
      if (!f.companyName.trim() || !f.jobPosition.trim() || !f.industry || !f.employmentType || !f.courseRelevance) return false;
    }
    if (this.isSelfEmployed) {
      if (!f.businessName.trim() || !f.businessRole.trim() || !f.industry || !f.courseRelevance) return false;
    }
    if (this.isUnemployed && !f.lookingForWork) return false;
    if (this.showStudySection) {
      if (!f.institutionName.trim() || !f.programTaking.trim() || !f.studyLevel) return false;
      if (this.isFurtherStudies && (!f.studyStatus || !f.studyCourseRelevance)) return false;
    }
    if (this.isNotSeeking && !f.currentActivity) return false;
    return true;
  }

  get summaryStatus(): string        { return this.savedForm.status || '—'; }
  get summaryJobPreference(): string { return this.savedForm.jobOpportunityPreference || '—'; }

  get summaryCourseRelevance(): string {
    const s = this.savedForm;
    if (s.status === 'Employed' || s.status === 'Self-employed' || s.status === 'Employed and Studying') {
      return s.courseRelevance || '—';
    }
    if (s.status === 'Further Studies') return s.studyCourseRelevance || '—';
    return '—';
  }

  get summaryLastUpdated(): string {
    if (!this.savedForm.lastUpdated) return '—';
    return this.formatDate(this.savedForm.lastUpdated);
  }

  get footerLastUpdated(): string {
    if (!this.savedForm.lastUpdated) return 'Not yet updated.';
    return `Last updated: ${this.formatDate(this.savedForm.lastUpdated)}`;
  }

  private formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  async save(): Promise<void> {
    if (!this.validateForm()) {
      await Swal.fire({ icon: 'warning', title: 'Incomplete Form', text: 'Please complete all required fields before saving.', confirmButtonText: 'OK' });
      return;
    }
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      await Swal.fire({ icon: 'error', title: 'Not Authenticated', text: 'You must be logged in to save your information.', confirmButtonText: 'OK' });
      return;
    }
    this.saving = true;
    try {
      this.form.lastUpdated = new Date().toISOString();
      await this.employmentStatusService.save(uid, { ...this.form });
      this.savedForm = { ...this.form, careerCategories: [...this.form.careerCategories] };
      this.attempted = false;
      await Swal.fire({ icon: 'success', title: 'Saved', text: 'Your employment information has been updated successfully.', confirmButtonText: 'OK' });
    } catch (err) {
      console.error('Save failed:', err);
      this.form.lastUpdated = this.savedForm.lastUpdated;
      await Swal.fire({ icon: 'error', title: 'Save Failed', text: 'Something went wrong. Please try again.', confirmButtonText: 'OK' });
    } finally {
      this.saving = false;
    }
  }

  reset(): void {
    this.form      = { ...this.savedForm, careerCategories: [...(this.savedForm.careerCategories ?? [])] };
    this.attempted = false;
  }
}