import { Injectable } from '@angular/core';

export interface AlumniIdDetails {
  alumniId: string;
  alumniIdIssuedYear: number;
  alumniIdSequence: number;
  campus: string;
  prefix: string;
}

@Injectable({
  providedIn: 'root',
})
export class AlumniIdService {
  readonly campus = 'USTP Villanueva Campus';
  readonly prefix = 'USTP-VIL-AL';

  buildAlumniId(year: number, sequence: number): string {
    return `${this.prefix}-${year}-${String(sequence).padStart(6, '0')}`;
  }

  isValidAlumniId(value?: string | null): boolean {
    return !!value?.trim().startsWith(`${this.prefix}-`);
  }
}