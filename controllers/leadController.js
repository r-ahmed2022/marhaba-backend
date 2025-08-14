// controllers/leadController.js
import leadSchema from '../models/Lead.js';
import { leadSchema as zodLeadSchema } from '../validators/leadValidator.js';
import { sendEmail } from '../utils/sendEmail.js';

export const saveLead = async (req, res) => {
  // Validate incoming data
  const result = zodLeadSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }

  const { email } = result.data;
  const firm = req.firm || 'marhabaconnect';

  // Base URL for logo and links
  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? firm === 'cuttingedge'
        ? 'https://cuttingedge-enterprises.in'
        : 'https://marhabaconnect.ae'
      : 'http://localhost:5000';

  const logoFile = firm === 'cuttingedge' ? 'CuttingEdgeEnterprise_logo.png' : 'marhaba_logo.png';
  const logoUrl = `$/static/${logoFile}`;
   console.log(logoUrl);
  try {
    // Register model on the specific DB connection
    const Lead = req.db.model('Lead', leadSchema);

    const existingLead = await Lead.findOne({ email });
    if (existingLead) {
      return res.status(409).json({ message: 'Email already submitted!' });
    }

    const lead = new Lead({ email });
    await lead.save();

    const website = firm === 'cuttingedge'
      ? 'https://cuttingedge-enterprises.in'
      : 'https://marhabaconnect.ae';

    await sendEmail({
      to: email,
      subject: 'Thank You for Your Interest',
      html: `
      <div style="max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;padding:20px;font-family:sans-serif;background:#f9f9f9;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="${logoUrl}" alt="${firm} logo" style="height:100px;" />
        </div>
        <p style="font-size:15px;line-height:1.6;color:#444;">
          Thank You for Your Interest – We’re Excited to Welcome You Soon!
        </p>
        <div style="background:#fff;border-radius:6px;padding:15px;margin:20px 0;border-left:5px solid #00a896;">
          <p style="color:#333;">
           Thank you for showing interest in our launch! We’re thrilled to have you with us.
          </p>
        </div>
        <p style="font-size:14px;color:#666;">
          In the meantime, feel free to explore more at 
          <a href="${website}" target="_blank" rel="noopener noreferrer" style="color:#00a896;text-decoration:none;">${website}</a>
        </p>
        <hr style="margin:30px 0;" />
        <p style="font-size:13px;color:#aaa;text-align:center;">
          © ${firm === 'cuttingedge' ? 'Cutting Edge Enterprises' : 'Marhaba Connect'}. All rights reserved. ${new Date().getFullYear()}
        </p>
      </div>
      `,
      templateName: 'thankyou', firm
    });

    res.status(200).json({ message: 'Email saved and thank-you sent!' });
  } catch (error) {
    console.error('❌ Error saving lead or sending email:', error.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};