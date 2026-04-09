import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  /**
   * CRITICAL FIX:
   * Firebase browser auth persistence is not available during SSR/server rendering.
   * So do not block the route on the server.
   *
   * Let the browser hydrate first, then the app can evaluate auth properly.
   */
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const authService = inject(AuthService);
  const user = await authService.getAuthState();

  if (user) {
    return true;
  }

  return router.createUrlTree(['/login']);
};