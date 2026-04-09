import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { UserRole } from '../../../models/user.model';

type NavItem = {
  label: string;
  route: string;
  icon: string;
};

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.scss'],
})
export class MainLayout implements OnInit {
  sidebarCollapsed = false;
  pageTitle = 'Dashboard';
  currentRole: UserRole | null = null;
  currentUserName = 'User';
  currentUserSubtitle = 'ATMS User';

  officerNav: NavItem[] = [
    { label: 'Dashboard', route: '/officer/dashboard', icon: 'pi pi-th-large' },
    { label: 'Verification Requests', route: '/officer/verification-requests', icon: 'pi pi-check-circle' },
    { label: 'Alumni Records', route: '/officer/alumni-records', icon: 'pi pi-users' },
    { label: 'Tracer Study', route: '/officer/tracer-study', icon: 'pi pi-chart-line' },
    { label: 'Job Postings', route: '/officer/job-postings', icon: 'pi pi-briefcase' },
    { label: 'Events', route: '/officer/events', icon: 'pi pi-calendar' },
    { label: 'Announcements', route: '/officer/announcements', icon: 'pi pi-megaphone' },
  ];

  alumniNav: NavItem[] = [
    { label: 'Dashboard', route: '/alumni/dashboard', icon: 'pi pi-th-large' },
    { label: 'My Profile', route: '/alumni/my-profile', icon: 'pi pi-user' },
    { label: 'Employment Status', route: '/alumni/employment-status', icon: 'pi pi-briefcase' },
    { label: 'Verification Status', route: '/alumni/verification-status', icon: 'pi pi-shield' },
    { label: 'Events & Announcements', route: '/alumni/events-announcements', icon: 'pi pi-calendar' },
    { label: 'Job Opportunities', route: '/alumni/job-opportunities', icon: 'pi pi-briefcase' },
  ];

  adminNav: NavItem[] = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'pi pi-th-large' },
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.setPageTitle(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.setPageTitle(event.urlAfterRedirects);
      });

    this.loadCurrentUser();
  }

  get navItems(): NavItem[] {
    if (this.currentRole === 'officer') return this.officerNav;
    if (this.currentRole === 'alumni') return this.alumniNav;
    if (this.currentRole === 'admin') return this.adminNav;

    const url = this.router.url;
    if (url.startsWith('/officer')) return this.officerNav;
    if (url.startsWith('/alumni')) return this.alumniNav;
    if (url.startsWith('/admin')) return this.adminNav;

    return [];
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  async logout(): Promise<void> {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Logout?',
      text: 'Are you sure you want to logout?',
      showCancelButton: true,
      confirmButtonText: 'Yes, Logout',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#6b7280',
    });

    if (!result.isConfirmed) return;

    await this.authService.logout();
    await this.router.navigate(['/login']);
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const uid = this.authService.getCurrentUid();
      if (!uid) return;

      const user = await this.usersService.getUserById(uid);
      if (!user) return;

      this.currentRole = user.role ?? null;
      this.currentUserName =
        user.fullName?.trim() ||
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
        user.email;

      if (this.currentRole === 'officer') {
        this.currentUserSubtitle = 'Alumni Officer';
      } else if (this.currentRole === 'admin') {
        this.currentUserSubtitle = 'System Administrator';
      } else {
        this.currentUserSubtitle = user.program || 'Alumni';
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  }

  private setPageTitle(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const lastSegment = cleanUrl.split('/').filter(Boolean).pop() ?? 'dashboard';

    this.pageTitle = lastSegment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}