import axios from "axios";
import React, { createContext } from "react";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: `http://localhost:8080`,
  withCredentials: true, // important if your backend is setting cookies
});

export const AuthProvider = ({ children }) => {
 

  const getHistoryOfUser = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await client.get("/get_all_activity", {
        params: { token },
      });
      return response.data;
    } catch (err) {
      console.error("Error getting history:", err);
      throw err;
    }
  };

  const addToUserHistory = async (meetingCode) => {
    try {
      const token = localStorage.getItem("token");
      const response = await client.post("/add_to_activity", {
        token,
        meeting_code: meetingCode,
      });
      return response.data;
    } catch (err) {
      console.error("Error adding to history:", err);
      throw err;
    }
  };

  const data = {
    addToUserHistory,
    getHistoryOfUser,
  };

  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};
