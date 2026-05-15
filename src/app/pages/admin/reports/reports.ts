import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { collection, getDocs } from 'firebase/firestore';

import { db } from '../../../firebase.config';
import { User } from '../../../models/user.model';

interface RawRecord {
  id?: string;
  [key: string]: any;
}

interface ReportRow {
  label: string;
  count: number;
  percent: number;
}

interface RecentActivityItem {
  title: string;
  type: string;
  status: string;
  date: any;
}

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss'],
})
export class Reports implements OnInit {
  loading = false;
  loadError = '';

  users: User[] = [];
  verificationRequests: RawRecord[] = [];
  jobPostings: RawRecord[] = [];
  events: RawRecord[] = [];
  announcements: RawRecord[] = [];
  employmentRecords: RawRecord[] = [];

  selectedReport = 'Overview';

  readonly reportTabs = [
    'Overview',
    'Accounts',
    'Alumni',
    'Verification',
    'Employment',
    'Content',
  ];

  roleRows: ReportRow[] = [];
  accountStatusRows: ReportRow[] = [];
  programRows: ReportRow[] = [];
  collegeRows: ReportRow[] = [];
  verificationRows: ReportRow[] = [];
  employmentRows: ReportRow[] = [];
  jobRows: ReportRow[] = [];
  eventRows: ReportRow[] = [];
  announcementRows: ReportRow[] = [];
  recentActivity: RecentActivityItem[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }

