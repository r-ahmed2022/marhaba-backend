import { z } from 'zod';

export const leadSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' })
});