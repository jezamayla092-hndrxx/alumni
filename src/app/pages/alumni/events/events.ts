import { Component, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { EventRecord, EventStatus } from '../../../models/events.model';
import { EventsService } from '../../../services/events.service';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.html',
  styleUrls: ['./events.scss'],
})
export class AlumniEvents implements OnInit, OnDestroy {
  events: EventRecord[] = [];
  filteredEvents: EventRecord[] = [];

  interestCounts: Record<string, number> = {};
  myInterestedEventIds = new Set<string>();
  togglingInterestIds = new Set<string>();

  loading = false;
  loadError = '';
  interestError = '';

  searchTerm = '';
  statusFilter = 'all';
  typeFilter = 'all';

  showViewModal = false;
  selectedEvent: EventRecord | null = null;

  private eventsSub?: Subscription;
  private interestCountsSub?: Subscription;
  private myInterestsSub?: Subscription;

  constructor(
    private eventsService: EventsService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadEvents();
    this.loadInterestCounts();
    this.loadMyInterests();
  }

  ngOnDestroy(): void {
    this.eventsSub?.unsubscribe();
    this.interestCountsSub?.unsubscribe();
    this.myInterestsSub?.unsubscribe();
  }

  loadEvents(): void {
    this.zone.run(() => {
      this.loading = true;
      this.loadError = '';
      this.cdr.detectChanges();
    });

    this.eventsSub?.unsubscribe();

    this.eventsSub = this.eventsService.getEvents().subscribe({
      next: (records) => {
        this.zone.run(() => {
          this.events = (Array.isArray(records) ? records : [])
            .filter((event) => !this.eventIsArchived(event))
            .sort((a, b) => this.sortEvents(a, b));

          this.applyFilters(false);
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          console.error('Failed to load alumni events:', err);
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
    this.interestCountsSub?.unsubscribe();

    this.interestCountsSub = this.eventsService.getEventInterestCounts().subscribe({
      next: (counts) => {
        this.zone.run(() => {
          this.interestCounts = counts ?? {};
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Failed to load event interest counts:', err);
      },
    });
  }

  loadMyInterests(): void {
    this.myInterestsSub?.unsubscribe();

    this.myInterestsSub = this.eventsService.getMyInterestedEventIds().subscribe({
      next: (ids) => {
        this.zone.run(() => {
          this.myInterestedEventIds = ids ?? new Set<string>();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Failed to load my interested events:', err);
      },
    });
  }

  applyFilters(triggerDetectChanges = true): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredEvents = this.events
      .filter((event) => {
        const title = this.eventTitle(event).toLowerCase();
        const description = this.eventDescription(event).toLowerCase();
        const location = this.eventLocation(event).toLowerCase();
        const type = this.eventType(event).toLowerCase();
        const status = this.eventStatus(event).toLowerCase();

        const matchesSearch =
          !term ||
          title.includes(term) ||
          description.includes(term) ||
          location.includes(term) ||
          type.includes(term) ||
          status.includes(term);

        const matchesStatus =
          this.statusFilter === 'all' ||
          status === this.statusFilter.toLowerCase();

        const matchesType =
          this.typeFilter === 'all' ||
          type === this.typeFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => this.sortEvents(a, b));

    if (triggerDetectChanges) {
      this.cdr.detectChanges();
    }
  }

  openView(event: EventRecord): void {
    this.selectedEvent = event;
    this.showViewModal = true;
    this.interestError = '';
    this.cdr.detectChanges();
  }

  closeView(): void {
    this.showViewModal = false;
    this.selectedEvent = null;
    this.interestError = '';
    this.cdr.detectChanges();
  }

  async toggleInterest(event: EventRecord, clickEvent?: MouseEvent): Promise<void> {
    clickEvent?.stopPropagation();

    if (!event.id || !this.canToggleInterest(event) || this.isInterestLoading(event)) {
      return;
    }

    this.interestError = '';
    this.togglingInterestIds.add(event.id);
    this.cdr.detectChanges();

    try {
      await this.eventsService.toggleEventInterest(event);
    } catch (err) {
      console.error('Failed to toggle event interest:', err);
      this.interestError =
        err instanceof Error ? err.message : 'Failed to update your interest.';
    } finally {
      this.togglingInterestIds.delete(event.id);
      this.cdr.detectChanges();
    }
  }

  get totalCount(): number {
    return this.events.length;
  }

  get upcomingCount(): number {
    return this.events.filter((event) => this.eventStatus(event) === 'Upcoming').length;
  }

  get ongoingCount(): number {
    return this.events.filter((event) => this.eventStatus(event) === 'Ongoing').length;
  }

  get completedCount(): number {
    return this.events.filter((event) => this.eventStatus(event) === 'Completed').length;
  }

  get pinnedEvent(): EventRecord | null {
    return this.filteredEvents.find((event) => this.eventIsFeatured(event)) ?? null;
  }

  get allEvents(): EventRecord[] {
    return this.filteredEvents.filter((event) => !this.eventIsFeatured(event));
  }

  get eventTypes(): string[] {
    const types = this.events
      .map((event) => this.eventType(event))
      .filter((type) => type && type !== 'General');

    return Array.from(new Set(types));
  }

  trackByEvent(index: number, event: EventRecord): string {
    return event.id ?? index.toString();
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

  eventLocation(event: EventRecord): string {
    return (event as any).location || '';
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

  eventImageUrl(event: EventRecord): string {
    return ((event as any).imageUrl || '').trim();
  }

  eventIsFeatured(event: EventRecord): boolean {
    return !!(event as any).isFeatured;
  }

  eventIsArchived(event: EventRecord): boolean {
    return !!(event as any).isArchived;
  }

  eventStatus(event: EventRecord): EventStatus {
    const value = String((event as any).status || '').toLowerCase();

    if (value === 'ongoing') return 'Ongoing';
    if (value === 'completed') return 'Completed';
    if (value === 'cancelled') return 'Cancelled';

    return 'Upcoming';
  }

  interestCount(event: EventRecord): number {
    return event.id ? this.interestCounts[event.id] ?? 0 : 0;
  }

  isInterested(event: EventRecord): boolean {
    return !!event.id && this.myInterestedEventIds.has(event.id);
  }

  isInterestLoading(event: EventRecord): boolean {
    return !!event.id && this.togglingInterestIds.has(event.id);
  }

  canToggleInterest(event: EventRecord): boolean {
    const status = this.eventStatus(event);

    return status !== 'Completed' && status !== 'Cancelled' && !this.eventIsArchived(event);
  }

  interestButtonLabel(event: EventRecord): string {
    if (this.isInterestLoading(event)) return 'Updating...';

    return this.isInterested(event) ? 'Remove Interest' : 'Interested';
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

  private parsedDate(event: EventRecord): Date | null {
    const rawDate = this.eventDate(event);

    if (!rawDate) return null;

    const date = new Date(`${rawDate}T00:00:00`);

    return isNaN(date.getTime()) ? null : date;
  }

  private eventDateTime(event: EventRecord): number {
    const date = this.parsedDate(event);

    return date ? date.getTime() : 0;
  }

  private sortEvents(a: EventRecord, b: EventRecord): number {
    const featuredDiff = Number(this.eventIsFeatured(b)) - Number(this.eventIsFeatured(a));

    if (featuredDiff !== 0) return featuredDiff;

    return this.eventDateTime(a) - this.eventDateTime(b);
  }
}