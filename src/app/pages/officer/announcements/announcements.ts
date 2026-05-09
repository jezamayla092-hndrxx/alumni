import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  imageUrl: string;
  attachmentUrl: string;
  attachmentName: string;
  attachmentType: string;
}

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './announcements.html',
  styleUrls: ['./announcements.scss'],
})
export class Announcements implements OnInit, OnDestroy {
  // ─── Data ─────────────────────────────────────────────────────────────────
  announcements: Announcement[] = [];
  filteredAnnouncements: Announcement[] = [];

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

  selectedAnnouncement: Announcement | null = null;
  announcementToDelete: Announcement | null = null;

  // ─── Filters ──────────────────────────────────────────────────────────────
  searchTerm = '';
  filterStatus = '';
  filterCategory = '';

  // ─── Options ──────────────────────────────────────────────────────────────
  readonly categories = ANNOUNCEMENT_CATEGORIES;
  readonly statuses = ANNOUNCEMENT_STATUSES;
  readonly visibilities = ANNOUNCEMENT_VISIBILITIES;
  readonly programs = ANNOUNCEMENT_PROGRAMS;

  // ─── Form ─────────────────────────────────────────────────────────────────
  form: AnnouncementForm = this.getEmptyForm();

  // ─── Upload state ─────────────────────────────────────────────────────────
  selectedImageFile: File | null = null;
  imagePreviewUrl = '';
  selectedAttachmentFile: File | null = null;

  constructor(
    private announcementService: AnnouncementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAnnouncements();
  }

  ngOnDestroy(): void {
    this.revokeImagePreview();
  }

  // ─── Summary counts ───────────────────────────────────────────────────────
  get totalCount(): number {
    return this.announcements.length;
  }

  get publishedCount(): number {
    return this.announcements.filter((a) => a.status === 'Published').length;
  }

  get draftCount(): number {
    return this.announcements.filter((a) => a.status === 'Draft').length;
  }

  get pinnedCount(): number {
    return this.announcements.filter((a) => a.isPinned).length;
  }

