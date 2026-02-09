import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import Registers from "../../assets/Register.png";

function Register() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState({
    email: "",
    password: "",
    username: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    username: "",
  });
  const { email, password, username } = inputValue;
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
        [name]: "Please Fill Out this Field",
      });
    }
  };

  const handleError = (err) =>
    toast.error(err, {
      position: "bottom-left",
    });
  const handleSuccess = (msg) =>
    toast.success(msg, {
      position: "bottom-right",
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if any field is empty
    const newErrors = {};
    Object.keys(inputValue).forEach((key) => {
      if (!inputValue[key].trim()) {
        newErrors[key] = `Please fill out this field`;
      }
    });

    // If there are errors, set them and stop submission
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const { data } = await axios.post(
        "http://localhost:8080/register",
        {
          ...inputValue,
        },
        { withCredentials: true },
      );
      const { success, message } = data;
      if (success) {
        handleSuccess(message);
        setTimeout(() => {
          navigate("/Login");
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
      username: "",
    });
  };
  return (
    <div className="container p-5">
      <div className="row p-5" style={{ marginTop: "15px" }}>
        <div className="col-6 p-5">
          <img src={Registers} style={{ width: "110%" }} />
        </div>

        <div className="col-6 p-5">
          <h1 className="mb-2 fs-3 fw-bold">Register Now</h1>
          <p className="text-muted fs-5">Or track your existing application.</p>
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
                type="text"
                name="username"
                value={username}
                placeholder="Enter your username"
                onChange={handleOnChange}
                onBlur={handleBlur}
              />
              {errors.username && (
                <small style={{ color: "red", display: "block" }}>
                  {errors.username}
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
              style={{
                padding: "8px",
                color: "white",
                fontWeight: "bold",
                borderBottom: "1px solid #ddd",
                width: "8rem",
                marginLeft: "7rem",
                marginTop: "12px",
              }}
              type="submit"
              className="btn btn-primary"
            >
              Submit
            </button>
            <br />
            <br />
            <span style={{ marginLeft: "5rem" }}>
              Already have an account? <Link to={"/login"}>Login</Link>
            </span>
          </form>
          <ToastContainer />
        </div>
      </div>
    </div>
  );
}

export default Register;
