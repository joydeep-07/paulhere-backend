const { supabase } = require("../services/db");
const { sendOtpEmail } = require("../services/mailerService");

// In-memory store for OTPs
const otpStore = new Map();
const ADMIN_EMAIL = "joydeeprnp8821@gmail.com";

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || email.trim().toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "Unauthorized email address." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins expiry

    otpStore.set(ADMIN_EMAIL, { otp, expiresAt });

    await sendOtpEmail(ADMIN_EMAIL, otp);

    return res
      .status(200)
      .json({ success: true, message: "OTP sent to email." });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({ error: "Failed to send OTP email." });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = email?.trim().toLowerCase();

    if (cleanEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "Unauthorized email address." });
    }

    const record = otpStore.get(ADMIN_EMAIL);

    if (!record || Date.now() > record.expiresAt) {
      return res.status(400).json({ error: "OTP expired or not requested." });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP code." });
    }

    otpStore.delete(ADMIN_EMAIL);

    const { error: dbError } = await supabase
      .from("admins")
      .upsert(
        { email: ADMIN_EMAIL, last_login: new Date().toISOString() },
        { onConflict: "email" },
      );

    if (dbError) {
      console.error("Supabase seeding error:", dbError);
    }

    return res
      .status(200)
      .json({ success: true, message: "Authenticated successfully." });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res
      .status(500)
      .json({ error: "Internal server error during verification." });
  }
};

module.exports = { sendOtp, verifyOtp };
