const User = require("../Models/user");
const Meeting = require("../Models/meeting");
const { createSecretToken } = require("../utils/secretToken");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

module.exports.Register = async (req, res) => {
  try {
    const { email, password, username, createdAt } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ email, password, username, createdAt });
    const token = createSecretToken(user._id);

    res.cookie("token", token, {
      withCredentials: true,
      httpOnly: true,
    });

    res.status(201).json({
      message: "User registered successfully",
      success: true,
      user,
      token,
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
