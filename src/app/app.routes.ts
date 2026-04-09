import { Routes } from '@angular/router';
import { Login } from './pages/auth/login/login';
import { Signup } from './pages/auth/signup/signup';
import { MainLayout } from './components/layout/main-layout/main-layout';
import { Dashboard } from './pages/officer/dashboard/dashboard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: Login },
  { path: 'signup', component: Signup },

  /**
   * Officer routes
   * TEMP WARNING:
   * This only protects "logged in".
   * It does NOT yet enforce role === 'officer'.
   * Add role guard later once Firestore profile-based role loading is ready.
   */
  {
    path: 'officer',
    component: MainLayout,
    canActivate: [authGuard],
    children: [{ path: 'dashboard', component: Dashboard }],
  },

  { path: '**', redirectTo: 'login' },
];