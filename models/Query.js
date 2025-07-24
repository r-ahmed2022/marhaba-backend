import mongoose from 'mongoose';

const querySchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true },
  phone: String,
  message: String
});

const Query = mongoose.model('Query', querySchema);
export default Query;