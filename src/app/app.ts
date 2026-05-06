import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // Import RouterOutlet for routing

// Import Angular services or any necessary dependencies
import { AuthService } from './services/auth.service';
import { UsersService } from './services/users.service';
import { VerificationService } from './services/verification.service';

@Component({
  selector: 'app-root',
  standalone: true, // Use standalone components if Angular 14+ feature is enabled
  imports: [RouterOutlet], // Include RouterOutlet for Angular routing
  templateUrl: './app.html', // Template for the app
  styleUrls: ['./app.scss'], // Add any relevant styles
})
export class App {
  // Define your title as a reactive signal to be reactive in the template
  protected readonly title = signal('ATMS'); // ATMS stands for Alumni Tracking and Management System

  // Inject services needed for the application
  constructor(
    private authService: AuthService, // AuthService handles authentication
    private usersService: UsersService, // UsersService to handle user-related data
    private verificationService: VerificationService // VerificationService to handle verification requests
  ) {}

  // Add necessary methods to handle routing, authentication, etc.

  // You can implement lifecycle hooks like ngOnInit if necessary
  ngOnInit(): void {
    // Example of initializing logic
    this.authService.checkAuthStatus();
  }
}