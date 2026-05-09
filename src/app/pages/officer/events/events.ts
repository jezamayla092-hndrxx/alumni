import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EventRecord, EventStatus } from '../../../models/events.model';
import { EventsService } from '../../../services/events.service';

type EventForm = Partial<EventRecord> & {
  title?: string;
  description?: string;
  eventType?: string;
  status?: EventStatus;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  capacity?: number | null;
  registrationRequired?: boolean;
  imageUrl?: string;
  isFeatured?: boolean;
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

  loading = false;
  saving = false;
  deleting = false;

  searchTerm = '';
  statusFilter = 'all';
  typeFilter = 'all';

  showModal = false;
  showDeleteModal = false;

  selectedEvent: EventRecord | null = null;
  eventToDelete: EventRecord | null = null;

  form: EventForm = {};

  selectedImageFile: File | null = null;
  imagePreviewUrl = '';

  readonly statusOptions: EventStatus[] = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

  constructor(
    private eventsService: EventsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadEvents();
  }

  ngOnDestroy() {
    this.revokeImagePreview();
  }

  loadEvents() {
    this.loading = true;

    this.eventsService.getEvents().subscribe((res) => {
      this.events = res;
      this.applyFilters();
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredEvents = this.events.filter((e) => {
      const title = this.eventTitle(e).toLowerCase();
      const description = this.eventDescription(e).toLowerCase();
      const location = this.eventLocation(e).toLowerCase();
      const eventType = this.eventType(e).toLowerCase();
      const status = this.eventStatus(e).toLowerCase();

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
    });
  }

  get totalEvents(): number {
    return this.events.length;
  }

  get upcomingCount(): number {
    return this.events.filter((e) => this.eventStatus(e) === 'Upcoming').length;
  }

  get completedCount(): number {
    return this.events.filter((e) => this.eventStatus(e) === 'Completed').length;
  }

  get cancelledCount(): number {
    return this.events.filter((e) => this.eventStatus(e) === 'Cancelled').length;
  }

  get eventTypes(): string[] {
    const types = this.events
      .map((e) => this.eventType(e))
      .filter((type) => type && type !== 'General');

    return Array.from(new Set(types));
  }

  get pinnedEvent(): EventRecord | null {
    return this.filteredEvents.find((e) => this.eventIsFeatured(e)) || null;
  }

  get allEvents(): EventRecord[] {
    return this.filteredEvents.filter((e) => !this.eventIsFeatured(e));
  }

  openCreate() {
    this.selectedEvent = null;
    this.selectedImageFile = null;
    this.imagePreviewUrl = '';
    this.form = {
      title: '',
      description: '',
      eventType: '',
      status: 'Upcoming',
      eventDate: '',
      startTime: '',
      endTime: '',
      location: '',
      capacity: null,
      registrationRequired: false,
      imageUrl: '',
      isFeatured: false,
    };
    this.showModal = true;
  }

  openEdit(e: EventRecord) {
    this.selectedEvent = e;
    this.selectedImageFile = null;
    this.imagePreviewUrl = this.eventImageUrl(e);
    this.form = {
      ...e,
      title: this.eventTitle(e),
      description: this.eventDescription(e),
      eventType: this.eventType(e) === 'General' ? '' : this.eventType(e),
      status: this.eventStatus(e),
      eventDate: this.eventDate(e),
      startTime: this.eventStartTime(e),
      endTime: this.eventEndTime(e),
      location: this.eventLocation(e),
      capacity: this.eventCapacity(e),
      registrationRequired: this.eventRegistrationRequired(e),
      imageUrl: this.eventImageUrl(e),
      isFeatured: this.eventIsFeatured(e),
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.saving = false;
    this.selectedImageFile = null;

    if (this.imagePreviewUrl.startsWith('blob:')) {
      this.revokeImagePreview();
    }
  }

  async save() {
    if (this.saving) return;

    if (
      !this.form.title?.trim() ||
      !this.form.eventType?.trim() ||
      !this.form.status ||
      !this.form.eventDate?.trim() ||
      !this.form.startTime?.trim() ||
      !this.form.endTime?.trim() ||
      !this.form.location?.trim()
    ) {
      return;
    }

    this.saving = true;
    this.cdr.detectChanges();

    const now = new Date().toISOString();

    try {
      let imageUrl = this.form.imageUrl?.trim() || '';

      if (this.selectedImageFile) {
        imageUrl = await this.eventsService.uploadEventImage(this.selectedImageFile);
      }

      const payload = {
        ...this.form,
        title: this.form.title.trim(),
        description: this.form.description?.trim() || '',
        eventType: this.form.eventType.trim(),
        status: this.form.status,
        eventDate: this.form.eventDate,
        startTime: this.form.startTime,
        endTime: this.form.endTime,
        location: this.form.location.trim(),
        capacity: this.form.capacity ? Number(this.form.capacity) : null,
        registrationRequired: !!this.form.registrationRequired,
        imageUrl,
        isFeatured: !!this.form.isFeatured,
        updatedAt: now,
      };

      if (payload.isFeatured) {
        await this.unpinCurrentFeatured(this.selectedEvent?.id);
      }

      if (this.selectedEvent?.id) {
        await this.eventsService.updateEvent(this.selectedEvent.id, payload as Partial<EventRecord>);
      } else {
        await this.eventsService.addEvent({
          ...(payload as EventRecord),
          createdAt: now,
          updatedAt: now,
        });
      }

      this.closeModal();
    } catch (e) {
      console.error(e);
      this.saving = false;
    }
  }

  openDelete(e: EventRecord) {
    this.eventToDelete = e;
    this.showDeleteModal = true;
  }

  closeDelete() {
    this.showDeleteModal = false;
    this.deleting = false;
  }

  async confirmDelete() {
    if (!this.eventToDelete?.id) return;

    this.deleting = true;
    this.cdr.detectChanges();

    await this.eventsService.deleteEvent(this.eventToDelete.id);

    this.closeDelete();
  }

  async pinEvent(e: EventRecord) {
    if (!e.id) return;

    await this.unpinCurrentFeatured(e.id);
    await this.eventsService.updateEvent(e.id, {
      isFeatured: true,
      updatedAt: new Date().toISOString(),
    } as Partial<EventRecord>);
  }

  async unpinEvent(e: EventRecord) {
    if (!e.id) return;

    await this.eventsService.updateEvent(e.id, {
      isFeatured: false,
      updatedAt: new Date().toISOString(),
    } as Partial<EventRecord>);
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      input.value = '';
      return;
    }

    if (file.size > maxSize) {
      input.value = '';
      return;
    }

    this.revokeImagePreview();

    this.selectedImageFile = file;
    this.imagePreviewUrl = URL.createObjectURL(file);
    input.value = '';
  }

  removeImage() {
    this.selectedImageFile = null;
    this.form.imageUrl = '';
    this.revokeImagePreview();
  }

  private revokeImagePreview() {
    if (this.imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }

    this.imagePreviewUrl = '';
  }

  private async unpinCurrentFeatured(exceptId?: string) {
    const featured = this.events.filter((event) => this.eventIsFeatured(event) && event.id !== exceptId);

    for (const event of featured) {
      if (event.id) {
        await this.eventsService.updateEvent(event.id, {
          isFeatured: false,
          updatedAt: new Date().toISOString(),
        } as Partial<EventRecord>);
      }
    }
  }

  private normalizeStatus(status: unknown): EventStatus {
    const value = String(status || '').toLowerCase();

    if (value === 'upcoming') return 'Upcoming';
    if (value === 'ongoing') return 'Ongoing';
    if (value === 'completed') return 'Completed';
    if (value === 'cancelled') return 'Cancelled';

    return 'Upcoming';
  }

  eventTitle(e: EventRecord): string {
    return (e as any).title || '';
  }

  eventDescription(e: EventRecord): string {
    return (e as any).description || '';
  }

  eventType(e: EventRecord): string {
    return (e as any).eventType || (e as any).type || 'General';
  }

  eventStatus(e: EventRecord): EventStatus {
    return this.normalizeStatus((e as any).status);
  }

  eventDate(e: EventRecord): string {
    return (e as any).eventDate || '';
  }

  eventStartTime(e: EventRecord): string {
    return (e as any).startTime || '';
  }

  eventEndTime(e: EventRecord): string {
    return (e as any).endTime || '';
  }

  eventLocation(e: EventRecord): string {
    return (e as any).location || '';
  }

  eventCapacity(e: EventRecord): number | null {
    return (e as any).capacity ?? null;
  }

  eventRegistrationRequired(e: EventRecord): boolean {
    return !!(e as any).registrationRequired;
  }

  eventImageUrl(e: EventRecord): string {
    return (e as any).imageUrl || '';
  }

  eventIsFeatured(e: EventRecord): boolean {
    return !!(e as any).isFeatured;
  }

  eventMonth(e: EventRecord): string {
    const date = this.eventDate(e);
    if (!date) return '';

    const parsed = new Date(date + 'T00:00:00');
    if (Number.isNaN(parsed.getTime())) return '';

    return parsed.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  }

  eventDay(e: EventRecord): string {
    const date = this.eventDate(e);
    if (!date) return '';

    const parsed = new Date(date + 'T00:00:00');
    if (Number.isNaN(parsed.getTime())) return '';

    return String(parsed.getDate()).padStart(2, '0');
  }

  eventYear(e: EventRecord): string {
    const date = this.eventDate(e);
    if (!date) return '';

    const parsed = new Date(date + 'T00:00:00');
    if (Number.isNaN(parsed.getTime())) return '';

    return String(parsed.getFullYear());
  }

  formatDate(e: EventRecord): string {
    const date = this.eventDate(e);
    if (!date) return 'No date set';

    const parsed = new Date(date + 'T00:00:00');
    if (Number.isNaN(parsed.getTime())) return date;

    return parsed.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}