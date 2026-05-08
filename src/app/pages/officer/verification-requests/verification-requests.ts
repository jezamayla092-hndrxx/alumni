import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { AuthService } from '../../../services/auth.service';
import { VerificationService } from '../../../services/verification.service';
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

  loading = true;
  modalBusy = false;

  showDetailsModal = false;
  selectedRequest: VerificationRequest | null = null;

  verificationRequests: VerificationRequest[] = [];
  filteredRequests: VerificationRequest[] = [];

  private requestsSub?: Subscription;

  constructor(
    private verificationService: VerificationService,
    private authService: AuthService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    const user = await this.authService.waitForAuthReady();

    if (!user) {
      await this.router.navigate(['/login']);
      return;
    }

    this.loadRequests();
  }

  ngOnDestroy(): void {
    this.requestsSub?.unsubscribe();
    Swal.close();
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.showDetailsModal) this.closeDetails();
  }

  private loadRequests(): void {
    this.loading = true;
    this.requestsSub?.unsubscribe();

    this.requestsSub = this.verificationService
      .getAllVerificationRequests()
      .subscribe({
        next: (requests) => {
          this.zone.run(() => {
            this.verificationRequests = (requests || [])
              .map((request) => ({
                ...request,
                status: this.normalizeStatus(request.status),
              }))
              .sort((a, b) => this.getRequestTime(b) - this.getRequestTime(a));

            this.applyFilters(false);
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          this.zone.run(() => {
            console.error('Failed to load verification requests:', error);
            this.verificationRequests = [];
            this.filteredRequests = [];
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
      });
  }

  applyFilters(triggerDetectChanges = true): void {
    const keyword = this.searchTerm.trim().toLowerCase();

    this.filteredRequests = this.verificationRequests.filter((request) => {
      return this.matchesSearch(request, keyword) && this.matchesFilter(request);
    });

    if (triggerDetectChanges) this.cdr.detectChanges();
  }

  private matchesSearch(request: VerificationRequest, keyword: string): boolean {
    if (!keyword) return true;

    return [
      request.fullName,
      request.email,
      request.program,
      request.studentId,
      request.alumniId,
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .some((value) => value.includes(keyword));
  }

  private matchesFilter(request: VerificationRequest): boolean {
    if (this.activeFilter === 'all') return true;
    return this.normalizeStatus(request.status) === this.activeFilter;
  }

  setFilter(filter: VerificationFilter): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  openDetails(request: VerificationRequest, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.zone.run(() => {
      this.selectedRequest = { ...request };
      this.showDetailsModal = true;
      this.cdr.detectChanges();
    });
  }

  closeDetails(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.zone.run(() => {
      this.showDetailsModal = false;
      this.selectedRequest = null;
      this.modalBusy = false;
      this.cdr.detectChanges();
    });
  }

  async markAsUnderReview(
    request: VerificationRequest,
    event?: Event
  ): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();

    if (!request.id) return;

    const confirmed = await this.confirmAction(
      'Mark as Under Review?',
      'This will update the request status to Under Review.',
      'question',
      'Yes'
    );

    if (!confirmed) return;

    await this.runRequestAction(
      () => this.verificationService.markAsUnderReview(request.id!, this.getReviewer()),
      'Updated!',
      'Request is now marked as Under Review.',
      'Failed to update request.'
    );
  }

  async approveRequest(request: VerificationRequest, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();

    if (!request.id) return;

    const confirmed = await this.confirmAction(
      'Approve request?',
      'This will verify the alumni account.',
      'question',
      'Yes, approve'
    );

    if (!confirmed) return;

    await this.runRequestAction(
      () => this.verificationService.approveRequest(request.id!, this.getReviewer()),
      'Approved!',
      'Alumni account has been verified.',
      'Failed to approve request.'
    );
  }

  async rejectRequest(request: VerificationRequest, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();

    if (!request.id) return;

    const remarks = await this.askRejectReason();
    if (!remarks) return;

    await this.runRequestAction(
      () => this.verificationService.rejectRequest(request.id!, this.getReviewer(), remarks),
      'Rejected',
      'Request has been rejected.',
      'Failed to reject request.'
    );
  }

  private async confirmAction(
    title: string,
    text: string,
    icon: 'question' | 'warning',
    confirmButtonText: string
  ): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText,
    });
    return result.isConfirmed;
  }

  private async askRejectReason(): Promise<string | null> {
    const result = await Swal.fire({
      title: 'Reject request?',
      input: 'textarea',
      inputLabel: 'Remarks / Reason',
      inputPlaceholder: 'Enter reason for rejection...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reject',
      inputValidator: (value) => (!value?.trim() ? 'Please enter a reason.' : null),
    });

    return result.isConfirmed ? result.value.trim() : null;
  }

  private async runRequestAction(
    action: () => Promise<void>,
    successTitle: string,
    successText: string,
    errorText: string
  ): Promise<void> {
    try {
      this.modalBusy = true;
      this.cdr.detectChanges();

      await action();

      await Swal.fire(successTitle, successText, 'success');
    } catch (error) {
      console.error(error);
      await Swal.fire('Error', errorText, 'error');
    } finally {
      this.modalBusy = false;
      this.closeDetails();
      this.cdr.detectChanges();
    }
  }

  private getReviewer(): string {
    return this.authService.getCurrentUser()?.email || 'Officer';
  }

  private normalizeStatus(status: any): VerificationRequest['status'] {
    const value = String(status ?? '').toLowerCase().replace(/\s+/g, '_').trim();
    switch (value) {
      case 'pending':
      case 'under_review':
      case 'approved':
      case 'rejected':
        return value;
      default:
        return 'pending';
    }
  }

  private getRequestTime(request: VerificationRequest): number {
    const raw = (request as any).submittedAt || (request as any).updatedAt || (request as any).reviewedAt;
    if (!raw) return 0;
    if (typeof raw === 'number') return raw;
    if (raw?.seconds) return raw.seconds * 1000;
    const parsed = new Date(raw).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
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
    const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  }

  trackByRequestId(index: number, item: VerificationRequest): string {
    return item.id ?? index.toString();
  }
}