import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  Announcement,
  AnnouncementStatus,
  AnnouncementCategory,
  AnnouncementVisibility,
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_STATUSES,
  ANNOUNCEMENT_VISIBILITIES,
  ANNOUNCEMENT_PROGRAMS,
} from '../../../models/announcements.model';
import { AnnouncementService } from '../../../services/announcements.service';

interface AnnouncementForm {
  title: string;
  content: string;
  category: AnnouncementCategory | '';
  visibility: AnnouncementVisibility | '';
  program: string;
  status: AnnouncementStatus;
  isPinned: boolean;
}

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './announcements.html',
  styleUrls: ['./announcements.scss'],
})
export class Announcements implements OnInit, OnDestroy {
  // ─── Data ──────────────────────────────────────────────────────────────────
  announcements: Announcement[] = [];
  filteredAnnouncements: Announcement[] = [];

  // ─── State ─────────────────────────────────────────────────────────────────
  loading = false;
  saving = false;
  deleting = false;
  loadError = '';
  formError = '';

  // ─── Pin guard: prevents double-clicks from firing concurrent toggles ───────
  private togglingPinIds = new Set<string>();

  // ─── Modals ────────────────────────────────────────────────────────────────
  showFormModal = false;
  showViewModal = false;
  showDeleteModal = false;
  isEditMode = false;

  selectedAnnouncement: Announcement | null = null;
  announcementToDelete: Announcement | null = null;

  // ─── Filters ───────────────────────────────────────────────────────────────
  searchTerm = '';
  filterStatus = '';
  filterCategory = '';

  // ─── Options ───────────────────────────────────────────────────────────────
  readonly categories = ANNOUNCEMENT_CATEGORIES;
  readonly statuses = ANNOUNCEMENT_STATUSES;
  readonly visibilities = ANNOUNCEMENT_VISIBILITIES;
  readonly programs = ANNOUNCEMENT_PROGRAMS;

  // ─── Form ──────────────────────────────────────────────────────────────────
  form: AnnouncementForm = this.getEmptyForm();

  private announcementsSub?: Subscription;

  constructor(
    private announcementService: AnnouncementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAnnouncements();
  }

  ngOnDestroy(): void {
    this.announcementsSub?.unsubscribe();
  }

  // ─── Summary counts ────────────────────────────────────────────────────────
  get totalCount(): number { return this.announcements.length; }
  get publishedCount(): number { return this.announcements.filter((a) => a.status === 'Published').length; }
  get draftCount(): number { return this.announcements.filter((a) => a.status === 'Draft').length; }
  get pinnedCount(): number { return this.announcements.filter((a) => a.isPinned).length; }

