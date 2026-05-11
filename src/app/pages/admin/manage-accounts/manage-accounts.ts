import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { User, UserRole } from '../../../models/user.model';

type AccountStatusFilter = '' | 'active' | 'disabled';
type VerificationFilter = '' | 'verified' | 'pending' | 'under_review' | 'rejected';

@Component({
  selector: 'app-manage-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-accounts.html',
  styleUrls: ['./manage-accounts.scss'],
})
export class ManageAccounts implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];

  loading = false;
  saving = false;
  loadError = '';
  actionError = '';

  searchTerm = '';
  filterRole: '' | UserRole = '';
  filterAccountStatus: AccountStatusFilter = '';
  filterVerificationStatus: VerificationFilter = '';

  showViewModal = false;
  showRoleModal = false;
  showStatusModal = false;

  selectedUser: User | null = null;
  roleTargetUser: User | null = null;
  statusTargetUser: User | null = null;

  selectedRole: UserRole = 'alumni';

  readonly roleOptions: { label: string; value: UserRole }[] = [
    { label: 'Admin', value: 'admin' },
    { label: 'Officer', value: 'officer' },
    { label: 'Alumni', value: 'alumni' },
  ];

  readonly verificationOptions: { label: string; value: VerificationFilter }[] = [
    { label: 'All Verification', value: '' },
    { label: 'Verified', value: 'verified' },
    { label: 'Pending', value: 'pending' },
    { label: 'Under Review', value: 'under_review' },
    { label: 'Rejected', value: 'rejected' },
  ];

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    this.actionError = '';
    this.cdr.detectChanges();

    try {
      const records = await this.usersService.getAllUsers();

      this.users = (records ?? []).sort(
        (a, b) => this.getDateValue(b.createdAt) - this.getDateValue(a.createdAt)
      );

      this.applyFilters();
      this.loading = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to load users:', error);
      this.loadError = 'Failed to load user accounts.';
      this.users = [];
      this.filteredUsers = [];
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredUsers = this.users.filter((user) => {
      const name = this.getAccountName(user).toLowerCase();
      const email = (user.email || '').toLowerCase();
      const studentId = (user.studentId || '').toLowerCase();
      const alumniId = (user.alumniId || '').toLowerCase();
      const program = (user.program || '').toLowerCase();
      const contactNumber = (user.contactNumber || '').toLowerCase();

      const matchesSearch =
        !term ||
        name.includes(term) ||
        email.includes(term) ||
        studentId.includes(term) ||
        alumniId.includes(term) ||
        program.includes(term) ||
        contactNumber.includes(term);

      const matchesRole = !this.filterRole || user.role === this.filterRole;

      const accountStatus = this.getAccountStatusValue(user);
      const matchesAccountStatus =
        !this.filterAccountStatus || accountStatus === this.filterAccountStatus;

      const verificationStatus = this.getVerificationStatusValue(user);
      const matchesVerification =
        !this.filterVerificationStatus ||
        verificationStatus === this.filterVerificationStatus;

      return matchesSearch && matchesRole && matchesAccountStatus && matchesVerification;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterRole = '';
    this.filterAccountStatus = '';
    this.filterVerificationStatus = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.filterRole ||
      this.filterAccountStatus ||
      this.filterVerificationStatus
    );
  }

  get totalAccounts(): number {
    return this.users.length;
  }

  get adminCount(): number {
    return this.users.filter((user) => user.role === 'admin').length;
  }

  get officerCount(): number {
    return this.users.filter((user) => user.role === 'officer').length;
  }

  get alumniCount(): number {
    return this.users.filter((user) => user.role === 'alumni').length;
  }

  get activeCount(): number {
    return this.users.filter((user) => user.isActive !== false).length;
  }

  get disabledCount(): number {
    return this.users.filter((user) => user.isActive === false).length;
  }

  openView(user: User): void {
    this.selectedUser = user;
    this.showViewModal = true;
    this.actionError = '';
    this.cdr.detectChanges();
  }

  closeView(): void {
    this.selectedUser = null;
    this.showViewModal = false;
    this.actionError = '';
    this.cdr.detectChanges();
  }

  openRoleModal(user: User): void {
    this.roleTargetUser = user;
    this.selectedRole = user.role || 'alumni';
    this.showRoleModal = true;
    this.actionError = '';
    this.cdr.detectChanges();
  }

  closeRoleModal(): void {
    this.roleTargetUser = null;
    this.selectedRole = 'alumni';
    this.showRoleModal = false;
    this.actionError = '';
    this.saving = false;
    this.cdr.detectChanges();
  }

  async confirmRoleChange(): Promise<void> {
    if (!this.roleTargetUser?.id || this.saving) return;

    const currentUid = this.authService.getCurrentUid();

    if (this.roleTargetUser.id === currentUid && this.selectedRole !== 'admin') {
      this.actionError = 'You cannot remove your own admin role while logged in.';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.actionError = '';
    this.cdr.detectChanges();

    try {
      await this.usersService.updateUser(this.roleTargetUser.id, {
        role: this.selectedRole,
        updatedAt: new Date().toISOString(),
      });

      await this.loadUsers();
      this.closeRoleModal();
    } catch (error) {
      console.error('Failed to update role:', error);
      this.actionError = 'Failed to update user role.';
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  openStatusModal(user: User): void {
    this.statusTargetUser = user;
    this.showStatusModal = true;
    this.actionError = '';
    this.cdr.detectChanges();
  }

  closeStatusModal(): void {
    this.statusTargetUser = null;
    this.showStatusModal = false;
    this.actionError = '';
    this.saving = false;
    this.cdr.detectChanges();
  }

  async confirmStatusChange(): Promise<void> {
    if (!this.statusTargetUser?.id || this.saving) return;

    const currentUid = this.authService.getCurrentUid();
    const willDisable = this.statusTargetUser.isActive !== false;

    if (this.statusTargetUser.id === currentUid && willDisable) {
      this.actionError = 'You cannot disable your own admin account.';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.actionError = '';
    this.cdr.detectChanges();

    try {
      await this.usersService.updateUser(this.statusTargetUser.id, {
        isActive: !willDisable,
        updatedAt: new Date().toISOString(),
      });

      await this.loadUsers();
      this.closeStatusModal();
    } catch (error) {
      console.error('Failed to update account status:', error);
      this.actionError = 'Failed to update account status.';
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  getAccountName(user: User): string {
    return (
      user.fullName ||
      [
        user.firstName,
        user.middleName ? `${user.middleName.charAt(0).toUpperCase()}.` : '',
        user.lastName,
        user.suffix,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      user.email ||
      'Unnamed User'
    );
  }

  getUserInitial(user: User): string {
    return this.getAccountName(user).charAt(0).toUpperCase();
  }

  getPrimaryIdentifier(user: User): string {
    const verificationStatus = this.getVerificationStatusValue(user);

    if (
      user.role === 'alumni' &&
      verificationStatus === 'verified' &&
      user.alumniId
    ) {
      return `Alumni ID: ${user.alumniId}`;
    }

    if (user.studentId) {
      return `Student ID: ${user.studentId}`;
    }

    if (user.alumniId) {
      return `Alumni ID: ${user.alumniId}`;
    }

    return '';
  }

  getRoleLabel(role: UserRole | undefined): string {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'officer':
        return 'Officer';
      case 'alumni':
        return 'Alumni';
      default:
        return 'User';
    }
  }

  getRoleClass(role: UserRole | undefined): string {
    switch (role) {
      case 'admin':
        return 'role-admin';
      case 'officer':
        return 'role-officer';
      case 'alumni':
        return 'role-alumni';
      default:
        return 'role-user';
    }
  }

  getAccountStatusValue(user: User): 'active' | 'disabled' {
    return user.isActive === false ? 'disabled' : 'active';
  }

  getAccountStatusLabel(user: User): string {
    return user.isActive === false ? 'Disabled' : 'Active';
  }

  getVerificationStatusValue(user: User): VerificationFilter {
    if (user.role !== 'alumni') return '';

    const rawStatus = (user.verificationStatus || user.status || '').toLowerCase();

    if (user.isVerified || rawStatus === 'verified') return 'verified';
    if (rawStatus === 'pending') return 'pending';
    if (rawStatus === 'under_review') return 'under_review';
    if (rawStatus === 'rejected') return 'rejected';

    return '';
  }

  getVerificationStatusLabel(user: User): string {
    if (user.role !== 'alumni') return 'Not Required';

    const status = this.getVerificationStatusValue(user);

    switch (status) {
      case 'verified':
        return 'Verified';
      case 'pending':
        return 'Pending';
      case 'under_review':
        return 'Under Review';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Not Set';
    }
  }

  getVerificationClass(user: User): string {
    const status = this.getVerificationStatusValue(user);

    switch (status) {
      case 'verified':
        return 'verify-verified';
      case 'pending':
        return 'verify-pending';
      case 'under_review':
        return 'verify-review';
      case 'rejected':
        return 'verify-rejected';
      default:
        return 'verify-none';
    }
  }

  getStatusActionText(user: User | null): string {
    if (!user) return 'Update';
    return user.isActive === false ? 'Activate Account' : 'Disable Account';
  }

  getStatusActionDescription(user: User | null): string {
    if (!user) return '';

    if (user.isActive === false) {
      return 'This will allow the user to access the system again.';
    }

    return 'This will block the user from accessing the system without deleting their account.';
  }

  formatDate(value: any): string {
    if (!value) return '—';

    const rawValue =
      typeof value === 'string'
        ? value
        : value?.toDate?.() ?? value;

    const date = new Date(rawValue);

    if (isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  trackByUser(index: number, user: User): string {
    return user.id ?? index.toString();
  }

  private getDateValue(value: any): number {
    if (!value) return 0;

    const rawValue =
      typeof value === 'string'
        ? value
        : value?.toDate?.() ?? value;

    const date = new Date(rawValue);

    return isNaN(date.getTime()) ? 0 : date.getTime();
  }
}