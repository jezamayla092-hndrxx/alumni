import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { VerificationService } from '../../../services/verification.service';
import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { VerificationRequest } from '../../../models/verification.model';
import { User } from '../../../models/user.model';

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
  verificationRequests: VerificationRequest[] = [];

  processingRequestId: string | null = null;
  modalBusy = false;

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

  get filteredRequests(): VerificationRequest[] {
    const keyword = this.searchTerm.trim().toLowerCase();

    return this.verificationRequests.filter((request) => {
      const matchesSearch =
        !keyword ||
        (request.fullName || '').toLowerCase().includes(keyword) ||
        (request.email || '').toLowerCase().includes(keyword) ||
        (request.program || '').toLowerCase().includes(keyword) ||
        String(request.studentId || '')
          .toLowerCase()
          .includes(keyword);

      const matchesFilter =
        this.activeFilter === 'all'
          ? true
          : request.status === this.activeFilter;

      return matchesSearch && matchesFilter;
    });
  }

  isUIBusy(): boolean {
    return this.modalBusy || !!this.processingRequestId;
  }

  setFilter(filter: VerificationFilter): void {
    if (this.isUIBusy()) return;

    this.activeFilter = filter;
    this.cdr.detectChanges();
  }

  openDetails(request: VerificationRequest, event?: Event): void {
    event?.stopPropagation();

    if (this.isUIBusy()) return;

    this.selectedRequest = request;
    this.showDetailsModal = true;
    this.cdr.detectChanges();
  }

  closeDetails(event?: Event): void {
    event?.stopPropagation();

    if (this.modalBusy) return;

    this.selectedRequest = null;
    this.showDetailsModal = false;
    this.cdr.detectChanges();
  }

  async approveRequest(
    request?: VerificationRequest,
    event?: Event
  ): Promise<void> {
    event?.stopPropagation();

    const targetRequest = request || this.selectedRequest;
    if (!targetRequest?.id) return;
    if (this.modalBusy || this.processingRequestId) return;

    const reviewerName = await this.getReviewerName();
    if (!reviewerName) return;

    this.modalBusy = true;
    this.processingRequestId = targetRequest.id;

    this.closeDetailsSilently();
    Swal.close();

    const result = await Swal.fire({
      title: 'Approve verification?',
      text: `Approve ${targetRequest.fullName}'s verification request?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Approve',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });

    if (!result.isConfirmed) {
      this.processingRequestId = null;
      this.modalBusy = false;
      return;
    }

    try {
      await this.verificationService.approveRequest(
        targetRequest.id,
        reviewerName
      );

      await Swal.fire({
        icon: 'success',
        title: 'Approved',
        text: `${targetRequest.fullName} is now verified.`,
        confirmButtonColor: '#16a34a',
        allowOutsideClick: false,
      });

      this.loadVerificationRequests();
    } catch (error) {
      console.error('Approve failed:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Approval failed',
        text: 'Could not approve this request.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      this.processingRequestId = null;
      this.modalBusy = false;
    }
  }

  async rejectRequest(
    request?: VerificationRequest,
    event?: Event
  ): Promise<void> {
    event?.stopPropagation();

    const targetRequest = request || this.selectedRequest;
    if (!targetRequest?.id) return;
    if (this.modalBusy || this.processingRequestId) return;

    const reviewerName = await this.getReviewerName();
    if (!reviewerName) return;

    this.modalBusy = true;
    this.processingRequestId = targetRequest.id;

    this.closeDetailsSilently();
    Swal.close();

    const result = await Swal.fire({
      title: 'Reject verification?',
      input: 'textarea',
      inputLabel: 'Remarks',
      inputPlaceholder: 'Enter rejection reason...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Reject',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Remarks are required.';
        }
        return null;
      },
    });

    if (!result.isConfirmed) {
      this.processingRequestId = null;
      this.modalBusy = false;
      return;
    }

    try {
      await this.verificationService.rejectRequest(
        targetRequest.id,
        reviewerName,
        result.value.trim()
      );

      await Swal.fire({
        icon: 'success',
        title: 'Rejected',
        text: `${targetRequest.fullName}'s request was rejected.`,
        confirmButtonColor: '#4f46e5',
        allowOutsideClick: false,
      });

      this.loadVerificationRequests();
    } catch (error) {
      console.error('Reject failed:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Rejection failed',
        text: 'Could not reject this request.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      this.processingRequestId = null;
      this.modalBusy = false;
    }
  }

  async markUnderReview(
    request: VerificationRequest,
    event?: Event
  ): Promise<void> {
    event?.stopPropagation();

    if (!request.id) return;
    if (this.modalBusy || this.processingRequestId) return;

    const reviewerName = await this.getReviewerName();
    if (!reviewerName) return;

    try {
      this.processingRequestId = request.id;

      await this.verificationService.markAsUnderReview(
        request.id,
        reviewerName
      );

      await Swal.fire({
        icon: 'success',
        title: 'Marked as under review',
        text: `${request.fullName}'s request is now under review.`,
        confirmButtonColor: '#4f46e5',
      });

      this.loadVerificationRequests();
    } catch (error) {
      console.error('Under review update failed:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Update failed',
        text: 'Could not update this request.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      this.processingRequestId = null;
    }
  }

  getStatusLabel(status: VerificationRequest['status']): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'under_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  getStatusClass(status: VerificationRequest['status']): string {
    switch (status) {
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

  formatDate(value: any): string {
    if (!value) return '—';

    if (typeof value === 'string') return value;

    if (value?.toDate) {
      return value.toDate().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    if (value?.seconds) {
      return new Date(value.seconds * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    return '—';
  }

  trackByRequestId(index: number, item: VerificationRequest): string {
    return item.id || index.toString();
  }

  private closeDetailsSilently(): void {
    this.selectedRequest = null;
    this.showDetailsModal = false;
    this.cdr.detectChanges();
  }

  private loadVerificationRequests(): void {
    this.loading = true;
    this.requestsSub?.unsubscribe();

    this.requestsSub = this.verificationService
      .getAllVerificationRequests()
      .subscribe({
        next: (requests: VerificationRequest[]) => {
          this.ngZone.run(() => {
            this.verificationRequests = Array.isArray(requests)
              ? [...requests]
              : [];
            this.loading = false;

            if (this.selectedRequest?.id) {
              const updatedSelected = this.verificationRequests.find(
                (item) => item.id === this.selectedRequest?.id
              );
              this.selectedRequest = updatedSelected || null;
              this.showDetailsModal = !!updatedSelected && this.showDetailsModal;
            }

            this.cdr.detectChanges();
          });
        },
        error: (error: unknown) => {
          this.ngZone.run(() => {
            console.error('Failed to load verification requests:', error);
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
      });
  }

  private async getReviewerName(): Promise<string | null> {
    try {
      const authUser = await this.authService.getAuthState();

      if (!authUser) {
        await Swal.fire({
          icon: 'error',
          title: 'Session Error',
          text: 'No authenticated officer found.',
          confirmButtonColor: '#dc2626',
        });
        return null;
      }

      let officerDoc: User | null = null;

      try {
        officerDoc = await this.usersService.getUserById(authUser.uid);
      } catch (error) {
        console.error('Failed to load officer profile:', error);
      }

      const fullName =
        officerDoc?.fullName?.trim() ||
        [officerDoc?.firstName, officerDoc?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

      return (
        fullName ||
        authUser.displayName?.trim() ||
        authUser.email?.trim() ||
        'Alumni Office'
      );
    } catch (error) {
      console.error('Failed to resolve reviewer name:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Profile Error',
        text: 'Could not resolve the reviewer name.',
        confirmButtonColor: '#dc2626',
      });

      return null;
    }
  }
}