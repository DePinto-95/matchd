import type { SupabaseClient } from '@supabase/supabase-js';
import { ReportReason } from '../enums';
import { MutationResult } from './types';

/** Postgres unique-violation. user_reports has a constraint preventing duplicates. */
export const DUPLICATE_REPORT_CODE = '23505';

export const createReportService = (supabase: SupabaseClient) => ({
  /**
   * Files a report. There is no SELECT policy on user_reports, so a report can
   * be written but never read back by the client.
   */
  create: async (
    reporterId: string,
    reportedId: string,
    reason: ReportReason,
    details?: string
  ): Promise<MutationResult> => {
    const { error } = await supabase.from('user_reports').insert({
      reporter_id: reporterId,
      reported_id: reportedId,
      reason,
      details: details ?? null,
    });
    return { error };
  },
});

export type ReportService = ReturnType<typeof createReportService>;
