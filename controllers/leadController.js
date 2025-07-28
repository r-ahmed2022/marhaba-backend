import Lead from '../models/Lead.js';
import { leadSchema } from '../validators/leadValidator.js';
import { sendThankYouEmail } from '../utils/sendEmail.js';

export const saveLead = async (req, res) => {
  const result = leadSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }

  const email = result.data.email;

  try {
    const existingLead = await Lead.findOne({ email });
    if (existingLead) {
      return res.status(409).json({ message: 'Email already submitted!' });
    }

    const lead = new Lead({ email });
    await lead.save();

    await sendThankYouEmail(email, req.locale);

    res.status(200).json({ message: 'Email saved and thank-you sent!' });
  } catch (error) {
    console.error('❌ Error saving lead or sending email:', error.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};