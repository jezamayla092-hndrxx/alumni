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

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { User } from '../../../models/user.model';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  small?: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
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

  private routerEventsSub?: Subscription;

  officerNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'pi-home',
      route: '/officer/dashboard',
    },
    {
      label: 'Verification Requests',
      icon: 'pi-check-square',
      route: '/officer/verification-requests',
      small: true,
    },
    {
      label: 'Alumni Records',
      icon: 'pi-id-card',
      route: '/officer/alumni-records',
    },
    {
      label: 'Job Postings',
      icon: 'pi-briefcase',
      route: '/officer/job-postings',
    },
    {
      label: 'Events',
      icon: 'pi-calendar',
      route: '/officer/events',
    },
    {
      label: 'Announcements',
      icon: 'pi-megaphone',
      route: '/officer/announcements',
    },
  ];

  alumniNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'pi-home',
      route: '/alumni/dashboard',
    },
    {
      label: 'Verification Status',
      icon: 'pi-check-circle',
      route: '/alumni/verification-status',
    },
    {
      label: 'Alumni Directory',
      icon: 'pi-users',
      route: '/alumni/alumni-directory',
    },
    {
      label: 'Employment Status',
      icon: 'pi-briefcase',
      route: '/alumni/employment-status',
    },
    {
      label: 'Job Opportunities',
      icon: 'pi-building',
      route: '/alumni/job-opportunities',
    },
    {
      label: 'Events & Announcements',
      icon: 'pi-calendar',
      route: '/alumni/events-announcements',
    },
  ];

  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
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
    this.routerEventsSub?.unsubscribe();
  }

  get navItems(): NavItem[] {
    if (this.currentUser?.role === 'alumni') {
      return this.alumniNavItems;
    }

    return this.officerNavItems;
  }

  get currentUserInitial(): string {
    const source =
      this.currentUser?.fullName ||
      this.currentUser?.firstName ||
      this.currentUser?.email ||
      'U';

    return source.charAt(0).toUpperCase();
  }

  get currentUserName(): string {
    return (
      this.currentUser?.fullName ||
      [this.currentUser?.firstName, this.currentUser?.lastName]
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
    if (this.isMobileView) {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }

    this.userMenuOpen = false;
  }

  closeSidebarOnMobile(): void {
    if (this.isMobileView) {
      this.sidebarCollapsed = true;
    }

    this.userMenuOpen = false;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    this.userMenuOpen = false;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('atms-dark-mode', JSON.stringify(this.darkMode));
    }
  }

  goToProfile(): void {
    this.userMenuOpen = false;

    if (this.currentUser?.role === 'alumni') {
      this.router.navigate(['/alumni/my-profile']);
      return;
    }

    if (
      this.currentUser?.role === 'officer' ||
      this.currentUser?.role === 'admin'
    ) {
      this.router.navigate(['/officer/my-profile']);
      return;
    }

    this.router.navigate(['/login']);
  }

  goToSettings(): void {
    this.userMenuOpen = false;

    if (this.currentUser?.role === 'alumni') {
      this.router.navigate(['/alumni/settings']);
      return;
    }

    if (
      this.currentUser?.role === 'officer' ||
      this.currentUser?.role === 'admin'
    ) {
      this.router.navigate(['/officer/settings']);
      return;
    }

    this.router.navigate(['/login']);
  }

  async logout(): Promise<void> {
    this.userMenuOpen = false;

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

    if (!target) {
      return;
    }

    const clickedInsideUserMenu = !!target.closest('.topbar-user');

    if (!clickedInsideUserMenu && this.userMenuOpen) {
      this.userMenuOpen = false;
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
      this.setPageTitle(this.router.url);
    } finally {
      this.loadingUser = false;
      this.cdr.detectChanges();
    }
  }

  private listenToRouteChanges(): void {
    this.routerEventsSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navEnd = event as NavigationEnd;
        this.setPageTitle(navEnd.urlAfterRedirects);
        this.userMenuOpen = false;
      });
  }

  private setPageTitle(url: string): void {
    if (url.includes('/officer/dashboard')) {
      this.pageTitle = 'Dashboard';
    } else if (url.includes('/officer/verification-requests')) {
      this.pageTitle = 'Verification Requests';
    } else if (url.includes('/officer/alumni-records')) {
      this.pageTitle = 'Alumni Records';
    } else if (url.includes('/officer/job-postings')) {
      this.pageTitle = 'Job Postings';
    } else if (url.includes('/officer/events')) {
      this.pageTitle = 'Events';
    } else if (url.includes('/officer/announcements')) {
      this.pageTitle = 'Announcements';
    } else if (url.includes('/officer/my-profile')) {
      this.pageTitle = 'My Profile';
    } else if (url.includes('/officer/settings')) {
      this.pageTitle = 'Settings';
    } else if (url.includes('/alumni/dashboard')) {
      this.pageTitle = 'Dashboard';
    } else if (url.includes('/alumni/verification-status')) {
      this.pageTitle = 'Verification Status';
    } else if (url.includes('/alumni/alumni-directory')) {
      this.pageTitle = 'Alumni Directory';
    } else if (url.includes('/alumni/employment-status')) {
      this.pageTitle = 'Employment Status';
    } else if (url.includes('/alumni/job-opportunities')) {
      this.pageTitle = 'Job Opportunities';
    } else if (url.includes('/alumni/events-announcements')) {
      this.pageTitle = 'Events & Announcements';
    } else if (url.includes('/alumni/my-profile')) {
      this.pageTitle = 'My Profile';
    } else if (url.includes('/alumni/settings')) {
      this.pageTitle = 'Settings';
    } else {
      this.pageTitle = 'Dashboard';
    }
  }

  private restoreDarkMode(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const savedDarkMode = localStorage.getItem('atms-dark-mode');
    this.darkMode = savedDarkMode ? JSON.parse(savedDarkMode) : false;
  }

  private handleInitialSidebarState(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isMobileView = window.innerWidth <= 768;
    this.sidebarCollapsed = this.isMobileView;
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const authUser = await this.authService.getAuthState();

      if (!authUser) {
        this.currentUser = null;
        await this.router.navigate(['/login']);
        return;
      }

      const userDoc = await this.usersService.getUserById(authUser.uid);

      if (userDoc) {
        this.currentUser = userDoc;
        return;
      }

      this.currentUser = {
        uid: authUser.uid,
        email: authUser.email ?? '',
        role: this.inferRoleFromUrl(),
        firstName: '',
        lastName: '',
        fullName: authUser.displayName ?? '',
      } as User;
    } catch (error) {
      console.error('Failed to load current user:', error);
      this.currentUser = null;
      await this.router.navigate(['/login']);
    }
  }

  private inferRoleFromUrl(): 'admin' | 'officer' | 'alumni' {
    const url = this.router.url || '';

    if (url.startsWith('/alumni')) {
      return 'alumni';
    }

    if (url.startsWith('/officer')) {
      return 'officer';
    }

    return 'officer';
  }
}