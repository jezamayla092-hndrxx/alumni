import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type VerificationStatus = 'pending' | 'under-review' | 'verified';
type EmploymentStatus =
  | 'Employed'
  | 'Self-Employed'
  | 'Unemployed'
  | 'Further Studies';
type JobType = 'Full-time' | 'Part-time' | 'Contract';

interface SummaryCard {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  iconClass: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
}

interface VerificationPreview {
  id: string;
  name: string;
  program: string;
  year: number;
  status: VerificationStatus;
}

interface AlumniRecordPreview {
  id: string;
  fullName: string;
  program: string;
  yearGraduated: number;
  employmentStatus: EmploymentStatus;
}

interface JobPostingPreview {
  id: string;
  title: string;
  company: string;
  location: string;
  postedDate: string;
  type: JobType;
}

interface EventAnnouncementPreview {
  id: string;
  type: 'event' | 'announcement';
  title: string;
  dateLabel: string;
  timeLabel?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard {
  /**
   * TEMPORARY MOCK DATA
   * Replace later with service-driven data.
   */
  summaryCards: SummaryCard[] = [
    {
      title: 'Pending Verifications',
      value: '24',
      subtitle: '+3 today',
      icon: 'pi pi-check-circle',
      iconClass: 'icon-violet',
      trend: '+12%',
      trendDirection: 'up',
    },
    {
      title: 'Total Alumni Records',
      value: '3,847',
      subtitle: '+12 this week',
      icon: 'pi pi-users',
      iconClass: 'icon-green',
      trend: '+8%',
      trendDirection: 'up',
    },
    {
      title: 'Tracer Responses',
      value: '1,206',
      subtitle: '82% response rate',
      icon: 'pi pi-chart-bar',
      iconClass: 'icon-purple',
      trend: '+5%',
      trendDirection: 'up',
    },
    {
      title: 'Active Job Posts',
      value: '18',
      subtitle: '5 expiring soon',
      icon: 'pi pi-briefcase',
      iconClass: 'icon-amber',
      trend: '-2%',
      trendDirection: 'down',
    },
    {
      title: 'Upcoming Events',
      value: '7',
      subtitle: 'Next: Apr 15',
      icon: 'pi pi-calendar',
      iconClass: 'icon-blue',
      trend: 'This month',
      trendDirection: 'neutral',
    },
    {
      title: 'Announcements Posted',
      value: '42',
      subtitle: '3 this month',
      icon: 'pi pi-megaphone',
      iconClass: 'icon-pink',
      trend: '+10%',
      trendDirection: 'up',
    },
  ];

  verificationRequests: VerificationPreview[] = [
    {
      id: 'VR-001',
      name: 'Maria Santos',
      program: 'BS Information Technology',
      year: 2023,
      status: 'pending',
    },
    {
      id: 'VR-002',
      name: 'Juan Dela Cruz',
      program: 'BS Computer Science',
      year: 2022,
      status: 'pending',
    },
    {
      id: 'VR-003',
      name: 'Ana Reyes',
      program: 'BS Education',
      year: 2024,
      status: 'under-review',
    },
    {
      id: 'VR-004',
      name: 'Carlos Garcia',
      program: 'BS Nursing',
      year: 2023,
      status: 'pending',
    },
    {
      id: 'VR-005',
      name: 'Lea Mendoza',
      program: 'BS Accountancy',
      year: 2021,
      status: 'pending',
    },
  ];

  recentAlumniRecords: AlumniRecordPreview[] = [
    {
      id: 'AR-001',
      fullName: 'Sophia Villanueva',
      program: 'BS Computer Science',
      yearGraduated: 2024,
      employmentStatus: 'Employed',
    },
    {
      id: 'AR-002',
      fullName: 'Marco Tan',
      program: 'BS Information Technology',
      yearGraduated: 2023,
      employmentStatus: 'Self-Employed',
    },
    {
      id: 'AR-003',
      fullName: 'Patricia Lim',
      program: 'BS Education',
      yearGraduated: 2024,
      employmentStatus: 'Unemployed',
    },
    {
      id: 'AR-004',
      fullName: 'Rafael Cruz',
      program: 'BS Nursing',
      yearGraduated: 2022,
      employmentStatus: 'Employed',
    },
    {
      id: 'AR-005',
      fullName: 'Jenny Aquino',
      program: 'BS Accountancy',
      yearGraduated: 2023,
      employmentStatus: 'Further Studies',
    },
  ];

  recentJobPostings: JobPostingPreview[] = [
    {
      id: 'JP-001',
      title: 'Software Developer',
      company: 'TechCorp PH',
      location: 'Manila',
      postedDate: 'Apr 5, 2026',
      type: 'Full-time',
    },
    {
      id: 'JP-002',
      title: 'Registered Nurse',
      company: "St. Luke's Medical",
      location: 'Quezon City',
      postedDate: 'Apr 3, 2026',
      type: 'Full-time',
    },
    {
      id: 'JP-003',
      title: 'Marketing Associate',
      company: 'Globe Telecom',
      location: 'Taguig',
      postedDate: 'Apr 1, 2026',
      type: 'Contract',
    },
  ];

  eventsAnnouncements: EventAnnouncementPreview[] = [
    {
      id: 'EA-001',
      type: 'event',
      title: 'Alumni Homecoming 2026',
      dateLabel: 'Apr 15, 2026',
      timeLabel: '9:00 AM',
    },
    {
      id: 'EA-002',
      type: 'event',
      title: 'Career Fair: IT & Engineering',
      dateLabel: 'Apr 22, 2026',
      timeLabel: '10:00 AM',
    },
    {
      id: 'EA-003',
      type: 'announcement',
      title: 'New scholarship fund now available for alumni dependents',
      dateLabel: 'Apr 7, 2026',
    },
    {
      id: 'EA-004',
      type: 'announcement',
      title: 'Updated alumni ID processing guidelines',
      dateLabel: 'Apr 3, 2026',
    },
  ];

  tracerSegments = [
    { label: 'Employed', value: 68, colorClass: 'seg-employed' },
    { label: 'Self-Employed', value: 12, colorClass: 'seg-self-employed' },
    { label: 'Unemployed', value: 11, colorClass: 'seg-unemployed' },
    { label: 'Further Studies', value: 9, colorClass: 'seg-further-studies' },
  ];

  monthlyResponseMonths = ['Jan', 'Feb', 'Mar', 'Apr'];

  getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  getVerificationStatusLabel(status: VerificationStatus): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'under-review':
        return 'Under Review';
      case 'verified':
        return 'Verified';
      default:
        return status;
    }
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  trackByIndex(index: number): number {
    return index;
  }
}