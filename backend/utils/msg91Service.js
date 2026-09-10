// Free/dev-mode OTP sender — no paid SMS gateway needed.
// Prints the OTP to the backend terminal instead of sending a real SMS.
// When you're ready to go live, add real MSG91 credentials in .env and
// this file will automatically switch to sending real SMS.

const sendOtpSms = async ({ phoneNumber, otp, expiryMinutes = 10 }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  // FREE / DEV MODE: no MSG91 credentials configured -> just log to terminal
  if (!authKey || !templateId) {
    console.log('\n========================================');
    console.log('PASSWORD RESET OTP (DEV MODE - no SMS sent)');
    console.log('Phone:', phoneNumber);
    console.log('OTP:', otp);
    console.log('Expires in:', expiryMinutes, 'minutes');
    console.log('========================================\n');

    return { success: true, developmentMode: true };
  }

  // Real MSG91 sending (only runs if you add MSG91_AUTH_KEY + MSG91_TEMPLATE_ID later)
  try {
    const axios = require('axios');
    await axios.post(
      'https://control.msg91.com/api/v5/otp',
      { mobile: phoneNumber, otp, template_id: templateId },
      { headers: { authkey: authKey, 'Content-Type': 'application/json' } }
    );
    return { success: true, developmentMode: false };
  } catch (error) {
    console.error('Failed to send OTP SMS:', error.message);
    return { success: false, developmentMode: false };
  }
};

module.exports = { sendOtpSms };