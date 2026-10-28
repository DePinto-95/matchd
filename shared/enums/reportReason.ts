/**
 * Reason selected when reporting another user.
 * DB: `user_reports.reason` (TEXT + CHECK).
 */
export enum ReportReason {
  SpamScam = 'spam_scam',
  InappropriateBehavior = 'inappropriate_behavior',
  FakeProfile = 'fake_profile',
  Other = 'other',
}
