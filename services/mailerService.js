const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: `"Admin Control" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your Admin Panel Login OTP",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Admin Authentication</h2>
        <p>Your one-time password (OTP) for accessing the admin panel is:</p>
        <h1 style="color: #4F46E5; letter-spacing: 2px;">${otp}</h1>
        <p>This OTP is valid for 5 minutes.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };
