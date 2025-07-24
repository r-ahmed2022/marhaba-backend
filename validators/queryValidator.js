import { z } from 'zod';

export const querySchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email(),
  phone: z.string().min(7).max(15), // customize per region
  message: z.string().min(5, { message: 'Query must be more descriptive' })
});