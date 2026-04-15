import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EventRecord } from '../../../models/events.model';
import { EventsService } from '../../../services/events.service';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.html',
  styleUrls: ['./events.scss'],
})
export class Events implements OnInit {
  events: EventRecord[] = [];
  filteredEvents: EventRecord[] = [];

  loading = false;
  saving = false;
  deleting = false;

  searchTerm = '';

  showModal = false;
  showDeleteModal = false;

  selectedEvent: EventRecord | null = null;
  eventToDelete: EventRecord | null = null;

  form: Partial<EventRecord> = {};

  constructor(
    private eventsService: EventsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadEvents();
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
    const term = this.searchTerm.toLowerCase();

    this.filteredEvents = this.events.filter(
      (e) =>
        e.title.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term)
    );
  }

  get featuredEvent() {
    return this.filteredEvents.find((e) => e.isFeatured);
  }

  get upcomingEvents() {
    return this.filteredEvents.filter((e) => !e.isFeatured);
  }

  openCreate() {
    this.selectedEvent = null;
    this.form = {};
    this.showModal = true;
  }

  openEdit(e: EventRecord) {
    this.selectedEvent = e;
    this.form = { ...e };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.saving = false;
  }

  async save() {
    if (this.saving) return;

    this.saving = true;
    this.cdr.detectChanges();

    const now = new Date().toISOString();

    try {
      if (this.selectedEvent?.id) {
        await this.eventsService.updateEvent(this.selectedEvent.id, {
          ...this.form,
          updatedAt: now,
        });
      } else {
        await this.eventsService.addEvent({
          ...(this.form as EventRecord),
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
}