import Lead from '../models/Lead.js';
import { leadSchema } from '../validators/leadValidator.js';
import { sendThankYouEmail } from '../utils/sendEmail.js';
import { sendEmail } from '../utils/sendEmail.js';

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

    await sendEmail({
    to: email,
    subject: 'Thank You for Your Interest',
    html: `
      <h2>We're thrilled you're with us!</h2>
      <p>Thanks for signing up to be notified about Marhaba Connect. We’ll keep you updated as we move closer to launch.</p>
      <p style="margin-top:1rem;">Warm wishes, <br /><strong>Team Marhaba Connect</strong></p>
    `,
    templateName: 'thankyou'
    });

    res.status(200).json({ message: 'Email saved and thank-you sent!' });
  } catch (error) {
    console.error('❌ Error saving lead or sending email:', error.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};