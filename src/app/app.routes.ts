import { Routes } from '@angular/router';

import { Login } from './pages/auth/login/login';
import { Signup } from './pages/auth/signup/signup';
import { MainLayout } from './components/layout/main-layout/main-layout';
import { MyProfile } from './pages/shared/my-profile/my-profile';
import { ContactSupport } from './pages/contact-support/contact-support';

import { authGuard } from './guards/auth.guard';
import { officerGuard } from './guards/officer.guard';
import { alumniGuard } from './guards/alumni.guard';
import { adminGuard } from './guards/admin.guard';

// Admin pages
import { AdminDashboard } from './pages/admin/dashboard/dashboard';
import { ManageAccounts } from './pages/admin/manage-accounts/manage-accounts';
import { Reports } from './pages/admin/reports/reports';

// Officer pages
import { Dashboard as OfficerDashboard } from './pages/officer/dashboard/dashboard';
import { VerificationRequestsComponent } from './pages/officer/verification-requests/verification-requests';
import { AlumniRecords } from './pages/officer/alumni-records/alumni-records';
import { AlumniRecordDetails } from './pages/officer/alumni-records/alumni-record-details/alumni-record-details';
import { Events } from './pages/officer/events/events';
import { Announcements } from './pages/officer/announcements/announcements';
import { JobPostings } from './pages/officer/job-postings/job-postings';

// Alumni pages
import { Dashboard as AlumniDashboard } from './pages/alumni/dashboard/dashboard';
import { VerificationStatus } from './pages/alumni/verification-status/verification-status';
import { EmploymentStatusComponent } from './pages/alumni/employment-status/employment-status';
import { AlumniEvents } from './pages/alumni/events/events';
import { AlumniAnnouncements } from './pages/alumni/announcements/announcements';
import { AlumniJobPostings } from './pages/alumni/job-postings/job-postings';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: Login },
  { path: 'signup', component: Signup },

  // Public page for disabled users or users who need help before logging in
  { path: 'contact-support', component: ContactSupport },

  {
    path: 'admin',
    component: MainLayout,
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboard },
      { path: 'manage-accounts', component: ManageAccounts },
      { path: 'reports', component: Reports },
      { path: 'my-profile', component: MyProfile },
    ],
  },

  {
    path: 'officer',
    component: MainLayout,
    canActivate: [authGuard, officerGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: OfficerDashboard },
      { path: 'verification-requests', component: VerificationRequestsComponent },
      { path: 'alumni-records', component: AlumniRecords },
      { path: 'alumni-records/:id', component: AlumniRecordDetails },
      { path: 'events', component: Events },
      { path: 'announcements', component: Announcements },
      { path: 'job-postings', component: JobPostings },
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
      { path: 'events', component: AlumniEvents },
      { path: 'announcements', component: AlumniAnnouncements },
      { path: 'job-postings', component: AlumniJobPostings },
      { path: 'my-profile', component: MyProfile },
    ],
  },

  { path: '**', redirectTo: 'login' },
];