import nodemailer from 'nodemailer';
import EmailLog from '../models/EmailLog.js';
import dotenv from 'dotenv';
dotenv.config();


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEmail = async ({ to, subject, html, templateName }) => {
  const mailOptions = {
    from: `"Marhaba Connect" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);

    await new EmailLog({
      recipient: to,
      subject,
      templateName
    }).save();
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
  }
};

export const sendThankYouEmail = async (recipientEmail, locale = 'en') => {
  const subject = 'Thank You for Your Interest';
  const html = `
    <h2>We're thrilled you're with us!</h2>
    <p>Thanks for signing up to be notified about Marhaba Connect. We’ll keep you updated as we move closer to launch.</p>
    <p style="margin-top:1rem;">Warm wishes, <br /><strong>Team Marhaba Connect</strong></p>
  `;

  await sendEmail({
    to: recipientEmail,
    subject,
    html,
    templateName: 'thankyou'
  });
};
