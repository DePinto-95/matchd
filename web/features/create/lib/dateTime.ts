/**
 * The wizard collects date as DD/MM/YYYY and time as HH:MM (24h), both as
 * free text that auto-formats while typing. These helpers turn that back into
 * a Date and check it is a time a match could actually be played at.
 */

/** Parses the two inputs, returning null if they do not form a real date. */
export const parseDateTimeInputs = (date: string, time: string): Date | null => {
  const dateParts = date.split('/');
  const timeParts = time.split(':');
  if (dateParts.length !== 3 || timeParts.length !== 2) return null;

  const [day, month, year] = dateParts.map(Number);
  const [hours, minutes] = timeParts.map(Number);
  const parsed = new Date(year, month - 1, day, hours, minutes);

  // Rejects rolled-over dates like 31/02, which Date would silently accept.
  if (isNaN(parsed.getTime()) || parsed.getDate() !== day || parsed.getMonth() !== month - 1) {
    return null;
  }
  return parsed;
};

/**
 * Validates the schedule step. Returns an error message, or null when valid:
 * matches must be in the future and no more than a year ahead.
 */
export const validateSchedule = (date: string, time: string): string | null => {
  if (!date || !time) return 'Please enter a date and time';
  if (date.length !== 10) return 'Enter date as DD/MM/YYYY';
  if (time.length !== 5) return 'Enter time as HH:MM';

  const [hours, minutes] = time.split(':').map(Number);
  if (hours > 23 || minutes > 59) return 'Invalid time';

  const scheduled = parseDateTimeInputs(date, time);
  if (!scheduled) return 'Invalid date or time';
  if (scheduled <= new Date()) return 'Match must be scheduled in the future';

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (scheduled > oneYearFromNow) return 'Match cannot be more than 1 year in the future';

  return null;
};

/** Formats a Date into the DD/MM/YYYY and HH:MM pair the inputs expect. */
export const toDateTimeInputs = (date: Date) => ({
  date: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`,
  time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
});
