import mongoose from 'mongoose';

const querySchema = new mongoose.Schema({
  fullname: String,
  queryemail: { type: String, required: true },
  message: String
});

const Query = mongoose.model('Query', querySchema);
export default Query;