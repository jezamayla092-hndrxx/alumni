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

interface VerificationDocumentView {
  fileName: string;
  fileType: string;
  url: string;
  isImage: boolean;
}

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
      request.contactNumber,
      request.birthDate,
      request.sex,
      request.remarks,
      this.getIdPhotoUrl(request),
      this.getUniversityIdLabel(request),
      this.getAlumniIdLabel(request),
      this.getContactNumberLabel(request),
      this.getBirthDateLabel(request),
      ...this.getVerificationDocuments(request).map((document) => document.fileName),
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

  async approveRequest(request: VerificationRequest, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();

    if (!request.id) return;

    const confirmed = await this.confirmAction(
      'Approve request?',
      'This will verify the alumni account and generate an official Alumni ID.',
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

  async rejectRequest(request: VerificationRequest, event?: Event): Promise<void> {
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
    action: () => Promise<string | void>,
    successTitle: string,
    successText: string,
    errorText: string
  ): Promise<void> {
    try {
      this.modalBusy = true;
      this.cdr.detectChanges();

      const result = await action();

      const finalSuccessText =
        typeof result === 'string' && result.trim()
          ? `${successText}\n\nAlumni ID: ${result}`
          : successText;

      await Swal.fire(successTitle, finalSuccessText, 'success');
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
    const raw =
      (request as any).submittedAt ||
      (request as any).updatedAt ||
      (request as any).reviewedAt;

    if (!raw) return 0;
    if (typeof raw === 'number') return raw;
    if (raw?.seconds) return raw.seconds * 1000;

    const parsed = new Date(raw).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  // ── Footnote helpers ──────────────────────────────────────────

  getFilterTotal(): number {
    if (this.activeFilter === 'all') return this.verificationRequests.length;

    return this.verificationRequests.filter(
      (request) => this.normalizeStatus(request.status) === this.activeFilter
    ).length;
  }

  getFilterLabel(): string {
    switch (this.activeFilter) {
      case 'all':
        return 'total accounts';
      case 'pending':
        return 'pending requests';
      case 'under_review':
        return 'under review requests';
      case 'approved':
        return 'approved requests';
      case 'rejected':
        return 'rejected requests';
      default:
        return 'requests';
    }
  }

  // ── Display helpers ───────────────────────────────────────────

  getProfileInitials(request: VerificationRequest): string {
    const fullName = String(request.fullName || '').trim();
    if (!fullName) return 'A';
    return fullName.charAt(0).toUpperCase();
  }

  getUniversityIdLabel(request: VerificationRequest): string {
    const studentId = request.studentId?.trim();

    if (studentId) return studentId;

    const oldWrongAlumniId = request.alumniId?.trim() || '';

    if (oldWrongAlumniId && !oldWrongAlumniId.startsWith('USTP-VIL-AL-')) {
      return oldWrongAlumniId;
    }

    return '—';
  }

  getAlumniIdLabel(request: VerificationRequest): string {
    const alumniId = request.alumniId?.trim() || '';
    if (alumniId.startsWith('USTP-VIL-AL-')) return alumniId;
    return 'Not assigned yet';
  }

  getContactNumberLabel(request: VerificationRequest): string {
    return request.contactNumber?.trim() || '—';
  }

  getBirthDateLabel(request: VerificationRequest): string {
    const birthDate = request.birthDate;

    if (!birthDate) return '—';

    if (typeof birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      const [year, month, day] = birthDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
    }

    return this.formatDate(birthDate);
  }

  getSexLabel(request: VerificationRequest): string {
    return request.sex?.trim() || '—';
  }

  getRemarksLabel(request: VerificationRequest): string {
    return request.remarks?.trim() || 'No remarks';
  }

  getIdPhotoUrl(request: VerificationRequest): string {
    return String((request as any).idPhotoUrl || '').trim();
  }

  hasIdPhoto(request: VerificationRequest): boolean {
    return !!this.getIdPhotoUrl(request);
  }

  openIdPhoto(request: VerificationRequest, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    const url = this.getIdPhotoUrl(request);
    if (!url) return;

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  getVerificationDocuments(request: VerificationRequest): VerificationDocumentView[] {
    const documents: VerificationDocumentView[] = [];

    const uploadedDocuments = Array.isArray(request.verificationDocuments)
      ? request.verificationDocuments
      : [];

    uploadedDocuments.forEach((document: any, index) => {
      const url = String(
        document?.url || document?.secureUrl || document?.downloadUrl || ''
      ).trim();

      if (!url) return;

      const fileName =
        String(document?.fileName || document?.name || document?.documentName || '').trim() ||
        this.getFileNameFromUrl(url) ||
        `Verification Document ${index + 1}`;

      const fileType =
        String(document?.fileType || document?.type || document?.mimeType || '').trim() ||
        this.guessFileTypeFromUrl(url);

      documents.push({
        fileName,
        fileType,
        url,
        isImage: this.isImageDocument(fileType, url),
      });
    });

    const submittedDocuments = Array.isArray(request.submittedDocuments)
      ? request.submittedDocuments
      : [];

    submittedDocuments.forEach((documentUrl, index) => {
      const url = String(documentUrl || '').trim();

      if (!url) return;
      if (documents.some((document) => document.url === url)) return;

      const fileName = this.getFileNameFromUrl(url) || `Submitted Document ${index + 1}`;
      const fileType = this.guessFileTypeFromUrl(url);

      documents.push({
        fileName,
        fileType,
        url,
        isImage: this.isImageDocument(fileType, url),
      });
    });

    const oldDocumentUrl = request.documentUrl?.trim();

    if (oldDocumentUrl && !documents.some((document) => document.url === oldDocumentUrl)) {
      const fileName =
        request.documentName?.trim() ||
        this.getFileNameFromUrl(oldDocumentUrl) ||
        'Verification Document';

      const fileType = this.guessFileTypeFromUrl(oldDocumentUrl);

      documents.push({
        fileName,
        fileType,
        url: oldDocumentUrl,
        isImage: this.isImageDocument(fileType, oldDocumentUrl),
      });
    }

    return documents;
  }

  getDocumentTypeLabel(document: VerificationDocumentView): string {
    if (document.fileType?.startsWith('image/')) return 'Image Document';
    if (document.fileType) return document.fileType;
    return 'Document';
  }

  openDocument(url: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (!url) return;

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  trackByDocumentUrl(index: number, document: VerificationDocumentView): string {
    return document.url || index.toString();
  }

  private getFileNameFromUrl(url: string): string {
    try {
      const cleanUrl = url.split('?')[0];
      const lastPart = cleanUrl.split('/').pop() || '';
      return decodeURIComponent(lastPart) || '';
    } catch {
      return '';
    }
  }

  private guessFileTypeFromUrl(url: string): string {
    const cleanUrl = url.split('?')[0].toLowerCase();

    if (/\.(jpg|jpeg)$/.test(cleanUrl)) return 'image/jpeg';
    if (/\.png$/.test(cleanUrl)) return 'image/png';
    if (/\.webp$/.test(cleanUrl)) return 'image/webp';
    if (/\.gif$/.test(cleanUrl)) return 'image/gif';
    if (/\.pdf$/.test(cleanUrl)) return 'application/pdf';

    return '';
  }

  private isImageDocument(fileType: string, url: string): boolean {
    const normalizedType = String(fileType || '').toLowerCase();
    const normalizedUrl = String(url || '').split('?')[0].toLowerCase();

    return (
      normalizedType.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif)$/.test(normalizedUrl)
    );
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