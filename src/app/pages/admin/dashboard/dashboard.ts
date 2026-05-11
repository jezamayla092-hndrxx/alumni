import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

import { User } from '../../../models/user.model';
import { UsersService } from '../../../services/users.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class AdminDashboard implements OnInit {
  loading = false;
  loadError = '';

  users: User[] = [];
  recentUsers: User[] = [];

  constructor(
    private usersService: UsersService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    this.loading = true;
    this.loadError = '';

    try {
      const records = await this.usersService.getAllUsers();

      this.users = records ?? [];
      this.recentUsers = [...this.users]
        .sort((a, b) => this.getDateValue(b.createdAt) - this.getDateValue(a.createdAt))
        .slice(0, 5);

      this.loading = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
      this.loadError = 'Failed to load dashboard data.';
      this.users = [];
      this.recentUsers = [];
      this.loading = false;
      this.cdr.detectChanges();
    }
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

  get disabledCount(): number {
    return this.users.filter((user) => user.isActive === false).length;
  }

  get verifiedAlumniCount(): number {
    return this.users.filter(
      (user) => user.role === 'alumni' && (user.isVerified || user.status === 'verified')
    ).length;
  }

  get pendingAlumniCount(): number {
    return this.users.filter(
      (user) => user.role === 'alumni' && user.status === 'pending'
    ).length;
  }

  get activeAccountsCount(): number {
    return this.users.filter((user) => user.isActive !== false).length;
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

  getRoleLabel(role: string | undefined): string {
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

  getStatusLabel(user: User): string {
    if (user.isActive === false) return 'Disabled';

    if (user.role === 'admin' || user.role === 'officer') {
      return 'Active';
    }

    if (user.status === 'verified' || user.isVerified) return 'Verified';
    if (user.status === 'pending') return 'Pending';
    if (user.status === 'under_review') return 'Under Review';
    if (user.status === 'rejected') return 'Rejected';

    return 'Active';
  }

  formatDate(value: any): string {
    if (!value) return '—';

    const dateValue =
      typeof value === 'string'
        ? value
        : value?.toDate?.() ?? value;

    const date = new Date(dateValue);

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

    const dateValue =
      typeof value === 'string'
        ? value
        : value?.toDate?.() ?? value;

    const date = new Date(dateValue);

    return isNaN(date.getTime()) ? 0 : date.getTime();
  }
}