  async loadReports(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    this.cdr.detectChanges();

    try {
      const [
        users,
        verificationRequests,
        jobPostings,
        events,
        announcements,
        employmentRecords,
      ] = await Promise.all([
        this.safeReadCollection('users'),
        this.safeReadCollection('verification_requests'),
        this.safeReadCollection('jobPostings'),
        this.safeReadCollection('events'),
        this.safeReadCollection('announcements'),
        this.safeReadCollection('employmentStatus'),
      ]);

      this.users = users as User[];
      this.verificationRequests = verificationRequests;
      this.jobPostings = jobPostings;
      this.events = events;
      this.announcements = announcements;
      this.employmentRecords = employmentRecords;

      this.buildReports();

      this.loading = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to load reports:', error);
      this.loadError = 'Failed to load reports.';
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private async safeReadCollection(collectionName: string): Promise<RawRecord[]> {
    try {
      const snapshot = await getDocs(collection(db, collectionName));

      return snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...(docItem.data() || {}),
      }));
    } catch (error) {
      console.warn(`Unable to read ${collectionName}:`, error);
      return [];
    }
  }

  private buildReports(): void {
    this.roleRows = this.buildRows(
      [
        { label: 'Admins', count: this.adminCount },
        { label: 'Officers', count: this.officerCount },
        { label: 'Alumni', count: this.alumniCount },
      ],
      this.totalAccounts
    );

    this.accountStatusRows = this.buildRows(
      [
        { label: 'Active Accounts', count: this.activeAccounts },
        { label: 'Disabled Accounts', count: this.disabledAccounts },
      ],
      this.totalAccounts
    );

    this.programRows = this.buildGroupedRows(
      this.alumniUsers,
      (user) => user.program || 'No Program',
      this.alumniCount
    );

    this.collegeRows = this.buildGroupedRows(
      this.alumniUsers,
      (user) => this.getCollegeFromProgram(user.program || ''),
      this.alumniCount
    );

    this.verificationRows = this.buildRows(
      [
        { label: 'Verified', count: this.verifiedAlumni },
        { label: 'Pending', count: this.pendingAlumni },
        { label: 'Under Review', count: this.underReviewAlumni },
        { label: 'Rejected', count: this.rejectedAlumni },
        { label: 'Not Set', count: this.notSetVerification },
      ],
      this.alumniCount
    );

    this.employmentRows = this.buildGroupedRows(
      this.alumniUsers,
      (user) => this.getResolvedEmploymentStatus(user),
      this.alumniCount
    );

    this.jobRows = this.buildGroupedRows(
      this.jobPostings,
      (job) => job['status'] || 'Not Set',
      this.jobPostings.length
    );

    this.eventRows = this.buildGroupedRows(
      this.events,
      (event) => this.getEventStatus(event),
      this.events.length
    );

    this.announcementRows = this.buildGroupedRows(
      this.announcements,
      (announcement) => announcement['status'] || 'Not Set',
      this.announcements.length
    );

    this.recentActivity = this.buildRecentActivity();
  }

  private buildRows(items: { label: string; count: number }[], total: number): ReportRow[] {
    return items.map((item) => ({
      label: item.label,
      count: item.count,
      percent: this.getPercent(item.count, total),
    }));
  }

  private buildGroupedRows<T>(
    records: T[],
    getLabel: (item: T) => string,
    total: number
  ): ReportRow[] {
    const groups = new Map<string, number>();

    records.forEach((record) => {
      const label = this.cleanLabel(getLabel(record));
      groups.set(label, (groups.get(label) || 0) + 1);
    });

    return Array.from(groups.entries())
      .map(([label, count]) => ({
        label,
        count,
        percent: this.getPercent(count, total),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  private buildRecentActivity(): RecentActivityItem[] {
    const activities: RecentActivityItem[] = [];

    this.users.forEach((user) => {
      activities.push({
        title: this.getAccountName(user),
        type: 'Account',
        status: user.role || 'user',
        date: user.createdAt || user.updatedAt,
      });
    });

    this.verificationRequests.forEach((request) => {
      activities.push({
        title:
          request['fullName'] ||
          request['name'] ||
          request['email'] ||
          'Verification Request',
        type: 'Verification',
        status: request['status'] || 'pending',
        date: request['createdAt'] || request['submittedAt'] || request['updatedAt'],
      });
    });

    this.employmentRecords.forEach((record) => {
      activities.push({
        title:
          record['fullName'] ||
          record['alumniName'] ||
          record['name'] ||
          record['email'] ||
          'Employment Status Update',
        type: 'Employment',
        status: this.getEmploymentStatusFromRecord(record),
        date: record['updatedAt'] || record['createdAt'] || record['submittedAt'],
      });
    });

    this.jobPostings.forEach((job) => {
      activities.push({
        title: job['jobTitle'] || job['title'] || 'Job Posting',
        type: 'Job Posting',
        status: job['status'] || 'not set',
        date: job['createdAt'] || job['updatedAt'],
      });
    });

    this.events.forEach((event) => {
      activities.push({
        title: event['eventTitle'] || event['title'] || event['eventName'] || 'Event',
        type: 'Event',
        status: this.getEventStatus(event),
        date: event['createdAt'] || event['eventDate'] || event['date'] || event['updatedAt'],
      });
    });

    this.announcements.forEach((announcement) => {
      activities.push({
        title: announcement['title'] || 'Announcement',
        type: 'Announcement',
        status: announcement['status'] || 'not set',
        date: announcement['createdAt'] || announcement['updatedAt'],
      });
    });

    return activities
      .filter((item) => !!item.date)
      .sort((a, b) => this.getDateValue(b.date) - this.getDateValue(a.date))
      .slice(0, 8);
  }

  selectReport(tab: string): void {
    this.zone.run(() => {
      this.selectedReport = tab;
      this.cdr.detectChanges();
    });
  }

  getReportDescription(tab: string): string {
    switch (tab) {
      case 'Overview':
        return 'General report summary for accounts and recent system activity.';
      case 'Accounts':
        return 'Account role distribution and account status reporting.';
      case 'Alumni':
        return 'Alumni distribution by academic program and college.';
      case 'Verification':
        return 'Verification status breakdown for alumni accounts.';
      case 'Employment':
        return 'Employment tracking summary based on alumni updates.';
      case 'Content':
        return 'Reports for job postings, events, and announcements.';
      default:
        return 'System report view.';
    }
  }

  exportReport(): void {
    const rows = this.getExportRows();

    if (rows.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = Object.keys(rows[0]);

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => this.escapeCsvValue(row[header]))
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const fileName = `ATMS_${this.selectedReport}_Report_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
  }

  private getExportRows(): Record<string, any>[] {
    switch (this.selectedReport) {
      case 'Overview':
        return [
          { Report: 'Total Accounts', Count: this.totalAccounts },
          { Report: 'Total Alumni', Count: this.alumniCount },
          { Report: 'Verified Alumni', Count: this.verifiedAlumni },
          { Report: 'Pending Alumni', Count: this.pendingAlumni },
          { Report: 'Under Review Alumni', Count: this.underReviewAlumni },
          { Report: 'Rejected Alumni', Count: this.rejectedAlumni },
          { Report: 'Employed Alumni', Count: this.employedCount },
          { Report: 'Self-Employed Alumni', Count: this.selfEmployedCount },
          { Report: 'Unemployed Alumni', Count: this.unemployedCount },
          { Report: 'Further Studies Alumni', Count: this.furtherStudiesCount },
          { Report: 'No Employment Update', Count: this.noEmploymentUpdateCount },
          { Report: 'Active Jobs', Count: this.activeJobs },
          { Report: 'Published Announcements', Count: this.publishedAnnouncements },
          { Report: 'Upcoming Events', Count: this.upcomingEvents },
          { Report: 'Completed Events', Count: this.completedEvents },
          { Report: 'Disabled Accounts', Count: this.disabledAccounts },
        ];

      case 'Accounts':
        return [
          ...this.roleRows.map((row) => ({
            Category: 'Role',
            Label: row.label,
            Count: row.count,
            Percent: `${row.percent}%`,
          })),
          ...this.accountStatusRows.map((row) => ({
            Category: 'Account Status',
            Label: row.label,
            Count: row.count,
            Percent: `${row.percent}%`,
          })),
        ];

      case 'Alumni':
        return [
          ...this.programRows.map((row) => ({
            Category: 'Program',
            Label: row.label,
            Count: row.count,
            Percent: `${row.percent}%`,
          })),
          ...this.collegeRows.map((row) => ({
            Category: 'College',
            Label: row.label,
            Count: row.count,
            Percent: `${row.percent}%`,
          })),
        ];

      case 'Verification':
        return this.verificationRows.map((row) => ({
          Category: 'Verification Status',
          Label: row.label,
          Count: row.count,
          Percent: `${row.percent}%`,
        }));

      case 'Employment':
        return this.employmentRows.map((row) => ({
          Category: 'Employment Status',
          Label: row.label,
          Count: row.count,
          Percent: `${row.percent}%`,
        }));

      case 'Content':
        return [
          ...this.jobRows.map((row) => ({
            Category: 'Job Postings',
            Label: row.label,
            Count: row.count,
            Percent: `${row.percent}%`,
          })),
          ...this.eventRows.map((row) => ({
            Category: 'Events',
            Label: row.label,
            Count: row.count,
            Percent: `${row.percent}%`,
          })),
          ...this.announcementRows.map((row) => ({
            Category: 'Announcements',
            Label: row.label,
            Count: row.count,
            Percent: `${row.percent}%`,
          })),
        ];

      default:
        return [];
    }
  }

  private escapeCsvValue(value: any): string {
    if (value === null || value === undefined) return '';

    const stringValue = String(value).replace(/"/g, '""');

    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n')
    ) {
      return `"${stringValue}"`;
    }

    return stringValue;
  }

  get totalAccounts(): number {
    return this.users.length;
  }

  get adminCount(): number {
    return this.users.filter((user) => user.role === 'admin').length;
  }

  get officerCount(): number {
    return this.users.filter((user) => user.role === 'officer').length;
  }

  get alumniCount(): number {
    return this.users.filter((user) => user.role === 'alumni').length;
  }

  get alumniUsers(): User[] {
    return this.users.filter((user) => user.role === 'alumni');
  }

  get activeAccounts(): number {
    return this.users.filter((user) => user.isActive !== false).length;
  }

  get disabledAccounts(): number {
    return this.users.filter((user) => user.isActive === false).length;
  }

  get verifiedAlumni(): number {
    return this.alumniUsers.filter((user) => {
      return this.getVerificationStatusValue(user) === 'verified';
    }).length;
  }

  get pendingAlumni(): number {
    return this.alumniUsers.filter((user) => {
      return this.getVerificationStatusValue(user) === 'pending';
    }).length;
  }

  get underReviewAlumni(): number {
    return this.alumniUsers.filter((user) => {
      return this.getVerificationStatusValue(user) === 'under_review';
    }).length;
  }

  get rejectedAlumni(): number {
    return this.alumniUsers.filter((user) => {
      return this.getVerificationStatusValue(user) === 'rejected';
    }).length;
  }

  get notSetVerification(): number {
    return this.alumniUsers.filter((user) => {
      return !this.getVerificationStatusValue(user);
    }).length;
  }

  get employedCount(): number {
    return this.alumniUsers.filter((user) => {
      return this.getResolvedEmploymentStatus(user) === 'Employed';
    }).length;
  }

  get selfEmployedCount(): number {
    return this.alumniUsers.filter((user) => {
      return this.getResolvedEmploymentStatus(user) === 'Self-Employed';
    }).length;
  }

  get unemployedCount(): number {
    return this.alumniUsers.filter((user) => {
      return this.getResolvedEmploymentStatus(user) === 'Unemployed';
    }).length;
  }

  get furtherStudiesCount(): number {
    return this.alumniUsers.filter((user) => {
      return this.getResolvedEmploymentStatus(user) === 'Further Studies';
    }).length;
  }

  get noEmploymentUpdateCount(): number {
    return this.alumniUsers.filter((user) => {
      return this.getResolvedEmploymentStatus(user) === 'No Update';
    }).length;
  }

  get publishedAnnouncements(): number {
    return this.announcements.filter((item) => {
      return String(item['status'] || '').toLowerCase() === 'published';
    }).length;
  }

  get activeJobs(): number {
    return this.jobPostings.filter((item) => {
      return String(item['status'] || '').toLowerCase() === 'active';
    }).length;
  }

  get upcomingEvents(): number {
    return this.events.filter((event) => this.isUpcomingEvent(event)).length;
  }

  get completedEvents(): number {
    return this.events.filter((event) => this.isCompletedEvent(event)).length;
  }

  getAccountName(user: User): string {
    return (
      user.fullName ||
      [
        user.firstName,
        user.middleName ? `${user.middleName.charAt(0).toUpperCase()}.` : '',
        user.lastName,
        user.suffix,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      user.email ||
      'Unnamed User'
    );
  }

  getVerificationStatusValue(user: User): string {
    const rawStatus = (user.verificationStatus || user.status || '').toLowerCase().trim();

    if (user.isVerified || rawStatus === 'verified' || rawStatus === 'approved') {
      return 'verified';
    }

    if (rawStatus === 'pending') return 'pending';
    if (rawStatus === 'under_review') return 'under_review';
    if (rawStatus === 'rejected') return 'rejected';

    return '';
  }

  private getResolvedEmploymentStatus(user: User): string {
    const record = this.getLatestEmploymentRecordForUser(user);

    const recordStatus = record ? this.getEmploymentStatusFromRecord(record) : '';
    const userStatus = this.normalizeEmploymentStatus(user.employmentStatus || '');

    return recordStatus || userStatus || 'No Update';
  }

  private getLatestEmploymentRecordForUser(user: User): RawRecord | null {
    const userId = String(user.id || '').trim();
    const email = String(user.email || '').trim().toLowerCase();
    const studentId = String(user.studentId || '').trim();
    const alumniId = String(user.alumniId || '').trim();

    const matches = this.employmentRecords.filter((record) => {
      const recordId = String(record['id'] || '').trim();
      const recordUserUid = String(record['userUid'] || record['uid'] || record['userId'] || record['alumniUid'] || '').trim();
      const recordEmail = String(record['email'] || record['alumniEmail'] || '').trim().toLowerCase();
      const recordStudentId = String(record['studentId'] || record['universityId'] || '').trim();
      const recordAlumniId = String(record['alumniId'] || '').trim();

      return (
        (!!userId && (recordId === userId || recordUserUid === userId)) ||
        (!!email && recordEmail === email) ||
        (!!studentId && recordStudentId === studentId) ||
        (!!alumniId && recordAlumniId === alumniId)
      );
    });

    if (matches.length === 0) return null;

    return matches.sort((a, b) => {
      const bTime = this.getDateValue(b['updatedAt'] || b['createdAt'] || b['submittedAt']);
      const aTime = this.getDateValue(a['updatedAt'] || a['createdAt'] || a['submittedAt']);
      return bTime - aTime;
    })[0];
  }

  private getEmploymentStatusFromRecord(record: RawRecord): string {
    return this.normalizeEmploymentStatus(
      record['employmentStatus'] ||
        record['currentEmploymentStatus'] ||
        record['statusType'] ||
        record['workStatus'] ||
        record['status'] ||
        ''
    );
  }

  private normalizeEmploymentStatus(value: any): string {
    const raw = String(value || '').trim();

    if (!raw) return '';

    const normalized = raw.toLowerCase().replace(/[_-]/g, ' ');

    if (normalized.includes('self employed') || normalized.includes('self-employed')) {
      return 'Self-Employed';
    }

    if (normalized.includes('unemployed')) {
      return 'Unemployed';
    }

    if (
      normalized.includes('further studies') ||
      normalized.includes('further study') ||
      normalized.includes('studying') ||
      normalized.includes('student')
    ) {
      return 'Further Studies';
    }

    if (normalized.includes('employed')) {
      return 'Employed';
    }

    if (normalized.includes('no update') || normalized.includes('not set')) {
      return 'No Update';
    }

    return this.cleanLabel(raw);
  }

  getEventStatus(event: RawRecord): string {
    const rawStatus = String(event['status'] || '').trim();

    if (rawStatus) {
      return this.cleanLabel(rawStatus);
    }

    if (this.isUpcomingEvent(event)) return 'Upcoming';
    if (this.isCompletedEvent(event)) return 'Completed';

    return 'Not Set';
  }

  private isUpcomingEvent(event: RawRecord): boolean {
    const status = String(event['status'] || '').toLowerCase();

    if (
      status === 'upcoming' ||
      status === 'active' ||
      status === 'published' ||
      status === 'open'
    ) {
      return true;
    }

    if (
      status === 'completed' ||
      status === 'cancelled' ||
      status === 'canceled' ||
      status === 'archived'
    ) {
      return false;
    }

    const rawDate = event['eventDate'] || event['date'] || event['startDate'];
    const eventDate = this.getDateValue(rawDate);

    if (!eventDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return eventDate >= today.getTime();
  }

  private isCompletedEvent(event: RawRecord): boolean {
    const status = String(event['status'] || '').toLowerCase();

    if (status === 'completed') return true;

    if (
      status === 'cancelled' ||
      status === 'canceled' ||
      status === 'archived'
    ) {
      return false;
    }

    const rawDate = event['eventDate'] || event['date'] || event['startDate'];
    const eventDate = this.getDateValue(rawDate);

    if (!eventDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return eventDate < today.getTime();
  }

  getCollegeFromProgram(program: string): string {
    const normalized = program.trim().toLowerCase();

    if (
      normalized === 'information technology' ||
      normalized === 'technology communication management'
    ) {
      return 'College of Information Technology and Computing';
    }

    if (normalized === 'electro-mechanical technology') {
      return 'College of Technology';
    }

    return 'No College Set';
  }

  getRowClass(label: string): string {
    const value = label.toLowerCase();

    if (
      value.includes('rejected') ||
      value.includes('disabled') ||
      value.includes('archived') ||
      value.includes('closed') ||
      value.includes('cancelled') ||
      value === 'unemployed'
    ) {
      return 'danger';
    }

    if (
      value.includes('pending') ||
      value.includes('review') ||
      value.includes('draft') ||
      value.includes('further')
    ) {
      return 'warning';
    }

    if (
      value.includes('verified') ||
      value.includes('active') ||
      value.includes('published') ||
      value.includes('upcoming') ||
      value === 'employed' ||
      value === 'self-employed'
    ) {
      return 'good';
    }

    return 'neutral';
  }

  cleanLabel(value: string): string {
    if (!value) return 'Not Set';

    const label = value.toString().trim();

    if (!label) return 'Not Set';

    if (label === 'under_review') return 'Under Review';

    return label
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  getPercent(count: number, total: number): number {
    if (!total || total <= 0) return 0;

    return Math.round((count / total) * 100);
  }

  formatDate(value: any): string {
    if (!value) return '—';

    const rawValue =
      typeof value === 'string'
        ? value
        : value?.toDate?.() ?? value;

    const date = new Date(rawValue);

    if (isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  trackByRow(index: number, row: ReportRow): string {
    return `${row.label}-${index}`;
  }

  trackByActivity(index: number, item: RecentActivityItem): string {
    return `${item.type}-${item.title}-${index}`;
  }

  private getDateValue(value: any): number {
    if (!value) return 0;

    const rawValue =
      typeof value === 'string'
        ? value
        : value?.toDate?.() ?? value;

    const date = new Date(rawValue);

    return isNaN(date.getTime()) ? 0 : date.getTime();
  }
}