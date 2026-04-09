import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  HostListener,
} from '@angular/core';
import { CommonModule, NgClass, isPlatformBrowser } from '@angular/common';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Router,
} from '@angular/router';

import { AuthService } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { User } from '../../../models/user.model';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  small?: boolean;
  disabled?: boolean;
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
export class MainLayout implements OnInit {
  sidebarCollapsed = false;
  loadingUser = true;
  userMenuOpen = false;
  darkMode = false;

  /**
   * TEMPORARY:
   * Keep disabled until those pages/routes are ready.
   */
  navItems: NavItem[] = [
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
      disabled: true,
    },
    {
      label: 'Alumni Records',
      icon: 'pi-id-card',
      route: '/officer/alumni-records',
      disabled: true,
    },
    {
      label: 'Tracer Study',
      icon: 'pi-chart-line',
      route: '/officer/tracer-study',
      disabled: true,
    },
    {
      label: 'Job Postings',
      icon: 'pi-briefcase',
      route: '/officer/job-postings',
      disabled: true,
    },
    {
      label: 'Events',
      icon: 'pi-calendar',
      route: '/officer/events',
      disabled: true,
    },
    {
      label: 'Announcements',
      icon: 'pi-megaphone',
      route: '/officer/announcements',
      disabled: true,
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

  async ngOnInit(): Promise<void> {
    /**
     * CRITICAL FIX:
     * Do not run Firebase browser-auth user loading on the server.
     * This prevents false redirects during refresh when SSR/server files exist.
     */
    if (!isPlatformBrowser(this.platformId)) {
      this.loadingUser = false;
      return;
    }

    await this.loadCurrentUser();
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
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.userMenuOpen = false;
  }

  closeSidebarOnMobile(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
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
    /**
     * TEMPORARY:
     * Layout-only dark mode.
     * Not persisted yet to localStorage, Firestore, or user settings.
     */
    this.darkMode = !this.darkMode;
    this.userMenuOpen = false;
  }

  /**
   * TEMPORARY:
   * Placeholder until profile route/page exists.
   */
  goToProfile(): void {
    this.userMenuOpen = false;
  }

  /**
   * TEMPORARY:
   * Placeholder until settings route/page exists.
   */
  goToSettings(): void {
    this.userMenuOpen = false;
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

  private async loadCurrentUser(): Promise<void> {
    this.loadingUser = true;

    try {
      const authUser = await this.authService.getAuthState();

      /**
       * IMPORTANT FIX:
       * Do not immediately force logout here.
       * The guard should handle access control.
       * Only redirect if browser-side auth is clearly missing.
       */
      if (!authUser) {
        this.currentUser = null;
        await this.router.navigate(['/login']);
        return;
      }

      const userDoc = await this.usersService.getUserById(authUser.uid);

      /**
       * STRUCTURAL WARNING:
       * Your app depends on both Firebase Auth and Firestore profile.
       * If the Firestore user doc is missing, the session exists but
       * the app has no role/profile context.
       */
      if (!userDoc) {
        await this.authService.logout();
        await this.router.navigate(['/login']);
        return;
      }

      this.currentUser = userDoc;
    } catch (error) {
      console.error('Failed to load current user:', error);
      this.currentUser = null;
      await this.router.navigate(['/login']);
    } finally {
      this.loadingUser = false;

      /**
       * IMPORTANT FIX:
       * Force template refresh after Firebase auth/user load.
       * Prevents "name appears only after second click".
       */
      this.cdr.detectChanges();
    }
  }
}