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
   const baseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://marhaba-backend.onrender.com'
      : 'http://localhost:5000';

      const logoUrl = `${baseUrl}/static/marhaba_logo.png`;

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
      <div style="max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;padding:20px;font-family:sans-serif;background:#f9f9f9;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="${logoUrl}" alt="Marhaba Connect" style="height:100px;" />
        </div>
        <p style="font-size:15px;line-height:1.6;color:#444;">
          Thank You for Your Interest – We’re Excited to Welcome You Soon!
        </p>
        <div style="background:#fff;border-radius:6px;padding:15px;margin:20px 0;border-left:5px solid #00a896;">
          <p style="color:#333;">
           Thank you for showing interest in our launch! We’re thrilled to have you with us.

           Something exciting is coming your way soon — and you’ll be among the first to know when we go live.

          Stay tuned!
          </p>
        </div>
        <p style="font-size:14px;color:#666;">
          In the meantime, feel free to explore more at 
          <a href="https://marhabaconnect.ae" target="_blank" rel="noopener noreferrer" 
          style="color:#00a896;text-decoration:none;">https://marhabaconnect.ae</a>

        </p>
        <hr style="margin:30px 0;" />
        <p style="font-size:13px;color:#aaa;text-align:center;">
          © Marhaba Connect. All rights reserved. 2025
        </p>
      </div>
      `,
    templateName: 'thankyou'
    });

    res.status(200).json({ message: 'Email saved and thank-you sent!' });
  } catch (error) {
    console.error('❌ Error saving lead or sending email:', error.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};