import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { UsersService } from '../services/users.service';

export const officerGuard: CanActivateFn = async () => {
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
    // Force refresh token so Firestore recognizes auth immediately
    await firebaseUser.getIdToken(true);

    const userDoc = await usersService.getUserById(firebaseUser.uid);

    if (userDoc?.role === 'officer' || userDoc?.role === 'admin') {
      return true;
    }

    if (userDoc?.role === 'alumni') {
      return router.createUrlTree(['/alumni/dashboard']);
    }

    return router.createUrlTree(['/login']);
  } catch (error) {
    console.error('Officer guard error:', error);
    // Don't kick to login on Firestore error, stay on current route
    return router.createUrlTree(['/alumni/dashboard']);
  }
};