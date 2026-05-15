import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Router,
  NavigationEnd,
} from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';

import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';
import { db } from '../../../firebase.config';
import { MyProfile } from '../../../pages/shared/my-profile/my-profile';
import { Settings } from '../../../pages/shared/settings/settings';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  small?: boolean;
}

type AccountSettingsSection = 'account_info' | 'password_security';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MyProfile,
    Settings,
  ],
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

  profileModalRendered = false;
  profileModalOpen = false;
  activeAccountSettingsSection: AccountSettingsSection = 'account_info';

  private destroyed = false;
  private routerEventsSub?: Subscription;
  private userDocUnsubscribe?: Unsubscribe;
  private profileModalCloseTimer?: ReturnType<typeof setTimeout>;

  adminNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'ti ti-home',
      route: '/admin/dashboard',
    },
    {
      label: 'Manage Accounts',
      icon: 'ti ti-users-group',
      route: '/admin/manage-accounts',
      small: true,
    },
    {
      label: 'Reports',
      icon: 'ti ti-chart-bar',
      route: '/admin/reports',
    },
  ];

  officerNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'ti ti-home',
      route: '/officer/dashboard',
    },
    {
      label: 'Verification Requests',
      icon: 'ti ti-shield-check',
      route: '/officer/verification-requests',
      small: true,
    },
    {
      label: 'Alumni Records',
      icon: 'ti ti-id-badge-2',
      route: '/officer/alumni-records',
    },
    {
      label: 'Events',
      icon: 'ti ti-calendar-event',
      route: '/officer/events',
    },
    {
      label: 'Announcements',
      icon: 'ti ti-speakerphone',
      route: '/officer/announcements',
    },
    {
      label: 'Job Postings',
      icon: 'ti ti-briefcase-2',
      route: '/officer/job-postings',
      small: true,
    },
  ];

  alumniNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'ti ti-home',
      route: '/alumni/dashboard',
    },
    {
      label: 'Verification Status',
      icon: 'ti ti-shield-check',
      route: '/alumni/verification-status',
    },
    {
      label: 'Employment Status',
      icon: 'ti ti-briefcase-2',
      route: '/alumni/employment-status',
    },
    {
      label: 'Announcements',
      icon: 'ti ti-speakerphone',
      route: '/alumni/announcements',
    },
    {
      label: 'Events',
      icon: 'ti ti-calendar-event',
      route: '/alumni/events',
    },
    {
      label: 'Job Postings',
      icon: 'ti ti-briefcase-2',
      route: '/alumni/job-postings',
      small: true,
    },
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

    if (this.profileModalCloseTimer) {
      clearTimeout(this.profileModalCloseTimer);
    }
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

  setAccountSettingsSection(section: AccountSettingsSection): void {
    this.activeAccountSettingsSection = section;
    this.cdr.detectChanges();
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
    this.openProfileModal();
  }

  openProfileModal(): void {
    this.userMenuOpen = false;
    this.activeAccountSettingsSection = 'account_info';

    if (this.profileModalCloseTimer) {
      clearTimeout(this.profileModalCloseTimer);
      this.profileModalCloseTimer = undefined;
    }

    this.profileModalRendered = true;
    this.cdr.detectChanges();

    requestAnimationFrame(() => {
      if (this.destroyed) return;

      this.profileModalOpen = true;
      this.cdr.detectChanges();
    });
  }

  closeProfileModal(): void {
    if (!this.profileModalRendered) return;

    this.profileModalOpen = false;
    this.cdr.detectChanges();

    if (this.profileModalCloseTimer) {
      clearTimeout(this.profileModalCloseTimer);
    }

    this.profileModalCloseTimer = setTimeout(() => {
      if (this.destroyed) return;

      this.profileModalRendered = false;
      this.profileModalCloseTimer = undefined;
      this.cdr.detectChanges();
    }, 220);
  }

  onProfileModalPanelClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  async logout(): Promise<void> {
    this.userMenuOpen = false;
    this.closeProfileModal();
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

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.profileModalOpen) {
      this.closeProfileModal();
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
}