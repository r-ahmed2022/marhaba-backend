import { queryValidator } from '../validators/queryValidator.js';
import { sendEmail } from '../utils/sendEmail.js';
import Query from '../models/Query.js';

export const saveQuery = async (req, res) => {
  const result = queryValidator.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }

  const { fullname, queryemail, message, timestamp } = result.data;
   const finalTimestamp = timestamp || new Date(); 
      const existingQuery = await Query.findOne({ queryemail, message });

    if (existingQuery) {
      return res.status(409).json({
        error: 'This query has already been received. Thank you!',
        receivedAt: existingQuery.timestamp
      });
    }



  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://marhaba-backend.onrender.com'
      : 'http://localhost:5000';

  const logoUrl = `${baseUrl}/static/marhaba_logo.png`;
  console.log(logoUrl);


  const html = `
    <h2>New Business Query Received</h2>
    <p><strong>Name:</strong> ${fullname}</p>
    <p><strong>Email:</strong> ${queryemail}</p>
    <p><strong>Query:</strong><br />${message}</p>
  `;

  try {
    const query = new Query({ fullname, queryemail, message, finalTimestamp });
    await query.save();

    await sendEmail({
      to: queryemail,
      subject: 'We’ve received your query – Marhaba Connect',
      html: `
      <div style="max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;padding:20px;font-family:sans-serif;background:#f9f9f9;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="${logoUrl}" alt="Marhaba Connect" style="height:60px;" />
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
          <a href="#" style="color:#00a896;text-decoration:none;">marhabaconnect.ae</a>.
        </p>
        <hr style="margin:30px 0;" />
        <p style="font-size:13px;color:#aaa;text-align:center;">
          © ${finalTimestamp } Marhaba Connect. All rights reserved.
        </p>
      </div>
      `,
      templateName: 'query-response',
    });

    res.status(200).json({ message: 'Query submitted successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate query detected. This query has already been submitted.',
      });
    }

    console.error('Failed to save query:', error);
    res.status(500).json({ error: 'Failed to save query' });
  }
};