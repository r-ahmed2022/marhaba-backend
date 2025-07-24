import nodemailer from 'nodemailer';
import EmailLog from '../models/EmailLog.js';
import { emailContent } from './emailContent.js';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendThankYouEmail = async (recipientEmail, locale = 'en') => {
  const { subject, body } = emailContent[locale] || emailContent.en;

  const mailOptions = {
    from: `"Marhaba Connect" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: 'Thank You for Your Interest',
    html: `
      <h2>We're thrilled you're with us!</h2>
      <p>Thanks for signing up to be notified about Marhaba Connect. We’ll keep you updated as we move closer to launch.</p>
      <p style="margin-top:1rem;">Warm wishes, <br /><strong>Team Marhaba Connect</strong></p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${recipientEmail}`);
    await new EmailLog({
    recipient: recipientEmail,
    subject: mailOptions.subject,
    templateName: 'thankyou'
}).save();

  } catch (error) {
    console.error('❌ Error sending email:', error.message);
  }
};