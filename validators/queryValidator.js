import { z } from 'zod';

export  const queryValidator = z.object({
  fullname: z.string().min(1, { message: 'Name is required' }),
  queryemail: z.string().email({ message: 'Valid email is required' }),
  message: z.string().min(5, { message: 'Query must be more descriptive' }),
  timestamp: z.preprocess(
    (val) => (val ? new Date(val) : undefined),
    z.date().optional()
  )
});