import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import LandingPage from "./pages/landing";
import Register from "./pages/authentication/Register";
import Login from "./pages/authentication/Login";
import VideoMeetComponent from "./pages/videomeet";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />}></Route>
          <Route path="/register" element={<Register />}></Route>
          <Route path="/login" element={<Login />}></Route>
          <Route path="/:url" element={<VideoMeetComponent />}></Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
