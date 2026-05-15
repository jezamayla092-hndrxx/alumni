import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

import { EventRecord, EventStatus } from '../../../models/events.model';
import { EventsService } from '../../../services/events.service';

const CLOUDINARY_CLOUD_NAME = 'dr10qcgym';
const CLOUDINARY_UPLOAD_PRESET = 'atms_unsigned_upload';
const CLOUDINARY_FOLDER = 'atms-event-images';

interface EventInterest {
  id?: string;

  eventId: string;
  userId: string;

  fullName: string;
  email: string;

  program?: string;
  yearGraduated?: string;
  studentId?: string;
  contactNumber?: string;

  createdAt: string;
}

type EventForm = {
  title: string;
  description: string;
  eventType: string;
  status: EventStatus;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  isFeatured: boolean;
  isArchived: boolean;
  imageUrl: string;
};

type EventInterestServiceApi = EventsService & {
  getEventInterestCounts?: () => Observable<Record<string, number>>;
  getInterestsForEvent?: (eventId: string) => Observable<EventInterest[]>;
};

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.html',
  styleUrls: ['./events.scss'],
})
export class Events implements OnInit, OnDestroy {
  events: EventRecord[] = [];
  filteredEvents: EventRecord[] = [];

  interestCounts: Record<string, number> = {};
  selectedEventInterests: EventInterest[] = [];

  loading = false;
  saving = false;
  deleting = false;
  cancelling = false;
  archiving = false;
  restoring = false;
  loadingInterests = false;

  loadError = '';
  formError = '';
  interestsError = '';

  searchTerm = '';
  statusFilter = 'all';
  typeFilter = 'all';

  showModal = false;
  showDeleteModal = false;
  showArchive = false;
  showInterestsModal = false;

  selectedEvent: EventRecord | null = null;
  selectedInterestEvent: EventRecord | null = null;
  eventToDelete: EventRecord | null = null;

  form: EventForm = this.getEmptyForm();

  selectedImageFile: File | null = null;
  imagePreviewUrl = '';
  imageUploading = false;
  imageUploadProgress = 0;

  private eventsSubscription?: Subscription;
  private interestCountsSubscription?: Subscription;
  private interestsListSubscription?: Subscription;

  readonly statusOptions: EventStatus[] = [
    'Upcoming',
    'Ongoing',
    'Completed',
    'Cancelled',
  ];

  constructor(
    private eventsService: EventsService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadEvents();
    this.loadInterestCounts();
  }

  ngOnDestroy(): void {
    this.eventsSubscription?.unsubscribe();
    this.interestCountsSubscription?.unsubscribe();
    this.interestsListSubscription?.unsubscribe();

    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
  }

