const User = require("../Models/user");
const Meeting = require("../Models/meeting");
const { createSecretToken } = require("../utils/secretToken");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sendOTPEmail, generateOTP } = require("../utils/mailSender");
const user = require("../Models/user");

const otpStore = {};

module.exports.Register = async (req, res) => {
  try {
    const { email, password, username, createdAt } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOTP();

    otpStore[email] = {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      userData: {
        email,
        password: password,
        username,
        createdAt,
      },
    };

    await sendOTPEmail(email, otp);

    console.log("OTP sent to email:", email);

    res.status(200).json({
      message: "OTP sent to email. Please verify to complete registration.",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Incorrect email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect email or password" });
    }

    const token = createSecretToken(user._id);

    res.cookie("token", token, {
      withCredentials: true,
      httpOnly: true,
    });

    res.status(200).json({
      message: "User logged in successfully",
      success: true,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.getUserHistory = async (req, res) => {
  const { token } = req.query;

  console.log("📖 Getting history - token:", token?.substring(0, 20));

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    // Decode JWT token to get user ID
    const decoded = jwt.verify(token, process.env.TOKEN_KEY);
    console.log(" Decoded token:", decoded);

    // Find user by ID
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(" Found user:", user.username);

    // Find all meetings for this user
    const meetings = await Meeting.find({ user_id: user.username }).sort({
      date: -1,
    }); // Newest first

    console.log(" Found meetings:", meetings.length);

    res.status(200).json(meetings);
  } catch (e) {
    console.error(" Error getting history:", e);
    if (e.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.status(500).json({ message: `Something went wrong: ${e.message}` });
  }
};

module.exports.addToHistory = async (req, res) => {
  const { token, meeting_code } = req.body;

  console.log(" Adding to history:", { meeting_code });

  if (!token || !meeting_code) {
    return res.status(400).json({
      message: "Token and meeting_code are required",
    });
  }

  try {
    // Decode JWT token
    const decoded = jwt.verify(token, process.env.TOKEN_KEY);
    console.log(" Decoded token:", decoded);

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Adding meeting for user:", user.username);

    // Create new meeting
    const newMeeting = new Meeting({
      user_id: user.username,
      meetingCode: meeting_code,
      date: new Date(),
    });

    await newMeeting.save();
    console.log("Meeting saved:", newMeeting);

    res.status(201).json({
      message: "Added to History",
      meeting: newMeeting,
    });
  } catch (e) {
    console.error(" Error adding to history:", e);
    if (e.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.status(500).json({ message: `Something went wrong: ${e.message}` });
  }
};

module.exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const stored = otpStore[email];
  if (!stored) {
    return res
      .status(400)
      .json({ message: "OTP not found. Please request a new one." });
  }

  // Expiry check
  if (Date.now() > stored.expiresAt) {
    delete otpStore[email];
    return res
      .status(400)
      .json({ message: "OTP expired. Please request a new one." });
  }

  // Max attempts check (3 tries)
  if (stored.attempts >= 3) {
    delete otpStore[email];
    return res
      .status(400)
      .json({ message: "Too many attempts. Please request a new OTP." });
  }

  // Wrong OTP
  if (stored.otp !== otp) {
    otpStore[email].attempts += 1;
    const remaining = 3 - otpStore[email].attempts;
    return res.status(400).json({
      message: `Invalid OTP. ${remaining} attempts remaining.`,
    });
  }
  try {
    const { userData } = stored;

    if (userData) {
      const newUser = await User.create({
        email: userData.email,
        password: userData.password,
        username: userData.username,
        createdAt: new Date(),
      });

      const token = createSecretToken(newUser._id);
      delete otpStore[email];

      return res.status(201).json({
        message: "Email verified! Account created successfully.",
        verified: true,
        success: true,
        token,
      });
    }

    delete otpStore[email];
    res
      .status(200)
      .json({ message: "OTP verified successfully!", verified: true });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.resendOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const existing = otpStore[email];
  if (existing) {
    const timeLeft = existing.expiresAt - Date.now();
    const nineMinutes = 9 * 60 * 1000;
    if (timeLeft > nineMinutes) {
      return res.status(429).json({
        message: "Please wait 1 minute before requesting a new OTP.",
      });
    }
  }

  try {
    const otp = generateOTP();

    otpStore[email] = {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      userData: existing ? existing.userData : null,
    };

    await sendOTPEmail(email, otp);

    console.log(`✅ OTP resent to ${email}`);
    res.status(200).json({ message: "OTP resent successfully!" });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Failed to resend OTP. Try again." });
  }
};
