import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import LandingPage from "./pages/landing";
import Register from "./pages/authentication/Register";
import Login from "./pages/authentication/Login";
import VideoMeetComponent from "./pages/videomeet";
import Home from "./pages/home";
import { AuthProvider } from "./contexts/AuthContext";
import History from "./pages/history";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />}></Route>
          <Route path="/register" element={<Register />}></Route>
          <Route path="/login" element={<Login />}></Route>
          <Route path="/home" element={<Home />}></Route>
          <Route path="/history" element={<History />}></Route>
          <Route path="/:url" element={<VideoMeetComponent />}></Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
