import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { UsersService } from '../services/users.service';

export const alumniGuard: CanActivateFn = async () => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const authService = inject(AuthService);
  const usersService = inject(UsersService);

  const firebaseUser = await authService.getAuthState();

  if (!firebaseUser) {
    return router.createUrlTree(['/login']);
  }

  try {
    const userDoc = await usersService.getUserById(firebaseUser.uid);

    if (userDoc?.role === 'alumni') {
      return true;
    }

    if (userDoc?.role === 'officer' || userDoc?.role === 'admin') {
      return router.createUrlTree(['/officer/dashboard']);
    }

    return router.createUrlTree(['/login']);
  } catch (error) {
    console.error('Alumni guard error:', error);
    return router.createUrlTree(['/login']);
  }
};