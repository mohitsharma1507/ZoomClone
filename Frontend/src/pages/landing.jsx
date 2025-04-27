import React from "react";
import "../App.css";
import MobilePhoto from "../assets/mobile.png";
import { Link, useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landingContainer">
      <nav>
        <div className="navHeader">
          <h2> Zoom Video Call</h2>
        </div>
        <div className="navList">
          <p
            onClick={() => {
              navigate("/ad1234");
            }}
          >
            Join as a Guest
          </p>
          <p
            onClick={() => {
              navigate("/register");
            }}
          >
            Register
          </p>
          <div role="button">
            <p
              onClick={() => {
                navigate("/login");
              }}
            >
              Login
            </p>
          </div>
        </div>
      </nav>

      <div className="landingMainContainer">
        <div>
          <h1>
            <span style={{ color: "orangered" }}>Connect</span> with your loved
            Ones
          </h1>
          <p>Cover a distance by Zoom Video Call</p>
          <div role="button">
            <Link to={"/register"}> Get Started</Link>
          </div>
        </div>
        <div>
          <img src={MobilePhoto} alt="Mobile Photo" />
        </div>
      </div>
    </div>
  );
}
