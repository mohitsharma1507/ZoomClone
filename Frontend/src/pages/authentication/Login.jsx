import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const { email, password } = inputValue;
  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setInputValue({
      ...inputValue,
      [name]: value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });
  };
  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (!value.trim()) {
      setErrors({
        ...errors,
        [name]: `Please fill out this field`,
      });
    }
  };

  const handleError = (err) =>
    toast.error(err, {
      position: "bottom-left",
    });
  const handleSuccess = (msg) =>
    toast.success(msg, {
      position: "bottom-left",
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    Object.keys(inputValue).forEach((key) => {
      if (!inputValue[key].trim()) {
        newErrors[key] = `Please fill out this field`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    try {
      const { data } = await axios.post(
        "http://localhost:8080/login",
        {
          ...inputValue,
        },
        { withCredentials: true },
      );
      console.log(data);
      const { success, message, token } = data;
      if (success) {
        localStorage.setItem("token", token);
        handleSuccess(message);
        setTimeout(() => {
          navigate("/home");
        }, 1000);
      } else {
        handleError(message);
      }
    } catch (error) {
      console.log(error);
    }
    setInputValue({
      ...inputValue,
      email: "",
      password: "",
    });
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <h1>Welcome Back</h1>
            <p>Login to continue your journey</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                placeholder="Enter your email"
                onChange={handleOnChange}
                onBlur={handleBlur}
                className={errors.email ? "input-error" : ""}
              />
              {errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                placeholder="Enter your password"
                onChange={handleOnChange}
                onBlur={handleBlur}
                className={errors.password ? "input-error" : ""}
              />
              {errors.password && (
                <span className="error-message">{errors.password}</span>
              )}
            </div>

            <button type="submit" className="submit-btn">
              Login
            </button>

            <div className="register-link">
              Don't have an account?{" "}
              <Link to={"/register"}>Create one now</Link>
            </div>
          </form>
          <ToastContainer />
        </div>

        <div className="login-decoration">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
