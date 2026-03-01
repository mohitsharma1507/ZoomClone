const nodeMailer = require("nodemailer");
require("dotenv").config();

const transporter = nodeMailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: `"Video Meet App" <${process.env.SMTP_FROM_EMAIL}>`,
    to: toEmail,
    subject: "Your OTP for Video Meet",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #ff6347; text-align: center;">Video Meet</h2>
        <p style="font-size: 16px; color: #333;">Your OTP for verification is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 40px; font-weight: bold; letter-spacing: 10px; color: #ff6347;">
            ${otp}
          </span>
        </div>
        <p style="color: #888; font-size: 13px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">Video Meet App &copy; 2024</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`OTP sent to ${toEmail}`);
};


const sendMeetingInvite = async (toEmail, meetingCode, hostName) => {
  const meetingLink = `http://localhost:5173/meeting/${meetingCode}`;

  const mailOptions = {
    from: `"Video Meet App" <${process.env.SMTP_FROM_EMAIL}>`,
    to: toEmail,
    subject: `${hostName} ne aapko meeting mein invite kiya hai!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #ff6347; text-align: center;">Video Meet</h2>
        <p style="font-size: 16px; color: #333;">
          <strong>${hostName}</strong> ne aapko ek meeting mein invite kiya hai!
        </p>
        <p style="color: #555;">Meeting Code: <strong style="color: #ff6347;">${meetingCode}</strong></p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${meetingLink}" 
             style="background: linear-gradient(135deg, #ff6347, #ff4500); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
            Join Meeting
          </a>
        </div>
        <p style="color: #888; font-size: 13px;">Ya phir yeh link copy karke browser mein paste karo:</p>
        <p style="color: #ff6347; font-size: 13px; word-break: break-all;">${meetingLink}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">Video Meet App &copy; 2024</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(` Meeting invite sent to ${toEmail}`);
};

module.exports = { sendOTPEmail, sendMeetingInvite, generateOTP };
