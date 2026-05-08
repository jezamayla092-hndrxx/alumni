import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './services/auth.service';
import { UsersService } from './services/users.service';
import { VerificationService } from './services/verification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  protected readonly title = signal('ATMS');

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private verificationService: VerificationService
  ) {}

  ngOnInit(): void {
    // Auth state now handled automatically by AuthService constructor
  }
}