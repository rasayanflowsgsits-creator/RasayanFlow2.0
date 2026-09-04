require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
  family: 4,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function testEmail() {
  try {
    console.log('Testing SMTP connection...');

    await transporter.verify();

    console.log('✅ SMTP connection successful!');

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.SMTP_USER,
      subject: 'RasayanFlow SMTP Test',
      text: 'This is a test email from RasayanFlow.',
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ SMTP ERROR:');
    console.error(error);
  }
}

testEmail();