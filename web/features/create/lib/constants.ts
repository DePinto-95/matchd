export const STEP_LABELS = ['Sport', 'Details', 'Date & Time', 'Settings'] as const;

export const LAST_STEP = STEP_LABELS.length - 1;

/** True only in local development, where the dev-only shortcuts are shown. */
export const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Selectable match durations in minutes.
 *
 * The 1-minute option exists so a match can be pushed into the past
 * immediately while testing the rating and result flows (MD-09), so it is
 * development-only.
 */
export const DURATIONS = IS_DEV ? [1, 45, 60, 75, 90, 120] : [45, 60, 75, 90, 120];

export const DEFAULT_DURATION = 60;
