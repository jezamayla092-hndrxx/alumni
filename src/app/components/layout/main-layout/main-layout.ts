import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { CommonModule, NgClass, isPlatformBrowser } from '@angular/common';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Router,
  NavigationEnd,
} from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import Swal from 'sweetalert2';

import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';
import { db } from '../../../firebase.config';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  small?: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, NgClass, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.scss'],
})
export class MainLayout implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  loadingUser = true;
  userMenuOpen = false;
  darkMode = false;
  pageTitle = 'Dashboard';
  isMobileView = false;

  private destroyed = false;
  private accountDisabledHandled = false;
  private routerEventsSub?: Subscription;
  private userDocUnsubscribe?: Unsubscribe;

  adminNavItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/admin/dashboard' },
    { label: 'Manage Accounts', icon: 'pi-users', route: '/admin/manage-accounts', small: true },
    { label: 'Reports', icon: 'pi-chart-bar', route: '/admin/reports' },
  ];

  officerNavItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/officer/dashboard' },
    { label: 'Verification Requests', icon: 'pi-check-square', route: '/officer/verification-requests', small: true },
    { label: 'Alumni Records', icon: 'pi-id-card', route: '/officer/alumni-records' },
    { label: 'Events', icon: 'pi-calendar', route: '/officer/events' },
    { label: 'Announcements', icon: 'pi-megaphone', route: '/officer/announcements' },
    { label: 'Job Postings', icon: 'pi-briefcase', route: '/officer/job-postings', small: true },
  ];

  alumniNavItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/alumni/dashboard' },
    { label: 'Verification Status', icon: 'pi-check-circle', route: '/alumni/verification-status' },
    { label: 'Employment Status', icon: 'pi-briefcase', route: '/alumni/employment-status' },
    { label: 'Announcements', icon: 'pi-megaphone', route: '/alumni/announcements' },
    { label: 'Events', icon: 'pi-calendar', route: '/alumni/events' },
    { label: 'Job Postings', icon: 'pi-briefcase', route: '/alumni/job-postings', small: true },
  ];

  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loadingUser = false;
      return;
    }

    this.restoreDarkMode();
    this.handleInitialSidebarState();
    this.listenToRouteChanges();
    this.initializeLayout();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.routerEventsSub?.unsubscribe();
    this.userDocUnsubscribe?.();
  }

  get navItems(): NavItem[] {
    if (this.currentUser?.role === 'admin') {
      return this.adminNavItems;
    }

    if (this.currentUser?.role === 'alumni') {
      return this.alumniNavItems;
    }

    return this.officerNavItems;
  }

  get currentUserPhotoUrl(): string {
    return (this.currentUser?.photoUrl || '').trim();
  }

  get currentUserInitial(): string {
    const source =
      (this.currentUser?.firstName || '').trim() ||
      (this.currentUser?.fullName || '').trim() ||
      (this.currentUser?.email || '').trim() ||
      'U';

    return source.charAt(0).toUpperCase();
  }

  get currentUserName(): string {
    return (
      this.currentUser?.fullName ||
      [
        this.currentUser?.firstName,
        this.currentUser?.middleName
          ? `${this.currentUser.middleName.charAt(0).toUpperCase()}.`
          : '',
        this.currentUser?.lastName,
        this.currentUser?.suffix,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      this.currentUser?.email ||
      'User'
    );
  }

  get currentUserRole(): string {
    switch (this.currentUser?.role) {
      case 'admin':
        return 'Administrator';
      case 'officer':
        return 'Alumni Officer';
      case 'alumni':
        return 'Alumni';
      default:
        return 'User';
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.userMenuOpen = false;
    this.cdr.detectChanges();
  }

  closeSidebarOnMobile(): void {
    if (this.isMobileView) {
      this.sidebarCollapsed = true;
    }

    this.userMenuOpen = false;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
    this.cdr.detectChanges();
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    this.userMenuOpen = false;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('atms-dark-mode', JSON.stringify(this.darkMode));
    }

    this.cdr.detectChanges();
  }

  goToProfile(): void {
    this.userMenuOpen = false;

    if (this.currentUser?.role === 'admin') {
      this.router.navigate(['/admin/my-profile']);
      return;
    }

    if (this.currentUser?.role === 'officer') {
      this.router.navigate(['/officer/my-profile']);
      return;
    }

    if (this.currentUser?.role === 'alumni') {
      this.router.navigate(['/alumni/my-profile']);
      return;
    }

    this.router.navigate(['/login']);
  }

  async logout(): Promise<void> {
    this.userMenuOpen = false;
    this.destroyed = true;
    this.userDocUnsubscribe?.();

    try {
      await this.authService.logout();
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (!target) return;

    if (!target.closest('.topbar-user') && this.userMenuOpen) {
      this.userMenuOpen = false;
      this.cdr.detectChanges();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.handleInitialSidebarState();
  }

  private async initializeLayout(): Promise<void> {
    this.loadingUser = true;

    try {
      await this.loadCurrentUser();

      if (this.destroyed) return;

      this.setPageTitle(this.router.url);
    } finally {
      if (!this.destroyed) {
        this.loadingUser = false;
        this.cdr.detectChanges();
      }
    }
  }

  private listenToRouteChanges(): void {
    this.routerEventsSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navEnd = event as NavigationEnd;
        this.setPageTitle(navEnd.urlAfterRedirects);
        this.userMenuOpen = false;
        this.cdr.detectChanges();
      });
  }

  private setPageTitle(url: string): void {
    if (url.includes('manage-accounts')) {
      this.pageTitle = 'Manage Accounts';
    } else if (url.includes('reports')) {
      this.pageTitle = 'Reports';
    } else if (url.includes('dashboard')) {
      this.pageTitle = 'Dashboard';
    } else if (url.includes('verification')) {
      this.pageTitle = 'Verification';
    } else if (url.includes('alumni-records')) {
      this.pageTitle = 'Alumni Records';
    } else if (url.includes('announcements')) {
      this.pageTitle = 'Announcements';
    } else if (url.includes('events')) {
      this.pageTitle = 'Events';
    } else if (url.includes('job-postings')) {
      this.pageTitle = 'Job Postings';
    } else if (url.includes('employment')) {
      this.pageTitle = 'Employment Status';
    } else if (url.includes('profile')) {
      this.pageTitle = 'My Profile';
    } else {
      this.pageTitle = 'Dashboard';
    }
  }

  private restoreDarkMode(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const saved = localStorage.getItem('atms-dark-mode');
    this.darkMode = saved ? JSON.parse(saved) : false;
  }

  private handleInitialSidebarState(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isMobileView = window.innerWidth <= 768;
    this.sidebarCollapsed = this.isMobileView;
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const authUser = await this.authService.getAuthState();

      if (this.destroyed) return;

      if (!authUser) {
        this.currentUser = null;
        await this.router.navigate(['/login']);
        return;
      }

      const fallbackUser = {
        id: authUser.uid,
        email: authUser.email ?? '',
        role: this.inferRoleFromUrl(),
        fullName: authUser.displayName ?? '',
        photoUrl: '',
      } as User;

      this.currentUser = fallbackUser;
      this.listenToCurrentUserDocument(authUser.uid, fallbackUser);
    } catch (error) {
      if (this.destroyed) return;

      console.error('Failed to load user:', error);
      this.currentUser = null;
      await this.router.navigate(['/login']);
    }
  }

  private listenToCurrentUserDocument(uid: string, fallbackUser: User): void {
    this.userDocUnsubscribe?.();

    const userRef = doc(db, 'users', uid);

    this.userDocUnsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (this.destroyed) return;

        const latestUser = snapshot.exists()
          ? { id: snapshot.id, ...(snapshot.data() as User) }
          : fallbackUser;

        this.currentUser = latestUser;

        if (latestUser.isActive === false && !this.accountDisabledHandled) {
          void this.handleDisabledAccount(latestUser);
          return;
        }

        this.cdr.detectChanges();
      },
      (error) => {
        if (this.destroyed) return;

        console.error('Failed to listen to current user:', error);
        this.currentUser = fallbackUser;
        this.cdr.detectChanges();
      }
    );
  }

  private async handleDisabledAccount(user: User): Promise<void> {
    if (this.accountDisabledHandled) return;

    this.accountDisabledHandled = true;
    this.userMenuOpen = false;
    this.cdr.detectChanges();

    const disabledReason = ((user as any).disabledReason || '').trim();
    const disabledByName = ((user as any).disabledByName || '').trim();
    const disabledAt = (user as any).disabledAt || null;

    const result = await Swal.fire({
      icon: 'error',
      title: 'Account Disabled',
      html: `
        <p style="margin:0 0 0.75rem;color:#374151;font-size:0.95rem;line-height:1.5;">
          Your account has been disabled by the administrator.
        </p>

        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:0.85rem 1rem;text-align:left;margin-bottom:0.75rem;">
          <p style="margin:0 0 0.35rem;font-size:0.75rem;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:0.05em;">
            Reason / Remarks
          </p>

          <p style="margin:0;font-size:0.9rem;color:#7f1d1d;font-weight:600;line-height:1.5;">
            ${
              disabledReason
                ? this.escapeHtml(disabledReason)
                : 'No reason was provided. Please contact the alumni office for assistance.'
            }
          </p>
        </div>

        ${
          disabledByName || disabledAt
            ? `
              <p style="margin:0 0 0.65rem;color:#6b7280;font-size:0.82rem;line-height:1.4;">
                ${
                  disabledByName
                    ? `Disabled by: <strong>${this.escapeHtml(disabledByName)}</strong><br>`
                    : ''
                }
                ${
                  disabledAt
                    ? `Date disabled: <strong>${this.escapeHtml(this.formatDate(disabledAt))}</strong>`
                    : ''
                }
              </p>
            `
            : ''
        }

        <p style="margin:0;color:#6b7280;font-size:0.85rem;line-height:1.45;">
          You will be logged out for security purposes. You may contact support if you need assistance.
        </p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Contact Support',
      cancelButtonText: 'Log Out',
      confirmButtonColor: '#7c5cff',
      cancelButtonColor: '#6b7280',
      allowOutsideClick: false,
      allowEscapeKey: false,
    });

    this.destroyed = true;
    this.userDocUnsubscribe?.();

    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout after disabled account failed:', error);
    }

    if (result.isConfirmed) {
      await this.router.navigate(['/contact-support'], {
        queryParams: {
          uid: user.id || '',
          name: this.getAccountName(user),
          email: user.email || '',
          reason: disabledReason,
          issue: 'Disabled Account',
          concern: 'Disabled Account',
        },
      });
      return;
    }

    await this.router.navigate(['/login']);
  }

  private inferRoleFromUrl(): 'admin' | 'officer' | 'alumni' {
    const url = this.router.url || '';

    if (url.startsWith('/admin')) {
      return 'admin';
    }

    if (url.startsWith('/alumni')) {
      return 'alumni';
    }

    if (url.startsWith('/officer')) {
      return 'officer';
    }

    return 'officer';
  }

  private getAccountName(user: User): string {
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
      'User'
    );
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatDate(value: any): string {
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
}