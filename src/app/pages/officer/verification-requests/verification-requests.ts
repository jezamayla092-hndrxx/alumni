import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { VerificationService } from '../../../services/verification.service';
import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { VerificationRequest } from '../../../models/verification.model';

type VerificationFilter =
  | 'all'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected';

@Component({
  selector: 'app-verification-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './verification-requests.html',
  styleUrls: ['./verification-requests.scss'],
})
export class VerificationRequestsComponent implements OnInit, OnDestroy {
  searchTerm = '';
  activeFilter: VerificationFilter = 'all';

  showDetailsModal = false;
  selectedRequest: VerificationRequest | null = null;

  loading = true;
  modalBusy = false;

  verificationRequests: VerificationRequest[] = [];
  filteredRequests: VerificationRequest[] = [];

  private requestsSub?: Subscription;

  constructor(
    private verificationService: VerificationService,
    private authService: AuthService,
    private usersService: UsersService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadVerificationRequests();
  }

  ngOnDestroy(): void {
    this.requestsSub?.unsubscribe();
    Swal.close();
  }

  // =========================
  // LOAD DATA (FIXED TS2322 HERE)
  // =========================
  private loadVerificationRequests(): void {
    this.loading = true;

    this.requestsSub?.unsubscribe();

    this.requestsSub =
      this.verificationService.getAllVerificationRequests().subscribe({
        next: (requests) => {
          this.ngZone.run(() => {
            this.verificationRequests = (requests || []).map((r) => ({
              ...r,
              status: this.normalizeStatus(r.status),
            }));

            this.applyFilters(false);

            this.loading = false;
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
        },
      });
  }

  // =========================
  // SAFE STATUS NORMALIZER (NO TS ERROR)
  // =========================
  private normalizeStatus(status: any): VerificationRequest['status'] {
    const s = (status || '')
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .trim();

    switch (s) {
      case 'pending':
        return 'pending';
      case 'under_review':
        return 'under_review';
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      default:
        return 'pending';
    }
  }

  // =========================
  // FILTER SYSTEM (STABLE)
  // =========================
  applyFilters(triggerDetectChanges = true): void {
  const keyword = this.searchTerm.trim().toLowerCase();

  const filter = this.activeFilter;

  this.filteredRequests = this.verificationRequests.filter((request) => {
    const status = this.normalizeStatus(request.status);

    const matchesSearch =
      !keyword ||
      (request.fullName ?? '').toLowerCase().includes(keyword) ||
      (request.email ?? '').toLowerCase().includes(keyword) ||
      (request.program ?? '').toLowerCase().includes(keyword) ||
      (request.studentId ?? '').toString().toLowerCase().includes(keyword);

    const matchesFilter =
      filter === 'all'
        ? true
        : status === filter;

    return matchesSearch && matchesFilter;
  });

  if (triggerDetectChanges) {
    this.cdr.detectChanges();
  }
}

  setFilter(filter: VerificationFilter): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  // =========================
  // MODAL
  // =========================
  openDetails(request: VerificationRequest, event?: Event): void {
    event?.stopPropagation();
    this.selectedRequest = request;
    this.showDetailsModal = true;
  }

  closeDetails(event?: Event): void {
    event?.stopPropagation();
    this.selectedRequest = null;
    this.showDetailsModal = false;
  }

  // =========================
  // ACTIONS
  // =========================
  async approveRequest(request: VerificationRequest, event?: Event) {
    event?.stopPropagation();

    const confirm = await Swal.fire({
      title: 'Approve request?',
      text: 'This will mark the user as verified.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, approve',
    });

    if (!confirm.isConfirmed) return;

    this.modalBusy = true;

    await this.verificationService.updateStatus(request.id!, 'approved');

    this.modalBusy = false;
    this.closeDetails();

    Swal.fire('Approved!', 'User has been verified.', 'success');

    this.loadVerificationRequests();
  }

  async rejectRequest(request: VerificationRequest, event?: Event) {
    event?.stopPropagation();

    const confirm = await Swal.fire({
      title: 'Reject request?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reject',
    });

    if (!confirm.isConfirmed) return;

    this.modalBusy = true;

    await this.verificationService.updateStatus(request.id!, 'rejected');

    this.modalBusy = false;
    this.closeDetails();

    Swal.fire('Rejected', 'Request has been rejected.', 'success');

    this.loadVerificationRequests();
  }

  async markAsUnderReview(request: VerificationRequest, event?: Event) {
    event?.stopPropagation();

    const confirm = await Swal.fire({
      title: 'Mark as under review?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
    });

    if (!confirm.isConfirmed) return;

    this.modalBusy = true;

    await this.verificationService.updateStatus(request.id!, 'under_review');

    this.modalBusy = false;

    Swal.fire('Updated!', 'Request moved to under review.', 'success');

    this.loadVerificationRequests();
  }

  // =========================
  // HELPERS
  // =========================
  isUnderReview(status: string): boolean {
    return this.normalizeStatus(status) === 'under_review';
  }

  getStatusClass(status: string): string {
    switch (this.normalizeStatus(status)) {
      case 'pending':
        return 'status-pending';
      case 'under_review':
        return 'status-review';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'status-pending';
    }
  }

  getStatusLabel(status: string): string {
    switch (this.normalizeStatus(status)) {
      case 'pending':
        return 'Pending';
      case 'under_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  }

  formatDate(value: any): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
  }

  trackByRequestId(index: number, item: VerificationRequest): string {
    return item.id ?? index.toString();
  }
}