import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

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
  isFeatured?: boolean;
  isArchived?: boolean;
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
  cancelling = false;
  archiving = false;
  restoring = false;

  searchTerm = '';
  statusFilter = 'all';
  typeFilter = 'all';

  showModal = false;
  showDeleteModal = false;
  showArchive = false;

  selectedEvent: EventRecord | null = null;
  eventToDelete: EventRecord | null = null;

  form: EventForm = {};

  private eventsSubscription?: Subscription;

  readonly statusOptions: EventStatus[] = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

  constructor(
    private eventsService: EventsService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.eventsSubscription?.unsubscribe();
  }

  loadEvents(): void {
    this.zone.run(() => {
      this.loading = true;
      this.cdr.detectChanges();
    });

    this.eventsSubscription?.unsubscribe();

    this.eventsSubscription = this.eventsService.getEvents().subscribe({
      next: (res) => {
        this.zone.run(() => {
          this.events = Array.isArray(res) ? res : [];
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
          this.loading = false;
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

    this.filteredEvents = baseEvents.filter((e) => {
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

    if (triggerDetectChanges) {
      this.cdr.detectChanges();
    }
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
    return this.activeEvents.filter((e) => this.eventStatus(e) === 'Upcoming').length;
  }

  get completedCount(): number {
    return this.activeEvents.filter((e) => this.eventStatus(e) === 'Completed').length;
  }

  get cancelledCount(): number {
    return this.activeEvents.filter((e) => this.eventStatus(e) === 'Cancelled').length;
  }

  get eventTypes(): string[] {
    const types = this.events
      .map((e) => this.eventType(e))
      .filter((type) => type && type !== 'General');

    return Array.from(new Set(types));
  }

  get pinnedEvent(): EventRecord | null {
    if (this.showArchive) {
      return null;
    }

    return this.filteredEvents.find((e) => this.eventIsFeatured(e) && !this.eventIsArchived(e)) || null;
  }

  get allEvents(): EventRecord[] {
    if (this.showArchive) {
      return this.filteredEvents;
    }

    return this.filteredEvents.filter((e) => !this.eventIsFeatured(e));
  }

  toggleArchive(): void {
    this.zone.run(() => {
      this.showArchive = !this.showArchive;
      this.showModal = false;
      this.showDeleteModal = false;
      this.selectedEvent = null;
      this.eventToDelete = null;
      this.applyFilters(false);
      this.cdr.detectChanges();
    });
  }

  openCreate(): void {
    this.zone.run(() => {
      this.showArchive = false;
      this.selectedEvent = null;
      this.form = {
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
      };
      this.showDeleteModal = false;
      this.showModal = true;
      this.applyFilters(false);
      this.cdr.detectChanges();
    });
  }

  openEdit(e: EventRecord): void {
    this.zone.run(() => {
      this.selectedEvent = e;
      this.form = {
        title: this.eventTitle(e),
        description: this.eventDescription(e),
        eventType: this.eventType(e) === 'General' ? '' : this.eventType(e),
        status: this.eventStatus(e),
        eventDate: this.eventDate(e),
        startTime: this.eventStartTime(e),
        endTime: this.eventEndTime(e),
        location: this.eventLocation(e),
        isFeatured: this.eventIsFeatured(e),
        isArchived: this.eventIsArchived(e),
      };
      this.showDeleteModal = false;
      this.showModal = true;
      this.cdr.detectChanges();
    });
  }

  closeModal(): void {
    this.zone.run(() => {
      this.showModal = false;
      this.saving = false;
      this.cdr.detectChanges();
    });
  }

  async save(): Promise<void> {
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
      const payload: Partial<EventRecord> = {
        title: this.form.title.trim(),
        description: this.form.description?.trim() || '',
        eventType: this.form.eventType.trim(),
        status: this.form.status,
        eventDate: this.form.eventDate,
        startTime: this.form.startTime,
        endTime: this.form.endTime,
        location: this.form.location.trim(),
        isFeatured: !!this.form.isFeatured,
        isArchived: !!this.form.isArchived,
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
          isFeatured: payload.isFeatured ?? false,
          isArchived: payload.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
        });
      }

      this.closeModal();
    } catch (e) {
      console.error('Failed to save event:', e);

      this.zone.run(() => {
        this.saving = false;
        this.cdr.detectChanges();
      });
    }
  }

  async pinEvent(e: EventRecord): Promise<void> {
    if (!e.id || this.eventStatus(e) === 'Cancelled' || this.eventIsArchived(e)) return;

    try {
      await this.unpinCurrentFeatured(e.id);
      await this.eventsService.updateEvent(e.id, {
        isFeatured: true,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to pin event:', error);
    }
  }

  async unpinEvent(e: EventRecord): Promise<void> {
    if (!e.id) return;

    try {
      await this.eventsService.updateEvent(e.id, {
        isFeatured: false,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to unpin event:', error);
    }
  }

  async cancelEvent(e: EventRecord): Promise<void> {
    if (!e.id || this.eventStatus(e) === 'Cancelled' || this.cancelling) return;

    this.cancelling = true;
    this.cdr.detectChanges();

    try {
      await this.eventsService.updateEvent(e.id, {
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

  async archiveEvent(e: EventRecord): Promise<void> {
    if (!e.id || this.archiving) return;

    this.archiving = true;
    this.cdr.detectChanges();

    try {
      await this.eventsService.updateEvent(e.id, {
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

  async restoreEvent(e: EventRecord): Promise<void> {
    if (!e.id || this.restoring) return;

    this.restoring = true;
    this.cdr.detectChanges();

    try {
      await this.eventsService.updateEvent(e.id, {
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

  openDelete(e: EventRecord): void {
    this.zone.run(() => {
      this.eventToDelete = e;
      this.showModal = false;
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

  eventIsFeatured(e: EventRecord): boolean {
    return !!(e as any).isFeatured;
  }

  eventIsArchived(e: EventRecord): boolean {
    return !!(e as any).isArchived;
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