  loadEvents(): void {
    this.zone.run(() => {
      this.loading = true;
      this.loadError = '';
      this.cdr.detectChanges();
    });

    this.eventsSubscription?.unsubscribe();

    this.eventsSubscription = this.eventsService.getEvents().subscribe({
      next: (records) => {
        this.zone.run(() => {
          this.events = Array.isArray(records) ? records : [];
          this.applyFilters(false);
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.zone.run(() => {
          console.error('Failed to load events:', error);
          this.events = [];
          this.filteredEvents = [];
          this.loadError = 'Failed to load events.';
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  loadInterestCounts(): void {
    const api = this.eventsService as EventInterestServiceApi;

    if (typeof api.getEventInterestCounts !== 'function') {
      this.interestCounts = {};
      return;
    }

    this.interestCountsSubscription?.unsubscribe();

    this.interestCountsSubscription = api.getEventInterestCounts().subscribe({
      next: (counts) => {
        this.zone.run(() => {
          this.interestCounts = counts ?? {};
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Failed to load event interest counts:', error);
        this.zone.run(() => {
          this.interestCounts = {};
          this.cdr.detectChanges();
        });
      },
    });
  }

  applyFilters(triggerDetectChanges = true): void {
    const term = this.searchTerm.trim().toLowerCase();

    const baseEvents = this.events.filter((event) =>
      this.showArchive ? this.eventIsArchived(event) : !this.eventIsArchived(event)
    );

    this.filteredEvents = baseEvents
      .filter((event) => {
        const title = this.eventTitle(event).toLowerCase();
        const description = this.eventDescription(event).toLowerCase();
        const location = this.eventLocation(event).toLowerCase();
        const eventType = this.eventType(event).toLowerCase();
        const status = this.eventStatus(event).toLowerCase();

        const matchesSearch =
          !term ||
          title.includes(term) ||
          description.includes(term) ||
          location.includes(term) ||
          eventType.includes(term) ||
          status.includes(term);

        const matchesStatus =
          this.statusFilter === 'all' ||
          status === this.statusFilter.toLowerCase();

        const matchesType =
          this.typeFilter === 'all' ||
          eventType === this.typeFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => this.sortEvents(a, b));

    if (triggerDetectChanges) {
      this.cdr.detectChanges();
    }
  }

  toggleArchive(): void {
    this.zone.run(() => {
      this.showArchive = !this.showArchive;
      this.searchTerm = '';
      this.statusFilter = 'all';
      this.typeFilter = 'all';
      this.showModal = false;
      this.showDeleteModal = false;
      this.showInterestsModal = false;
      this.selectedEvent = null;
      this.selectedInterestEvent = null;
      this.eventToDelete = null;
      this.applyFilters(false);
      this.cdr.detectChanges();
    });
  }

  openCreate(): void {
    this.zone.run(() => {
      this.showArchive = false;
      this.selectedEvent = null;
      this.form = this.getEmptyForm();
      this.formError = '';
      this.resetImageState();
      this.showDeleteModal = false;
      this.showInterestsModal = false;
      this.showModal = true;
      this.applyFilters(false);
      this.cdr.detectChanges();
    });
  }

  openEdit(event: EventRecord): void {
    this.zone.run(() => {
      this.selectedEvent = event;
      this.form = {
        title: this.eventTitle(event),
        description: this.eventDescription(event),
        eventType: this.eventType(event) === 'General' ? '' : this.eventType(event),
        status: this.eventStatus(event),
        eventDate: this.eventDate(event),
        startTime: this.eventStartTime(event),
        endTime: this.eventEndTime(event),
        location: this.eventLocation(event),
        isFeatured: this.eventIsFeatured(event),
        isArchived: this.eventIsArchived(event),
        imageUrl: this.eventImageUrl(event),
      };

      this.formError = '';
      this.resetImageState();
      this.showDeleteModal = false;
      this.showInterestsModal = false;
      this.showModal = true;
      this.cdr.detectChanges();
    });
  }

  closeModal(): void {
    this.zone.run(() => {
      this.showModal = false;
      this.saving = false;
      this.formError = '';
      this.selectedEvent = null;
      this.form = this.getEmptyForm();
      this.resetImageState();
      this.cdr.detectChanges();
    });
  }

  async save(): Promise<void> {
    if (this.saving) return;

    this.formError = this.validateForm();

    if (this.formError) {
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.cdr.detectChanges();

    try {
      let imageUrl = this.form.imageUrl || '';

      if (this.selectedImageFile) {
        this.imageUploading = true;
        this.imageUploadProgress = 0;
        this.cdr.detectChanges();

        try {
          imageUrl = await this.uploadImageToCloudinary(this.selectedImageFile);
        } finally {
          this.imageUploading = false;
          this.cdr.detectChanges();
        }
      }

      const now = new Date().toISOString();

      const payload: Partial<EventRecord> = {
        title: this.form.title.trim(),
        description: this.form.description.trim(),
        eventType: this.form.eventType.trim(),
        status: this.form.status,
        eventDate: this.form.eventDate,
        startTime: this.form.startTime,
        endTime: this.form.endTime,
        location: this.form.location.trim(),
        isFeatured: !!this.form.isFeatured,
        isArchived: !!this.form.isArchived,
        imageUrl,
        updatedAt: now,
      };

      if (payload.isFeatured) {
        await this.unpinCurrentFeatured(this.selectedEvent?.id);
      }

      if (this.selectedEvent?.id) {
        await this.eventsService.updateEvent(this.selectedEvent.id, payload);
      } else {
        await this.eventsService.addEvent({
          title: payload.title || '',
          description: payload.description || '',
          eventType: payload.eventType || '',
          status: payload.status || 'Upcoming',
          eventDate: payload.eventDate || '',
          startTime: payload.startTime || '',
          endTime: payload.endTime || '',
          location: payload.location || '',
          imageUrl: payload.imageUrl || '',
          isFeatured: payload.isFeatured ?? false,
          isArchived: payload.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
        });
      }

      this.closeModal();
    } catch (error) {
      console.error('Failed to save event:', error);
      this.zone.run(() => {
        this.formError =
          error instanceof Error ? error.message : 'Failed to save event.';
        this.saving = false;
        this.cdr.detectChanges();
      });
    }
  }

  async pinEvent(event: EventRecord): Promise<void> {
    if (!event.id || this.eventStatus(event) === 'Cancelled' || this.eventIsArchived(event)) {
      return;
    }

    try {
      await this.unpinCurrentFeatured(event.id);
      await this.eventsService.updateEvent(event.id, {
        isFeatured: true,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to pin event:', error);
    }
  }

  async unpinEvent(event: EventRecord): Promise<void> {
    if (!event.id) return;

    try {
      await this.eventsService.updateEvent(event.id, {
        isFeatured: false,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to unpin event:', error);
    }
  }

  async cancelEvent(event: EventRecord): Promise<void> {
    if (!event.id || this.eventStatus(event) === 'Cancelled' || this.cancelling) return;

    this.cancelling = true;
    this.cdr.detectChanges();

    try {
      await this.eventsService.updateEvent(event.id, {
        status: 'Cancelled',
        isFeatured: false,
        isArchived: false,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to cancel event:', error);
    } finally {
      this.zone.run(() => {
        this.cancelling = false;
        this.cdr.detectChanges();
      });
    }
  }

  async archiveEvent(event: EventRecord): Promise<void> {
    if (!event.id || this.archiving) return;

    this.archiving = true;
    this.cdr.detectChanges();

    try {
      await this.eventsService.updateEvent(event.id, {
        isArchived: true,
        isFeatured: false,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to archive event:', error);
    } finally {
      this.zone.run(() => {
        this.archiving = false;
        this.cdr.detectChanges();
      });
    }
  }

  async restoreEvent(event: EventRecord): Promise<void> {
    if (!event.id || this.restoring) return;

    this.restoring = true;
    this.cdr.detectChanges();

    try {
      await this.eventsService.updateEvent(event.id, {
        status: 'Upcoming',
        isArchived: false,
        isFeatured: false,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to restore event:', error);
    } finally {
      this.zone.run(() => {
        this.restoring = false;
        this.cdr.detectChanges();
      });
    }
  }

  openDelete(event: EventRecord): void {
    this.zone.run(() => {
      this.eventToDelete = event;
      this.showModal = false;
      this.showInterestsModal = false;
      this.showDeleteModal = true;
      this.cdr.detectChanges();
    });
  }

  closeDelete(): void {
    this.zone.run(() => {
      this.showDeleteModal = false;
      this.deleting = false;
      this.eventToDelete = null;
      this.cdr.detectChanges();
    });
  }

  async confirmDelete(): Promise<void> {
    if (!this.eventToDelete?.id || this.deleting) return;

    this.deleting = true;
    this.cdr.detectChanges();

    try {
      await this.eventsService.deleteEvent(this.eventToDelete.id);
      this.closeDelete();
    } catch (error) {
      console.error('Failed to delete event:', error);
      this.zone.run(() => {
        this.deleting = false;
        this.cdr.detectChanges();
      });
    }
  }

  openInterests(event: EventRecord): void {
    if (!event.id) return;

    const api = this.eventsService as EventInterestServiceApi;

    this.zone.run(() => {
      this.selectedInterestEvent = event;
      this.selectedEventInterests = [];
      this.interestsError = '';
      this.loadingInterests = true;
      this.showModal = false;
      this.showDeleteModal = false;
      this.showInterestsModal = true;
      this.cdr.detectChanges();
    });

    this.interestsListSubscription?.unsubscribe();

    if (typeof api.getInterestsForEvent !== 'function') {
      this.zone.run(() => {
        this.selectedEventInterests = [];
        this.interestsError = 'Interested alumni service is not connected yet.';
        this.loadingInterests = false;
        this.cdr.detectChanges();
      });
      return;
    }

    this.interestsListSubscription = api.getInterestsForEvent(event.id).subscribe({
      next: (interests) => {
        this.zone.run(() => {
          this.selectedEventInterests = Array.isArray(interests) ? interests : [];
          this.loadingInterests = false;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Failed to load interested alumni:', error);
        this.zone.run(() => {
          this.selectedEventInterests = [];
          this.interestsError = 'Failed to load interested alumni.';
          this.loadingInterests = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  closeInterests(): void {
    this.zone.run(() => {
      this.showInterestsModal = false;
      this.loadingInterests = false;
      this.interestsError = '';
      this.selectedInterestEvent = null;
      this.selectedEventInterests = [];
      this.interestsListSubscription?.unsubscribe();
      this.cdr.detectChanges();
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    input.value = '';

    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      this.formError = 'Please upload a JPG, PNG, or WEBP image.';
      this.cdr.detectChanges();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.formError = 'Image must be under 5 MB.';
      this.cdr.detectChanges();
      return;
    }

    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }

    this.selectedImageFile = file;
    this.imagePreviewUrl = URL.createObjectURL(file);
    this.form.imageUrl = '';
    this.formError = '';
    this.cdr.detectChanges();
  }

  removeImage(): void {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }

    this.selectedImageFile = null;
    this.imagePreviewUrl = '';
    this.form.imageUrl = '';
    this.cdr.detectChanges();
  }

  get currentImageDisplay(): string {
    return this.imagePreviewUrl || this.form.imageUrl || '';
  }

  get activeEvents(): EventRecord[] {
    return this.events.filter((event) => !this.eventIsArchived(event));
  }

  get archivedEvents(): EventRecord[] {
    return this.events.filter((event) => this.eventIsArchived(event));
  }

  get archivedCount(): number {
    return this.archivedEvents.length;
  }

  get totalEvents(): number {
    return this.activeEvents.length;
  }

  get upcomingCount(): number {
    return this.activeEvents.filter((event) => this.eventStatus(event) === 'Upcoming').length;
  }

  get completedCount(): number {
    return this.activeEvents.filter((event) => this.eventStatus(event) === 'Completed').length;
  }

  get cancelledCount(): number {
    return this.activeEvents.filter((event) => this.eventStatus(event) === 'Cancelled').length;
  }

  get eventTypes(): string[] {
    const types = this.events
      .map((event) => this.eventType(event))
      .filter((type) => type && type !== 'General');

    return Array.from(new Set(types));
  }

  get pinnedEvent(): EventRecord | null {
    if (this.showArchive) return null;

    return (
      this.filteredEvents.find(
        (event) => this.eventIsFeatured(event) && !this.eventIsArchived(event)
      ) || null
    );
  }

  get allEvents(): EventRecord[] {
    if (this.showArchive) return this.filteredEvents;

    return this.filteredEvents.filter((event) => !this.eventIsFeatured(event));
  }

  trackByEvent(index: number, event: EventRecord): string {
    return event.id ?? index.toString();
  }

  trackByInterest(index: number, interest: EventInterest): string {
    return interest.id ?? `${interest.eventId}_${interest.userId}_${index}`;
  }

  interestCount(event: EventRecord): number {
    return event.id ? this.interestCounts[event.id] ?? 0 : 0;
  }

  formatInterestDate(value: any): string {
    if (!value) return '—';

    const resolved =
      typeof value === 'string'
        ? value
        : value?.toDate?.() ?? value;

    const date = new Date(resolved);

    if (isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  eventTitle(event: EventRecord): string {
    return (event as any).title || '';
  }

  eventDescription(event: EventRecord): string {
    return (event as any).description || '';
  }

  eventType(event: EventRecord): string {
    return (event as any).eventType || (event as any).type || 'General';
  }

  eventStatus(event: EventRecord): EventStatus {
    return this.normalizeStatus((event as any).status);
  }

  eventDate(event: EventRecord): string {
    return (event as any).eventDate || '';
  }

  eventStartTime(event: EventRecord): string {
    return (event as any).startTime || '';
  }

  eventEndTime(event: EventRecord): string {
    return (event as any).endTime || '';
  }

  eventLocation(event: EventRecord): string {
    return (event as any).location || '';
  }

  eventImageUrl(event: EventRecord): string {
    return ((event as any).imageUrl || '').trim();
  }

  eventIsFeatured(event: EventRecord): boolean {
    return !!(event as any).isFeatured;
  }

  eventIsArchived(event: EventRecord): boolean {
    return !!(event as any).isArchived;
  }

  eventMonth(event: EventRecord): string {
    const date = this.parsedDate(event);

    return date
      ? date.toLocaleString('en-US', { month: 'short' }).toUpperCase()
      : '';
  }

  eventDay(event: EventRecord): string {
    const date = this.parsedDate(event);

    return date ? String(date.getDate()).padStart(2, '0') : '';
  }

  eventYear(event: EventRecord): string {
    const date = this.parsedDate(event);

    return date ? String(date.getFullYear()) : '';
  }

  formatDate(event: EventRecord): string {
    const date = this.parsedDate(event);

    if (!date) return 'No date set';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private async unpinCurrentFeatured(exceptId?: string): Promise<void> {
    const featured = this.events.filter(
      (event) => this.eventIsFeatured(event) && event.id !== exceptId
    );

    for (const event of featured) {
      if (event.id) {
        await this.eventsService.updateEvent(event.id, {
          isFeatured: false,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  private validateForm(): string {
    if (!this.form.title.trim()) return 'Event title is required.';
    if (!this.form.eventType.trim()) return 'Event type is required.';
    if (!this.form.status) return 'Status is required.';
    if (!this.form.eventDate.trim()) return 'Event date is required.';
    if (!this.form.startTime.trim()) return 'Start time is required.';
    if (!this.form.endTime.trim()) return 'End time is required.';
    if (!this.form.location.trim()) return 'Location is required.';

    return '';
  }

  private getEmptyForm(): EventForm {
    return {
      title: '',
      description: '',
      eventType: '',
      status: 'Upcoming',
      eventDate: '',
      startTime: '',
      endTime: '',
      location: '',
      isFeatured: false,
      isArchived: false,
      imageUrl: '',
    };
  }

  private uploadImageToCloudinary(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', CLOUDINARY_FOLDER);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          this.imageUploadProgress = Math.round((event.loaded / event.total) * 100);
          this.cdr.detectChanges();
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);

            if (!response.secure_url) {
              reject(new Error('Cloudinary did not return an image URL.'));
              return;
            }

            resolve(response.secure_url as string);
          } catch {
            reject(new Error('Invalid response from Cloudinary.'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error?.error?.message || `Upload failed (${xhr.status}).`));
          } catch {
            reject(new Error(`Upload failed (${xhr.status}).`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during image upload.'));
      });

      xhr.open(
        'POST',
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
      );

      xhr.send(formData);
    });
  }

  private resetImageState(): void {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }

    this.selectedImageFile = null;
    this.imagePreviewUrl = '';
    this.imageUploading = false;
    this.imageUploadProgress = 0;
  }

  private normalizeStatus(status: unknown): EventStatus {
    const value = String(status || '').toLowerCase();

    if (value === 'upcoming') return 'Upcoming';
    if (value === 'ongoing') return 'Ongoing';
    if (value === 'completed') return 'Completed';
    if (value === 'cancelled') return 'Cancelled';

    return 'Upcoming';
  }

  private parsedDate(event: EventRecord): Date | null {
    const raw = this.eventDate(event);

    if (!raw) return null;

    const date = new Date(`${raw}T00:00:00`);

    return isNaN(date.getTime()) ? null : date;
  }

  private eventDateTime(event: EventRecord): number {
    const date = this.parsedDate(event);

    return date ? date.getTime() : 0;
  }

  private sortEvents(a: EventRecord, b: EventRecord): number {
    const featuredDiff =
      Number(this.eventIsFeatured(b)) - Number(this.eventIsFeatured(a));

    if (!this.showArchive && featuredDiff !== 0) return featuredDiff;

    return this.eventDateTime(a) - this.eventDateTime(b);
  }
}