import { z } from 'zod';

export const querySchema = z.object({
  fullname: z.string().min(1, { message: 'Name is required' }),
  queryemail: z.string().email(),
  message: z.string().min(5, { message: 'Query must be more descriptive' })
});