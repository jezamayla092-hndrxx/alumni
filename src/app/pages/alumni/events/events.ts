import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
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

  loading = false;
  searchTerm = '';
  statusFilter = 'all';
  typeFilter = 'all';

  showViewModal = false;
  selectedEvent: EventRecord | null = null;

  private eventsSub?: Subscription;

  constructor(
    private eventsService: EventsService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void { this.loadEvents(); }
  ngOnDestroy(): void { this.eventsSub?.unsubscribe(); }

  loadEvents(): void {
    this.zone.run(() => { this.loading = true; this.cdr.detectChanges(); });
    this.eventsSub?.unsubscribe();
    this.eventsSub = this.eventsService.getEvents().subscribe({
      next: (res) => {
        this.zone.run(() => {
          this.events = (Array.isArray(res) ? res : []).filter((e) => !this.eventIsArchived(e));
          this.applyFilters();
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          console.error(err);
          this.events = [];
          this.filteredEvents = [];
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredEvents = this.events.filter((e) => {
      const matchesSearch = !term ||
        this.eventTitle(e).toLowerCase().includes(term) ||
        this.eventDescription(e).toLowerCase().includes(term) ||
        this.eventLocation(e).toLowerCase().includes(term) ||
        this.eventType(e).toLowerCase().includes(term);
      const matchesStatus = this.statusFilter === 'all' || this.eventStatus(e).toLowerCase() === this.statusFilter.toLowerCase();
      const matchesType   = this.typeFilter === 'all'   || this.eventType(e).toLowerCase() === this.typeFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesType;
    });
  }

  openView(event: EventRecord): void { this.selectedEvent = event; this.showViewModal = true; this.cdr.detectChanges(); }
  closeView(): void { this.showViewModal = false; this.selectedEvent = null; this.cdr.detectChanges(); }

  get totalCount(): number    { return this.events.length; }
  get upcomingCount(): number { return this.events.filter((e) => this.eventStatus(e) === 'Upcoming').length; }
  get ongoingCount(): number  { return this.events.filter((e) => this.eventStatus(e) === 'Ongoing').length; }
  get completedCount(): number{ return this.events.filter((e) => this.eventStatus(e) === 'Completed').length; }

  get pinnedEvent(): EventRecord | null { return this.filteredEvents.find((e) => this.eventIsFeatured(e)) ?? null; }
  get allEvents(): EventRecord[]        { return this.filteredEvents.filter((e) => !this.eventIsFeatured(e)); }
  get eventTypes(): string[] {
    return Array.from(new Set(this.events.map((e) => this.eventType(e)).filter((t) => t !== 'General')));
  }

  eventTitle(e: EventRecord): string       { return (e as any).title || ''; }
  eventDescription(e: EventRecord): string { return (e as any).description || ''; }
  eventType(e: EventRecord): string        { return (e as any).eventType || (e as any).type || 'General'; }
  eventLocation(e: EventRecord): string    { return (e as any).location || ''; }
  eventDate(e: EventRecord): string        { return (e as any).eventDate || ''; }
  eventStartTime(e: EventRecord): string   { return (e as any).startTime || ''; }
  eventEndTime(e: EventRecord): string     { return (e as any).endTime || ''; }
  eventIsFeatured(e: EventRecord): boolean { return !!(e as any).isFeatured; }
  eventIsArchived(e: EventRecord): boolean { return !!(e as any).isArchived; }

  eventStatus(e: EventRecord): EventStatus {
    const v = String((e as any).status || '').toLowerCase();
    if (v === 'ongoing')   return 'Ongoing';
    if (v === 'completed') return 'Completed';
    if (v === 'cancelled') return 'Cancelled';
    return 'Upcoming';
  }

  eventMonth(e: EventRecord): string  { const d = this.parsedDate(e); return d ? d.toLocaleString('en-US', { month: 'short' }).toUpperCase() : ''; }
  eventDay(e: EventRecord): string    { const d = this.parsedDate(e); return d ? String(d.getDate()).padStart(2, '0') : ''; }
  eventYear(e: EventRecord): string   { const d = this.parsedDate(e); return d ? String(d.getFullYear()) : ''; }

  formatDate(e: EventRecord): string {
    const d = this.parsedDate(e);
    if (!d) return 'No date set';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  private parsedDate(e: EventRecord): Date | null {
    const raw = this.eventDate(e);
    if (!raw) return null;
    const d = new Date(raw + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }
}