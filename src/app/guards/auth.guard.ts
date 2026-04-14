import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const authService = inject(AuthService);

  try {
    const user = await authService.getAuthState();

    if (user) {
      return true;
    }

    return router.createUrlTree(['/login'], {
      queryParams: { redirect: state.url },
    });
  } catch (error) {
    console.error('authGuard error:', error);
    return router.createUrlTree(['/login']);
  }
};