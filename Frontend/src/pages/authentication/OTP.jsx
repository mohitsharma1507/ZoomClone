import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "./OTP.css";

function OTPVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60); // 60 sec countdown
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Agar email nahi mila toh register pe bhejo
  useEffect(() => {
    if (!email) {
      navigate("/register");
    }
  }, [email]);

  // Countdown timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // OTP input handle
  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Sirf numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto next input pe focus
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Backspace handle
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Paste handle
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  // OTP Verify
  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Please enter all 6 digits", { position: "bottom-left" });
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post("http://localhost:8080/verify-otp", {
        email,
        otp: otpString,
      });

      if (data.verified) {
        toast.success("OTP verified successfully!", { position: "bottom-right" });
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Verification failed";
      toast.error(msg, { position: "bottom-left" });
      // Wrong OTP pe clear karo
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setResendLoading(true);
    try {
      await axios.post("http://localhost:8080/resend-otp", { email });
      toast.success("OTP resent successfully!", { position: "bottom-right" });
      setTimer(60);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to resend OTP";
      toast.error(msg, { position: "bottom-left" });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="otp-container">
      <div className="otp-card">
        {/* Icon */}
        <div className="otp-icon">✉️</div>

        <h1>Verify Your Email</h1>
        <p className="otp-subtitle">
          We've sent a 6-digit OTP to
        </p>
        <p className="otp-email">{email}</p>

        {/* OTP Input Boxes */}
        <div className="otp-inputs">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={`otp-input ${digit ? "otp-filled" : ""}`}
              autoFocus={index === 0}
            />
          ))}
        </div>

        {/* Verify Button */}
        <button
          className="verify-btn"
          onClick={handleVerify}
          disabled={loading || otp.join("").length !== 6}
        >
          {loading ? (
            <span className="spinner"></span>
          ) : (
            "Verify OTP"
          )}
        </button>

        {/* Resend */}
        <div className="resend-section">
          {canResend ? (
            <button
              className="resend-btn"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? "Sending..." : "Resend OTP"}
            </button>
          ) : (
            <p className="timer-text">
              Resend OTP in <span>{timer}s</span>
            </p>
          )}
        </div>

        <p className="back-link">
          Wrong email?{" "}
          <span onClick={() => navigate("/register")}>Go back</span>
        </p>
      </div>
      <ToastContainer />
    </div>
  );
}

export default OTPVerification;