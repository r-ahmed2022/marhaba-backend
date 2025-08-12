// utils/sendEmail.js
import nodemailer from 'nodemailer';
import EmailLog from '../models/EmailLog.js';
import dotenv from 'dotenv';
dotenv.config();

// Create two separate transporters: one for Marhaba, one for Cutting Edge
const marhabaTransporter = nodemailer.createTransport({
  host: 'smtp.ionos.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER_MARHABA || process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS_MARHABA || process.env.EMAIL_PASS
  }
});

// Dummy SMTP provider for Cutting Edge (replace with real when available)
 const cuttingEdgeTransporter = nodemailer.createTransport({
  host: 'host7.cloudindianserver.com', 
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER_CUTTINGEDGE,
    pass: process.env.EMAIL_PASS_CUTTINGEDGE
  }
}); 

marhabaTransporter.verify((err) => {
  if (err) console.error('❌ Marhaba SMTP connection failed:', err.message);
  else console.log('✅ Marhaba SMTP is ready to send');
});

cuttingEdgeTransporter.verify((err) => {
  if (err) console.error('⚠️ Cutting Edge SMTP connection not verified:', err.message);
  else console.log('✅ Cutting Edge SMTP is ready to send');
}); 

export const sendEmail = async ({ to, subject, html, templateName, firm }) => {
  let fromDisplay = process.env.EMAIL_FROM_NAME || 'Notification';
  let transporter;

  if (firm === 'cuttingedge') {
    fromDisplay = 'Cutting Edge Enterprises';
    transporter = cuttingEdgeTransporter;
  } else {
    fromDisplay = 'Marhaba Connect';
    transporter = marhabaTransporter;
  }

  const mailOptions = {
    from: `"${fromDisplay}" <${firm === 'cuttingedge' ? (process.env.EMAIL_USER_CUTTINGEDGE) : (process.env.EMAIL_USER_MARHABA || process.env.EMAIL_USER)}>`,
    to,
    subject,
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} via ${firm}`);

    try {
      await new EmailLog({
        recipient: to,
        subject,
        templateName
      }).save();
    } catch (e) {
      // Ignore if EmailLog model is not registered in current DB
    }
  } catch (error) {
    console.error(`❌ Error sending email via ${firm}:`, error.message);
  }
};