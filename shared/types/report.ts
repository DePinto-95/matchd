import { ReportReason } from '../enums';

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: ReportReason;
  details: string | null;
  created_at: string;
}
