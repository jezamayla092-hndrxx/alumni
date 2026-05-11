import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { UsersService } from '../services/users.service';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const usersService = inject(UsersService);
  const router = inject(Router);

  const authUser = await authService.waitForAuthReady();

  if (!authUser) {
    return router.createUrlTree(['/login']);
  }

  const userDoc = await usersService.getUserById(authUser.uid);

  if (!userDoc) {
    await authService.logout();
    return router.createUrlTree(['/login']);
  }

  if (userDoc.isActive === false) {
    await authService.logout();
    return router.createUrlTree(['/login']);
  }

  if (userDoc.role !== 'admin') {
    if (userDoc.role === 'officer') {
      return router.createUrlTree(['/officer/dashboard']);
    }

    if (userDoc.role === 'alumni') {
      return router.createUrlTree(['/alumni/dashboard']);
    }

    return router.createUrlTree(['/login']);
  }

  return true;
};