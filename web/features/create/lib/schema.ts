import { z } from 'zod';

/** Only the free-text fields go through react-hook-form; the rest are steppers. */
export const createMatchSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(60),
  location_name: z.string().min(3, 'Please enter the match location'),
  description: z.string().optional(),
});

export type CreateMatchFormData = z.infer<typeof createMatchSchema>;
