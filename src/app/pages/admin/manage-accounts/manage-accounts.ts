import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { User, UserRole } from '../../../models/user.model';

type AccountStatusFilter = '' | 'active' | 'disabled';
type VerificationFilter = '' | 'verified' | 'pending' | 'under_review' | 'rejected';

type UserWithAccountAudit = User & {
  accountStatus?: 'active' | 'disabled';
  disabledReason?: string | null;
  disabledAt?: any;
  disabledBy?: string | null;
  disabledByName?: string | null;
  reactivatedAt?: any;
  reactivatedBy?: string | null;
  reactivatedByName?: string | null;
};

type CreateOfficerForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  email: string;
  contactNumber: string;
  password: string;
  confirmPassword: string;
};

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

  showCreateOfficerModal = false;
  showViewModal = false;
  showRoleModal = false;
  showStatusModal = false;

  selectedUser: User | null = null;
  roleTargetUser: User | null = null;
  statusTargetUser: User | null = null;

  selectedRole: UserRole = 'alumni';

  statusReason = '';
  readonly statusReasonMaxLength = 300;

  createOfficerForm: CreateOfficerForm = this.getEmptyCreateOfficerForm();

  readonly roleOptions: { label: string; value: UserRole }[] = [
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

    this.filteredUsers = this.getManageableUsers().filter((user) => {
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

  get manageableAccounts(): number {
    return this.getManageableUsers().length;
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

  openCreateOfficerModal(): void {
    this.createOfficerForm = this.getEmptyCreateOfficerForm();
    this.actionError = '';
    this.saving = false;
    this.showCreateOfficerModal = true;
    this.cdr.detectChanges();
  }

  closeCreateOfficerModal(): void {
    if (this.saving) return;

    this.createOfficerForm = this.getEmptyCreateOfficerForm();
    this.actionError = '';
    this.showCreateOfficerModal = false;
    this.cdr.detectChanges();
  }

  async confirmCreateOfficer(): Promise<void> {
    if (this.saving) return;

    const firstName = this.createOfficerForm.firstName.trim();
    const middleName = this.createOfficerForm.middleName.trim();
    const lastName = this.createOfficerForm.lastName.trim();
    const suffix = this.createOfficerForm.suffix.trim();
    const email = this.createOfficerForm.email.trim().toLowerCase();
    const contactNumber = this.createOfficerForm.contactNumber.trim();
    const password = this.createOfficerForm.password.trim();
    const confirmPassword = this.createOfficerForm.confirmPassword.trim();

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      this.actionError = 'Please complete all required officer account fields.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.isValidEmail(email)) {
      this.actionError = 'Please enter a valid officer email address.';
      this.cdr.detectChanges();
      return;
    }

    if (password.length < 6) {
      this.actionError = 'Password must be at least 6 characters.';
      this.cdr.detectChanges();
      return;
    }

    if (password !== confirmPassword) {
      this.actionError = 'Password and confirm password do not match.';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.actionError = '';
    this.cdr.detectChanges();

    try {
      await this.usersService.createOfficerAccount({
        firstName,
        middleName,
        lastName,
        suffix,
        email,
        contactNumber,
        password,
      });

      await this.loadUsers();

      this.createOfficerForm = this.getEmptyCreateOfficerForm();
      this.showCreateOfficerModal = false;
      this.saving = false;
      this.actionError = '';
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to create officer account:', error);
      this.actionError = this.getCreateOfficerErrorMessage(error);
      this.saving = false;
      this.cdr.detectChanges();
    }
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
    this.selectedRole = user.role === 'admin' ? 'officer' : user.role || 'alumni';
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

    if (this.selectedRole === 'admin') {
      this.actionError = 'Admin role cannot be assigned from this page.';
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
    this.statusReason = '';
    this.showStatusModal = true;
    this.actionError = '';
    this.cdr.detectChanges();
  }

  closeStatusModal(): void {
    this.statusTargetUser = null;
    this.statusReason = '';
    this.showStatusModal = false;
    this.actionError = '';
    this.saving = false;
    this.cdr.detectChanges();
  }

  async confirmStatusChange(): Promise<void> {
    if (!this.statusTargetUser?.id || this.saving) return;

    const currentUid = this.authService.getCurrentUid();
    const willDisable = this.statusTargetUser.isActive !== false;
    const reason = this.statusReason.trim();

    if (this.statusTargetUser.id === currentUid && willDisable) {
      this.actionError = 'You cannot disable your own admin account.';
      this.cdr.detectChanges();
      return;
    }

    if (willDisable && !reason) {
      this.actionError = 'Please provide a reason or remarks before disabling this account.';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.actionError = '';
    this.cdr.detectChanges();

    try {
      let actorName = 'Administrator';

      if (currentUid) {
        const currentUser = await this.usersService.getUserById(currentUid);
        if (currentUser) {
          actorName = this.getAccountName(currentUser);
        }
      }

      if (willDisable) {
        await this.usersService.disableUser(
          this.statusTargetUser.id,
          reason,
          currentUid || '',
          actorName
        );
      } else {
        await this.usersService.activateUser(
          this.statusTargetUser.id,
          currentUid || '',
          actorName
        );
      }

      await this.loadUsers();
      this.closeStatusModal();
    } catch (error) {
      console.error('Failed to update account status:', error);
      this.actionError = willDisable
        ? 'Failed to disable account.'
        : 'Failed to activate account.';
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
      return 'This will restore the user’s access to the system.';
    }

    return 'This will block the user from accessing the system without deleting their account.';
  }

  getStatusModalTitle(user: User | null): string {
    if (!user) return 'Update Account Status';
    return user.isActive === false ? 'Activate Account' : 'Disable Account';
  }

  getStatusModalIntro(user: User | null): string {
    if (!user) return '';

    if (user.isActive === false) {
      return `You are about to activate ${this.getAccountName(user)}’s account. The user will be able to access the system again.`;
    }

    return `You are about to disable ${this.getAccountName(user)}’s account. Please provide a reason or remarks because this will be shown to the user when they try to log in.`;
  }

  getDisabledReason(user: User | null): string {
    if (!user) return '';

    const auditedUser = user as UserWithAccountAudit;
    return (auditedUser.disabledReason || '').trim();
  }

  getDisabledByName(user: User | null): string {
    if (!user) return '';

    const auditedUser = user as UserWithAccountAudit;
    return (auditedUser.disabledByName || '').trim();
  }

  getDisabledAt(user: User | null): any {
    if (!user) return null;

    const auditedUser = user as UserWithAccountAudit;
    return auditedUser.disabledAt || null;
  }

  get reasonCharactersLeft(): number {
    return this.statusReasonMaxLength - this.statusReason.length;
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

  private getManageableUsers(): User[] {
    return this.users.filter((user) => user.role !== 'admin');
  }

  private getEmptyCreateOfficerForm(): CreateOfficerForm {
    return {
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      email: '',
      contactNumber: '',
      password: '',
      confirmPassword: '',
    };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private getCreateOfficerErrorMessage(error: any): string {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || '').toLowerCase();

    if (code.includes('auth/email-already-in-use') || message.includes('email-already-in-use')) {
      return 'This email is already registered.';
    }

    if (code.includes('auth/invalid-email')) {
      return 'The officer email address is invalid.';
    }

    if (code.includes('auth/weak-password')) {
      return 'The password is too weak. Use at least 6 characters.';
    }

    if (code.includes('auth/network-request-failed')) {
      return 'Network error. Please check your connection and try again.';
    }

    if (message.includes('permission')) {
      return 'Permission denied. Please check your Firestore rules for admin account creation.';
    }

    return 'Failed to create officer account.';
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