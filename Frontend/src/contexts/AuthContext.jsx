import axios from "axios";
import React, { createContext } from "react";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: `http://localhost:8080`,
  withCredentials: true,
});

export const AuthProvider = ({ children }) => {
  const getHistoryOfUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return null;
      }
      const response = await client.get("/user/get_all_activity", {
        params: { token },
      });
      console.log("History API response:", response.data);
      if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.error("Expected array but got:", response.data);
        return [];
      }
    } catch (err) {
      console.error("Error getting history:", err);
      throw err;
    }
  };

  const addToUserHistory = async (meetingCode) => {
    try {
      const token = localStorage.getItem("token");
      const response = await client.post("/user/add_to_activity", {
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
