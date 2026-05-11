import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  Announcement,
  ANNOUNCEMENT_CATEGORIES,
} from '../../../models/announcements.model';
import { AnnouncementService } from '../../../services/announcements.service';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './announcements.html',
  styleUrls: ['./announcements.scss'],
})
export class AlumniAnnouncements implements OnInit, OnDestroy {
  announcements: Announcement[] = [];
  filteredAnnouncements: Announcement[] = [];

  loading = false;
  loadError = '';
  searchTerm = '';
  filterCategory = '';

  showViewModal = false;
  selectedAnnouncement: Announcement | null = null;

  readonly categories = ANNOUNCEMENT_CATEGORIES;

  private sub?: Subscription;

  constructor(
    private announcementService: AnnouncementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  load(): void {
    this.loading = true;
    this.loadError = '';

    this.sub?.unsubscribe();

    this.sub = this.announcementService.getAnnouncements().subscribe({
      next: (records: Announcement[]) => {
        const allRecords = records ?? [];

        console.log('Alumni announcements fetched:', allRecords);

        this.announcements = allRecords.filter((announcement) => {
          return announcement.status === 'Published';
        });

        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        console.error('Failed to load alumni announcements:', err);
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

    this.filteredAnnouncements = this.announcements.filter((announcement) => {
      const title = announcement.title?.toLowerCase() ?? '';
      const content = announcement.content?.toLowerCase() ?? '';
      const category = announcement.category?.toLowerCase() ?? '';

      const matchesSearch =
        !term ||
        title.includes(term) ||
        content.includes(term) ||
        category.includes(term);

      const matchesCategory =
        !this.filterCategory || announcement.category === this.filterCategory;

      return matchesSearch && matchesCategory;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterCategory = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterCategory);
  }

  get totalCount(): number {
    return this.announcements.length;
  }

  get pinnedCount(): number {
    return this.announcements.filter((announcement) => announcement.isPinned).length;
  }

  get pinnedAnnouncements(): Announcement[] {
    return this.filteredAnnouncements.filter((announcement) => announcement.isPinned);
  }

  get regularAnnouncements(): Announcement[] {
    return this.filteredAnnouncements.filter((announcement) => !announcement.isPinned);
  }

  openView(announcement: Announcement): void {
    this.selectedAnnouncement = announcement;
    this.showViewModal = true;
    this.cdr.detectChanges();
  }

  closeView(): void {
    this.showViewModal = false;
    this.selectedAnnouncement = null;
    this.cdr.detectChanges();
  }

  getPreview(announcement: Announcement): string {
    const content = announcement.content ?? '';
    return content.length > 120 ? `${content.slice(0, 120)}...` : content;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';

    const date = new Date(dateStr);

    if (isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  trackByAnnouncement(index: number, announcement: Announcement): string {
    return announcement.id ?? index.toString();
  }
}