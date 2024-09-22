import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from "react-router-dom";
import { auth } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Login from "./components/Login";
import Register from "./components/Register";
import HallStatus from "./components/HallStatus";
import "./styles/Auth.css";
import AppLayout from "./components/AppLayout"; // Adjust the path as needed

const App = () => {
  const [user] = useAuthState(auth); // Check if the user is logged in

  return (
    <Router>
      <AppLayout>
        <div className="auth-container">
          <h1>SEMINAR HALL MANAGEMENT</h1>
          <nav className="navbar">
            <ul className="navbar-list">
              {!user ? (
                <>
                  <li>
                    <Link to="/register" className="nav-link">Register</Link>
                  </li>
                  <li>
                    <Link to="/login" className="nav-link">Login</Link>
                  </li>
                </>
              ) : (
                <li>
                  <Link to="/hall-status" className="nav-link">Hall Status</Link>
                </li>
              )}
            </ul>
          </nav>

          <Routes>
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/hall-status" />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/hall-status" />} />
            <Route path="/hall-status" element={user ? <HallStatus /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </AppLayout>
    </Router>
  );
};

export default App;
