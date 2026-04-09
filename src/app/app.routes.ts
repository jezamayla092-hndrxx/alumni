import { Routes } from '@angular/router';
import { Login } from './pages/auth/login/login';
import { Signup } from './pages/auth/signup/signup';
import { MainLayout } from './components/layout/main-layout/main-layout';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: Login },
  { path: 'signup', component: Signup },

  // temporary route for layout testing
  { path: 'layout-test', component: MainLayout },

  { path: '**', redirectTo: 'login' },
];