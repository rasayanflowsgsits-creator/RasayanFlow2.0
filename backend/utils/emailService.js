const nodemailer = require('nodemailer');

const sendPasswordResetEmail = async ({
  to,
  resetUrl,
  expiryMinutes = 30,
}) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpSecure =
    String(process.env.SMTP_SECURE).toLowerCase() === 'true';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM || smtpUser;

  // Development fallback
  // If SMTP is not configured, show the reset URL in the terminal.
  if (!smtpHost || !smtpUser || !smtpPass || !emailFrom) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========================================');
      console.log('PASSWORD RESET LINK');
      console.log(resetUrl);
      console.log('========================================\n');
    }

    return {
      success: true,
      developmentMode: true,
    };
  }

 const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  family: 4,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

  await transporter.sendMail({
    from: emailFrom,
    to,
    subject: 'RasayanFlow - Password Reset',

    text: `You requested a password reset for your RasayanFlow account.

Use the following link to reset your password:

${resetUrl}

This link will expire in ${expiryMinutes} minutes.

If you did not request a password reset, you can safely ignore this email.`,

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      ">
        <h2>RasayanFlow Password Reset</h2>

        <p>
          You requested a password reset for your RasayanFlow account.
        </p>

        <p>
          Click the button below to create a new password:
        </p>

        <p>
          <a
            href="${resetUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #2563eb;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
            "
          >
            Reset Password
          </a>
        </p>

        <p>
          This link will expire in
          <strong>${expiryMinutes} minutes</strong>.
        </p>

        <p>
          If you did not request this password reset,
          you can safely ignore this email.
        </p>
      </div>
    `,
  });

  return {
    success: true,
    developmentMode: false,
  };
};

module.exports = {
  sendPasswordResetEmail,
};