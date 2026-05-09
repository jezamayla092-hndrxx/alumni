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
    { label: 'Dashboard', icon: 'pi-home', route: '/officer/dashboard' },
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
    { label: 'Events', icon: 'pi-calendar', route: '/officer/events' },
    {
      label: 'Announcements',
      icon: 'pi-megaphone',
      route: '/officer/announcements',
    },
    {
      label: 'Job Postings',
      icon: 'pi-briefcase',
      route: '/officer/job-postings',
      small: true,
    },
  ];

  alumniNavItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/alumni/dashboard' },
    {
      label: 'Verification Status',
      icon: 'pi-check-circle',
      route: '/alumni/verification-status',
    },
    {
      label: 'Employment Status',
      icon: 'pi-briefcase',
      route: '/alumni/employment-status',
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
    return this.currentUser?.role === 'alumni'
      ? this.alumniNavItems
      : this.officerNavItems;
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
      case 'admin': return 'Administrator';
      case 'officer': return 'Alumni Officer';
      case 'alumni': return 'Alumni';
      default: return 'User';
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.userMenuOpen = false;
    this.cdr.detectChanges();
  }

  closeSidebarOnMobile(): void {
    if (this.isMobileView) this.sidebarCollapsed = true;
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
    if (this.currentUser?.role === 'alumni') {
      this.router.navigate(['/alumni/my-profile']); return;
    }
    if (this.currentUser?.role === 'officer' || this.currentUser?.role === 'admin') {
      this.router.navigate(['/officer/my-profile']); return;
    }
    this.router.navigate(['/login']);
  }

  goToSettings(): void {
    this.userMenuOpen = false;
    if (this.currentUser?.role === 'alumni') {
      this.router.navigate(['/alumni/settings']); return;
    }
    if (this.currentUser?.role === 'officer' || this.currentUser?.role === 'admin') {
      this.router.navigate(['/officer/settings']); return;
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
        this.cdr.detectChanges();
      });
  }

  private setPageTitle(url: string): void {
    if (url.includes('dashboard')) this.pageTitle = 'Dashboard';
    else if (url.includes('verification')) this.pageTitle = 'Verification Requests';
    else if (url.includes('alumni-records')) this.pageTitle = 'Alumni Records';
    else if (url.includes('events')) this.pageTitle = 'Events';
    else if (url.includes('announcements')) this.pageTitle = 'Announcements';
    else if (url.includes('job-postings')) this.pageTitle = 'Job Postings';
    else if (url.includes('profile')) this.pageTitle = 'My Profile';
    else if (url.includes('settings')) this.pageTitle = 'Settings';
    else if (url.includes('employment')) this.pageTitle = 'Employment Status';
    else this.pageTitle = 'Dashboard';
  }

  private restoreDarkMode(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const savedDarkMode = localStorage.getItem('atms-dark-mode');
    this.darkMode = savedDarkMode ? JSON.parse(savedDarkMode) : false;
  }

  private handleInitialSidebarState(): void {
    if (!isPlatformBrowser(this.platformId)) return;
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
      this.currentUser = userDoc || ({
        uid: authUser.uid,
        email: authUser.email ?? '',
        role: this.inferRoleFromUrl(),
        fullName: authUser.displayName ?? '',
      } as User);
    } catch (error) {
      console.error('Failed to load user:', error);
      this.currentUser = null;
      await this.router.navigate(['/login']);
    }
  }

  private inferRoleFromUrl(): 'admin' | 'officer' | 'alumni' {
    const url = this.router.url || '';
    if (url.startsWith('/alumni')) return 'alumni';
    if (url.startsWith('/officer')) return 'officer';
    return 'officer';
  }
}