  // ─── Load ─────────────────────────────────────────────────────────────────
  loadAnnouncements(): void {
    this.loading = true;
    this.loadError = '';

    this.announcementService.getAnnouncements().subscribe({
      next: (records) => {
        this.announcements = records ?? [];
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load announcements:', error);
        this.loadError = 'Failed to load announcements.';
        this.announcements = [];
        this.filteredAnnouncements = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ─── Filters ──────────────────────────────────────────────────────────────
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

      const matchesStatus =
        !this.filterStatus || item.status === this.filterStatus;

      const matchesCategory =
        !this.filterCategory || item.category === this.filterCategory;

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

  // ─── Form modal ───────────────────────────────────────────────────────────
  openCreate(): void {
    this.isEditMode = false;
    this.selectedAnnouncement = null;
    this.form = this.getEmptyForm();
    this.selectedImageFile = null;
    this.selectedAttachmentFile = null;
    this.revokeImagePreview();
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
      imageUrl: item.imageUrl ?? '',
      attachmentUrl: item.attachmentUrl ?? '',
      attachmentName: item.attachmentName ?? '',
      attachmentType: item.attachmentType ?? '',
    };
    this.selectedImageFile = null;
    this.selectedAttachmentFile = null;
    this.imagePreviewUrl = item.imageUrl ?? '';
    this.formError = '';
    this.showFormModal = true;
    this.cdr.detectChanges();
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.isEditMode = false;
    this.selectedAnnouncement = null;
    this.form = this.getEmptyForm();
    this.selectedImageFile = null;
    this.selectedAttachmentFile = null;
    this.revokeImagePreview();
    this.formError = '';
    this.saving = false;
    this.cdr.detectChanges();
  }

  // ─── View modal ───────────────────────────────────────────────────────────
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

  // ─── Delete modal ─────────────────────────────────────────────────────────
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
      this.deleting = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to delete:', error);
      this.deleting = false;
      this.cdr.detectChanges();
    }
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
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
      let imageUrl = this.form.imageUrl;
      let attachmentUrl = this.form.attachmentUrl;
      let attachmentName = this.form.attachmentName;
      let attachmentType = this.form.attachmentType;

      if (this.selectedImageFile) {
        imageUrl = await this.announcementService.uploadAnnouncementImage(
          this.selectedImageFile
        );
      }

      if (this.selectedAttachmentFile) {
        attachmentUrl = await this.announcementService.uploadAnnouncementAttachment(
          this.selectedAttachmentFile
        );
        attachmentName = this.selectedAttachmentFile.name;
        attachmentType = this.selectedAttachmentFile.type;
      }

      const payload: Omit<Announcement, 'id'> = {
        title: this.form.title.trim(),
        content: this.form.content.trim(),
        category: this.form.category as AnnouncementCategory,
        visibility: this.form.visibility as AnnouncementVisibility,
        program:
          this.form.visibility === 'Specific Program'
            ? this.form.program
            : undefined,
        status: this.form.status,
        isPinned: this.form.isPinned,
        imageUrl: imageUrl || undefined,
        attachmentUrl: attachmentUrl || undefined,
        attachmentName: attachmentName || undefined,
        attachmentType: attachmentType || undefined,
        createdBy: this.selectedAnnouncement?.createdBy ?? undefined,
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
    } catch (error) {
      console.error('Failed to save:', error);
      this.formError =
        error instanceof Error
          ? error.message
          : 'Failed to save. Please try again.';
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  // ─── Pin / Unpin ──────────────────────────────────────────────────────────
  async togglePin(item: Announcement): Promise<void> {
    if (!item.id) return;
    try {
      await this.announcementService.updateAnnouncement(item.id, {
        isPinned: !item.isPinned,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  }

  // ─── Archive ──────────────────────────────────────────────────────────────
  async archive(item: Announcement): Promise<void> {
    if (!item.id) return;
    try {
      await this.announcementService.updateAnnouncement(item.id, {
        status: 'Archived',
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to archive:', error);
    }
  }

  // ─── Image upload ─────────────────────────────────────────────────────────
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.formError = 'Invalid image type. Please use JPG, PNG, or WEBP.';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    if (file.size > maxSize) {
      this.formError = 'Image too large. Maximum size is 5MB.';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    this.revokeImagePreview();
    this.selectedImageFile = file;
    this.imagePreviewUrl = URL.createObjectURL(file);
    this.form.imageUrl = '';
    input.value = '';
    this.cdr.detectChanges();
  }

  removeImage(): void {
    this.selectedImageFile = null;
    this.form.imageUrl = '';
    this.revokeImagePreview();
    this.cdr.detectChanges();
  }

  // ─── Attachment upload ────────────────────────────────────────────────────
  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];
    const maxSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.formError = 'Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG.';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    if (file.size > maxSize) {
      this.formError = 'Attachment too large. Maximum size is 10MB.';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    this.selectedAttachmentFile = file;
    this.form.attachmentName = file.name;
    this.form.attachmentType = file.type;
    input.value = '';
    this.cdr.detectChanges();
  }

  removeAttachment(): void {
    this.selectedAttachmentFile = null;
    this.form.attachmentUrl = '';
    this.form.attachmentName = '';
    this.form.attachmentType = '';
    this.cdr.detectChanges();
  }

  // ─── Validation ───────────────────────────────────────────────────────────
  private validateForm(): string {
    if (!this.form.title.trim()) return 'Announcement title is required.';
    if (!this.form.content.trim()) return 'Content is required.';
    if (!this.form.category) return 'Category is required.';
    if (!this.form.visibility) return 'Visibility is required.';
    if (this.form.visibility === 'Specific Program' && !this.form.program)
      return 'Please select a program for Specific Program visibility.';
    return '';
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
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

  get currentImageUrl(): string {
    if (this.imagePreviewUrl) return this.imagePreviewUrl;
    return this.form.imageUrl || '';
  }

  get currentAttachmentName(): string {
    if (this.selectedAttachmentFile) return this.selectedAttachmentFile.name;
    return this.form.attachmentName || '';
  }

  trackByAnnouncement(index: number, item: Announcement): string {
    return item.id ?? index.toString();
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
      imageUrl: '',
      attachmentUrl: '',
      attachmentName: '',
      attachmentType: '',
    };
  }

  private revokeImagePreview(): void {
    if (this.imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
    this.imagePreviewUrl = '';
  }
}