import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import {
  SupportService,
  SupportTicket,
  SupportTicketStatus,
} from '../../../services/support.service';

type TicketStatusFilter = 'all' | SupportTicketStatus;

@Component({
  selector: 'app-concerns-support',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './concerns-support.html',
  styleUrls: ['./concerns-support.scss'],
})
export class ConcernsSupport implements OnInit {
  private supportService = inject(SupportService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  updating = false;

  searchTerm = '';
  statusFilter: TicketStatusFilter = 'all';
  concernTypeFilter = 'all';

  tickets: SupportTicket[] = [];
  selectedTicket: SupportTicket | null = null;

  readonly statusOptions: { label: string; value: SupportTicketStatus }[] = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' },
  ];

  async ngOnInit(): Promise<void> {
    await this.loadTickets();
  }

  get filteredTickets(): SupportTicket[] {
    const searchValue = this.searchTerm.trim().toLowerCase();

    return this.tickets.filter((ticket) => {
      const matchesSearch =
        !searchValue ||
        (ticket.fullName || '').toLowerCase().includes(searchValue) ||
        (ticket.email || '').toLowerCase().includes(searchValue) ||
        (ticket.alumniId || '').toLowerCase().includes(searchValue) ||
        (ticket.studentId || '').toLowerCase().includes(searchValue) ||
        (ticket.concernType || '').toLowerCase().includes(searchValue) ||
        (ticket.message || '').toLowerCase().includes(searchValue);

      const matchesStatus =
        this.statusFilter === 'all' || ticket.status === this.statusFilter;

      const matchesConcernType =
        this.concernTypeFilter === 'all' ||
        ticket.concernType === this.concernTypeFilter;

      return matchesSearch && matchesStatus && matchesConcernType;
    });
  }

  get concernTypes(): string[] {
    const types = this.tickets
      .map((ticket) => ticket.concernType)
      .filter((type): type is string => !!type);

    return Array.from(new Set(types)).sort((a, b) => a.localeCompare(b));
  }

  get totalTickets(): number {
    return this.tickets.length;
  }

  async loadTickets(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      this.tickets = await this.supportService.getSupportTickets();

      if (this.selectedTicket?.id) {
        const updatedSelectedTicket = this.tickets.find(
          (ticket) => ticket.id === this.selectedTicket?.id
        );

        this.selectedTicket = updatedSelectedTicket || null;
      }
    } catch (error) {
      console.error('Failed to load support tickets:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Load Concerns',
        text: 'Something went wrong while loading submitted concerns.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  selectTicket(ticket: SupportTicket): void {
    this.selectedTicket = ticket;
    this.cdr.detectChanges();
  }

  clearSelectedTicket(): void {
    this.selectedTicket = null;
    this.cdr.detectChanges();
  }

  async updateStatus(
    ticket: SupportTicket,
    newStatus: SupportTicketStatus | string
  ): Promise<void> {
    const status = String(newStatus) as SupportTicketStatus;

    if (
      !['open', 'in_progress', 'resolved', 'closed'].includes(status) ||
      !ticket.id ||
      this.updating ||
      ticket.status === status
    ) {
      return;
    }

    this.updating = true;
    this.cdr.detectChanges();

    try {
      await this.supportService.updateSupportTicketStatus(ticket.id, status);

      this.tickets = this.tickets.map((item) =>
        item.id === ticket.id
          ? {
              ...item,
              status,
              updatedAt: new Date(),
            }
          : item
      );

      if (this.selectedTicket?.id === ticket.id) {
        this.selectedTicket = {
          ...this.selectedTicket,
          status,
          updatedAt: new Date(),
        };
      }

      await Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        text: 'The concern status has been updated successfully.',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Failed to update support ticket status:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Something went wrong while updating the status.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      this.updating = false;
      this.cdr.detectChanges();
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.concernTypeFilter = 'all';
    this.cdr.detectChanges();
  }

  getStatusLabel(status: SupportTicketStatus | string): string {
    switch (status) {
      case 'open':
        return 'Open';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      case 'closed':
        return 'Closed';
      default:
        return 'Open';
    }
  }

  getInitial(name: string | undefined): string {
    const source = (name || '').trim();
    return source ? source.charAt(0).toUpperCase() : 'U';
  }

  getTicketPhotoUrl(ticket: SupportTicket | null | undefined): string {
    return (ticket?.photoUrl || '').trim();
  }

  onPhotoError(ticket: SupportTicket): void {
    ticket.photoUrl = '';

    if (this.selectedTicket && this.selectedTicket.id === ticket.id) {
      this.selectedTicket = {
        ...this.selectedTicket,
        photoUrl: '',
      };
    }

    this.cdr.detectChanges();
  }

  formatDate(value: any): string {
    if (!value) return 'Not available';

    try {
      let dateValue: Date;

      if (value?.toDate && typeof value.toDate === 'function') {
        dateValue = value.toDate();
      } else if (value instanceof Date) {
        dateValue = value;
      } else {
        dateValue = new Date(value);
      }

      if (Number.isNaN(dateValue.getTime())) {
        return 'Not available';
      }

      return dateValue.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Not available';
    }
  }

  trackByTicketId(index: number, ticket: SupportTicket): string {
    return ticket.id || `${ticket.email}-${index}`;
  }
}