import { querySchema } from '../validators/queryValidator.js';
import Query from '../models/Query.js';

export const saveQuery = async (req, res) => {
  const result = querySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }

  try {
    const query = new Query(result.data);
    await query.save();
    res.status(200).json({ message: 'Query submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save query' });
  }
};