import { queryValidator } from '../validators/queryValidator.js';
import { sendEmail } from '../utils/sendEmail.js';
import querySchema from '../models/Query.js';

export const saveQuery = async (req, res) => {
  const result = queryValidator.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }

  const { fullname, queryemail, message, timestamp } = result.data;
  const finalTimestamp = timestamp || new Date();
  const normalizedMessage = message.trim().toLowerCase();
  const firm = req.firm || 'marhaba';

  try {
    // Use correct DB connection for this request
    const Query = req.db.model('Query', querySchema);

    const existingQuery = await Query.findOne({
      queryemail,
      message: { $regex: `^${normalizedMessage}$`, $options: 'i' }
    });

    if (existingQuery) {
      return res.status(409).json({
        error: 'This query has already been received. Thank you!',
        receivedAt: existingQuery.timestamp
      });
    }

   /* const baseUrl =
      process.env.NODE_ENV === 'production'
        ? firm === 'cuttingedge'
          ? 'https://cuttingedge-enterprises.in'
          : 'https://marhabaconnect.ae'
        : 'http://localhost:5000'; */
    
    const baseUrl = req.hostname;
    const logoFile = firm === 'cuttingedge' ? 'CuttingEdgeEnterprise_logo.png' : 'marhaba_logo.png';
    const logoUrl = `${baseUrl}/static/${logoFile}`;

    const website = firm === 'cuttingedge'
      ? 'https://cuttingedge-enterprises.in'
      : 'https://marhabaconnect.ae';

    const html = `
      <div style="max-width:700px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;padding:20px;font-family:sans-serif;background:#f9f9f9;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="${logoUrl}" alt="${firm} logo" style="height:150px;" />
        </div>
        <h2 style="color:#2c3e50;">Thank you for contacting us, ${fullname}!</h2>
        <p style="font-size:15px;line-height:1.6;color:#444;">
          We’ve received your query and our team will get back to you shortly.
        </p>
        <div style="background:#fff;border-radius:6px;padding:15px;margin:20px 0;border-left:5px solid #00a896;">
          <p style="margin:0;"><strong>Your Message:</strong></p>
          <p style="color:#333;">${message}</p>
        </div>
        <p style="font-size:14px;color:#666;">
          In the meantime, feel free to explore more at 
          <a href="${website}" target="_blank" rel="noopener noreferrer" style="color:#00a896;text-decoration:none;">${website}</a>
        </p>
        <hr style="margin:30px 0;" />
        <p style="font-size:13px;color:#aaa;text-align:center;">
          © ${finalTimestamp.getFullYear()} ${firm === 'cuttingedge' ? 'Cutting Edge Enterprises' : 'Marhaba Connect'}. All rights reserved.
        </p>
      </div>
    `;

    const query = new Query({ fullname, queryemail, message, timestamp: finalTimestamp });
    await query.save();

    await sendEmail({
      to: queryemail,
      subject: `We’ve received your query – ${firm === 'cuttingedge' ? 'Cutting Edge Enterprises' : 'Marhaba Connect'}`,
      html,
      templateName: 'query-response',
      firm
    });

    res.status(200).json({ message: `Query submitted successfully for ${firm}` });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate query detected. This query has already been submitted.',
      });
    }

    console.error(`❌ Failed to save query for ${firm}:`, error);
    res.status(500).json({ error: 'Failed to save query' });
  }
};