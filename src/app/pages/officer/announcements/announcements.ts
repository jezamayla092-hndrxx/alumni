import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Announcement,
  AnnouncementStatus,
} from '../../../models/announcements.model';
import { AnnouncementService } from '../../../services/announcements.service';

interface AnnouncementForm {
  title: string;
  content: string;
  status: AnnouncementStatus;
}

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './announcements.html',
  styleUrls: ['./announcements.scss'],
})
export class Announcements implements OnInit {
  loading = false;
  saving = false;
  deleting = false;
  loadError = '';
  actionError = '';

  searchTerm = '';
  selectedStatus = 'All Status';
  statusOptions: string[] = ['All Status', 'Published', 'Draft'];

  announcements: Announcement[] = [];
  filteredAnnouncements: Announcement[] = [];

  showAnnouncementModal = false;
  showDeleteModal = false;
  isEditMode = false;

  selectedAnnouncement: Announcement | null = null;
  announcementToDelete: Announcement | null = null;

  form: AnnouncementForm = this.getEmptyForm();

  constructor(
    private announcementService: AnnouncementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAnnouncements();
  }

  loadAnnouncements(): void {
    this.loading = true;
    this.loadError = '';

    this.announcementService.getAnnouncements().subscribe({
      next: (records: Announcement[]) => {
        this.announcements = records ?? [];
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        console.error('Failed to load announcements:', error);
        this.loadError = 'Failed to load announcements.';
        this.announcements = [];
        this.filteredAnnouncements = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const status = this.selectedStatus;

    this.filteredAnnouncements = this.announcements.filter((item) => {
      const title = (item.title || '').toLowerCase();
      const content = (item.content || '').toLowerCase();

      const matchesSearch =
        !term || title.includes(term) || content.includes(term);

      const matchesStatus = status === 'All Status' || item.status === status;

      return matchesSearch && matchesStatus;
    });
  }

  openCreateModal(): void {
    this.actionError = '';
    this.isEditMode = false;
    this.selectedAnnouncement = null;
    this.form = this.getEmptyForm();
    this.showAnnouncementModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(item: Announcement): void {
    this.actionError = '';
    this.isEditMode = true;
    this.selectedAnnouncement = item;
    this.form = {
      title: item.title,
      content: item.content,
      status: item.status,
    };
    this.showAnnouncementModal = true;
    this.cdr.detectChanges();
  }

  closeAnnouncementModal(): void {
    this.resetAnnouncementModalState();
    this.cdr.detectChanges();
  }

  async saveAnnouncement(): Promise<void> {
    if (this.saving) return;

    const title = this.form.title.trim();
    const content = this.form.content.trim();

    if (!title || !content) return;

    this.saving = true;
    this.actionError = '';
    this.cdr.detectChanges();

    const now = new Date().toISOString();

    try {
      if (this.isEditMode && this.selectedAnnouncement?.id) {
        await this.announcementService.updateAnnouncement(
          this.selectedAnnouncement.id,
          {
            title,
            content,
            status: this.form.status,
            updatedAt: now,
          }
        );
      } else {
        await this.announcementService.addAnnouncement({
          title,
          content,
          status: this.form.status,
          datePosted: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      this.resetAnnouncementModalState();
      this.cdr.detectChanges();
    } catch (error: unknown) {
      console.error('Failed to save announcement:', error);
      this.actionError =
        error instanceof Error
          ? error.message
          : 'Failed to save announcement.';
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  openDeleteModal(item: Announcement): void {
    this.actionError = '';
    this.announcementToDelete = item;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.announcementToDelete = null;
    this.actionError = '';
    this.deleting = false;
    this.cdr.detectChanges();
  }

  async confirmDelete(): Promise<void> {
    if (!this.announcementToDelete?.id || this.deleting) return;

    this.deleting = true;
    this.actionError = '';
    this.cdr.detectChanges();

    try {
      await this.announcementService.deleteAnnouncement(
        this.announcementToDelete.id
      );

      this.showDeleteModal = false;
      this.announcementToDelete = null;
      this.deleting = false;
      this.cdr.detectChanges();
    } catch (error: unknown) {
      console.error('Failed to delete announcement:', error);
      this.actionError =
        error instanceof Error
          ? error.message
          : 'Failed to delete announcement.';
      this.deleting = false;
      this.cdr.detectChanges();
    }
  }

  getPreviewText(item: Announcement): string {
    const raw = item.content || '';
    return raw.length > 95 ? `${raw.slice(0, 95)}...` : raw;
  }

  getDisplayDate(item: Announcement): string {
    if (!item.datePosted) return 'No date';

    const date = new Date(item.datePosted);
    if (isNaN(date.getTime())) return 'No date';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  trackByAnnouncement(index: number, item: Announcement): string {
    return item.id || index.toString();
  }

  private getEmptyForm(): AnnouncementForm {
    return {
      title: '',
      content: '',
      status: 'Published',
    };
  }

  private resetAnnouncementModalState(): void {
    this.showAnnouncementModal = false;
    this.isEditMode = false;
    this.selectedAnnouncement = null;
    this.form = this.getEmptyForm();
    this.actionError = '';
    this.saving = false;
  }
}