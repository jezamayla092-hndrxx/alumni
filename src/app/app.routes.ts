import { Routes } from '@angular/router';
import { Login } from './pages/auth/login/login';
import { Signup } from './pages/auth/signup/signup';
import { MainLayout } from './components/layout/main-layout/main-layout';
import { Dashboard } from './pages/officer/dashboard/dashboard';
import { authGuard } from './guards/auth.guard';
import { officerGuard } from './guards/officer.guard';
import { alumniGuard } from './guards/alumni.guard';
import { MyProfile } from './pages/shared/my-profile/my-profile';

// Officer pages
import { VerificationRequestsComponent } from './pages/officer/verification-requests/verification-requests';
import { AlumniRecords } from './pages/officer/alumni-records/alumni-records';
import { Events } from './pages/officer/events/events';
import { Announcements } from './pages/officer/announcements/announcements';

// Alumni pages
import { Dashboard as AlumniDashboard } from './pages/alumni/dashboard/dashboard';
import { VerificationStatus } from './pages/alumni/verification-status/verification-status';
import { EmploymentStatusComponent } from './pages/alumni/employment-status/employment-status';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: Login },
  { path: 'signup', component: Signup },

  {
    path: 'officer',
    component: MainLayout,
    canActivate: [authGuard, officerGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      {
        path: 'verification-requests',
        component: VerificationRequestsComponent,
      },
      { path: 'alumni-records', component: AlumniRecords },
      { path: 'events', component: Events },
      { path: 'announcements', component: Announcements },
      { path: 'my-profile', component: MyProfile },
    ],
  },

  {
    path: 'alumni',
    component: MainLayout,
    canActivate: [authGuard, alumniGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AlumniDashboard },
      { path: 'verification-status', component: VerificationStatus },
      { path: 'employment-status', component: EmploymentStatusComponent },
      { path: 'my-profile', component: MyProfile },
    ],
  },

  {
    path: 'admin',
    redirectTo: 'officer/dashboard',
    pathMatch: 'prefix',
  },

  { path: '**', redirectTo: 'login' },
];