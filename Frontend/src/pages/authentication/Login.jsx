import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

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
        { withCredentials: true }
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
    <div
      className="form_container "
      style={{
        marginTop: "12rem",
        marginLeft: "32rem",
        backgroundColor: "#fff",
        padding: "2rem 3rem",
        borderRadius: "0.5rem",
        width: "100%",
        height: "23em",
        maxWidth: "470px",
        boxShadow: "8px 8px 24px 0px rgba(66, 68, 90, 1)",
        background:
          "linear-gradient(90deg,rgba(2, 0, 36, 1),rgba(143, 187, 204, 1) 35%,rgba(0, 212, 255, 1) 100%)",
      }}
    >
      <h2 style={{ fontWeight: "bold" }}>Login Account</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ margin: "30px" }}>
          <input
            style={{ width: "21rem", height: "40px", borderRadius: "5rem" }}
            type="email"
            name="email"
            value={email}
            placeholder="Enter your email"
            onChange={handleOnChange}
            onBlur={handleBlur}
          />
          {errors.email && (
            <small style={{ color: "red", display: "block" }}>
              {errors.email}
            </small>
          )}
        </div>
        <div style={{ margin: "30px" }}>
          <input
            style={{ width: "21rem", height: "40px", borderRadius: "5rem" }}
            type="password"
            name="password"
            value={password}
            placeholder="Enter your password"
            onChange={handleOnChange}
            onBlur={handleBlur}
          />
          {errors.password && (
            <small style={{ color: "red", display: "block" }}>
              {errors.password}
            </small>
          )}
        </div>
        <button
          type="submit"
          style={{
            padding: "8px",
            color: "white",
            fontWeight: "bold",
            borderBottom: "1px solid #ddd",
            width: "8rem",
            marginLeft: "7rem",
            marginTop: "12px",
          }}
          className="btn btn-primary"
        >
          Submit
        </button>
        <span style={{ marginLeft: "6rem" }}>
          Don't have an account?{" "}
          <Link to={"/register"} style={{ color: "black" }}>
            Register
          </Link>
        </span>
      </form>
      <ToastContainer />
    </div>
  );
};

export default Login;