  // ─── Load ──────────────────────────────────────────────────────────────────
  loadAnnouncements(): void {
    this.loading = true;
    this.loadError = '';
    this.announcementsSub?.unsubscribe();

    this.announcementsSub = this.announcementService.getAnnouncements().subscribe({
      next: (records) => {
        this.announcements = records ?? [];
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load announcements:', err);
        this.loadError = 'Failed to load announcements.';
        this.announcements = [];
        this.filteredAnnouncements = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ─── Filters ───────────────────────────────────────────────────────────────
  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredAnnouncements = this.announcements.filter((item) => {
      const matchesSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.content.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term) ||
        item.visibility.toLowerCase().includes(term);

      const matchesStatus = !this.filterStatus || item.status === this.filterStatus;
      const matchesCategory = !this.filterCategory || item.category === this.filterCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterStatus = '';
    this.filterCategory = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterStatus || this.filterCategory);
  }

  // ─── Form modal ────────────────────────────────────────────────────────────
  openCreate(): void {
    this.isEditMode = false;
    this.selectedAnnouncement = null;
    this.form = this.getEmptyForm();
    this.formError = '';
    this.showFormModal = true;
    this.cdr.detectChanges();
  }

  openEdit(item: Announcement): void {
    this.isEditMode = true;
    this.selectedAnnouncement = item;
    this.form = {
      title: item.title,
      content: item.content,
      category: item.category,
      visibility: item.visibility,
      program: item.program ?? '',
      status: item.status,
      isPinned: item.isPinned,
    };
    this.formError = '';
    this.showFormModal = true;
    this.cdr.detectChanges();
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.isEditMode = false;
    this.selectedAnnouncement = null;
    this.form = this.getEmptyForm();
    this.formError = '';
    this.saving = false;
    this.cdr.detectChanges();
  }

  // ─── View modal ────────────────────────────────────────────────────────────
  openView(item: Announcement): void {
    this.selectedAnnouncement = item;
    this.showViewModal = true;
    this.cdr.detectChanges();
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedAnnouncement = null;
    this.cdr.detectChanges();
  }

  openEditFromView(): void {
    const item = this.selectedAnnouncement;
    this.closeViewModal();
    if (item) this.openEdit(item);
  }

  // ─── Delete modal ──────────────────────────────────────────────────────────
  openDelete(item: Announcement): void {
    this.announcementToDelete = item;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDelete(): void {
    this.showDeleteModal = false;
    this.announcementToDelete = null;
    this.deleting = false;
    this.cdr.detectChanges();
  }

  async confirmDelete(): Promise<void> {
    if (!this.announcementToDelete?.id || this.deleting) return;

    this.deleting = true;
    this.cdr.detectChanges();

    try {
      await this.announcementService.deleteAnnouncement(this.announcementToDelete.id);
      this.showDeleteModal = false;
      this.announcementToDelete = null;
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      this.deleting = false;
      this.cdr.detectChanges();
    }
  }

  // ─── Save ──────────────────────────────────────────────────────────────────
  async save(): Promise<void> {
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

    try {
      const payload: Omit<Announcement, 'id'> = {
        title: this.form.title.trim(),
        content: this.form.content.trim(),
        category: this.form.category as AnnouncementCategory,
        visibility: this.form.visibility as AnnouncementVisibility,
        ...(this.form.visibility === 'Specific Program' && this.form.program
          ? { program: this.form.program }
          : {}),
        status: this.form.status,
        isPinned: this.form.isPinned,
        ...(this.selectedAnnouncement?.createdBy
          ? { createdBy: this.selectedAnnouncement.createdBy }
          : {}),
        createdAt: this.isEditMode
          ? (this.selectedAnnouncement?.createdAt ?? now)
          : now,
        updatedAt: now,
      };

      if (this.isEditMode && this.selectedAnnouncement?.id) {
        await this.announcementService.updateAnnouncement(
          this.selectedAnnouncement.id,
          { ...payload, updatedAt: now }
        );
      } else {
        await this.announcementService.addAnnouncement({
          ...payload,
          createdAt: now,
        });
      }

      this.closeFormModal();
    } catch (err) {
      console.error('Failed to save:', err);
      this.formError =
        err instanceof Error ? err.message : 'Failed to save. Please try again.';
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  // ─── Pin toggle — guarded against concurrent clicks ────────────────────────
  async togglePin(item: Announcement): Promise<void> {
    const id = item.id;
    if (!id || this.togglingPinIds.has(id)) return;

    this.togglingPinIds.add(id);
    this.cdr.detectChanges();

    try {
      await this.announcementService.updateAnnouncement(id, {
        isPinned: !item.isPinned,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    } finally {
      this.togglingPinIds.delete(id);
      this.cdr.detectChanges();
    }
  }

  // Exposes pin loading state to the template
  isPinToggling(item: Announcement): boolean {
    return !!item.id && this.togglingPinIds.has(item.id);
  }

  // ─── Archive ───────────────────────────────────────────────────────────────
  async archive(item: Announcement): Promise<void> {
    if (!item.id) return;
    try {
      await this.announcementService.updateAnnouncement(item.id, {
        status: 'Archived',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  }

  // ─── Validation ────────────────────────────────────────────────────────────
  private validateForm(): string {
    if (!this.form.title.trim()) return 'Announcement title is required.';
    if (!this.form.content.trim()) return 'Content is required.';
    if (!this.form.category) return 'Category is required.';
    if (!this.form.visibility) return 'Visibility is required.';
    if (this.form.visibility === 'Specific Program' && !this.form.program)
      return 'Please select a program for Specific Program visibility.';
    return '';
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  getPreview(item: Announcement): string {
    const raw = item.content || '';
    return raw.length > 110 ? `${raw.slice(0, 110)}...` : raw;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  trackByAnnouncement(_: number, item: Announcement): string {
    return item.id ?? _.toString();
  }

  private getEmptyForm(): AnnouncementForm {
    return {
      title: '',
      content: '',
      category: '',
      visibility: '',
      program: '',
      status: 'Published',
      isPinned: false,
    };
  }
}