// src/App.js
import React from "react";
import { BrowserRouter as Router, Route, Routes as RouterRoutes, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/authContext"; // Import AuthProvider
import Login from "./components/Login";
import Register from "./components/Register";
import HallBooking from "./components/HallBooking"; // Import HallBooking
import "./styles/Auth.css";
import AppLayout from "./components/AppLayout";

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <div className="auth-container">
            <h1>SEMINAR HALL MANAGEMENT</h1>
            <Navigation />
            <AppRoutes /> {/* Use the updated AppRoutes component */}
          </div>
        </AppLayout>
      </Router>
    </AuthProvider>
  );
};

// Navigation component to conditionally render links
const Navigation = () => {
  const { user } = useAuth(); // Get user from context

  return (
    <nav className="navbar">
      <ul className="navbar-list">
        {!user ? (
          <>
            <li><Link to="/register" className="nav-link">Register</Link></li>
            <li><Link to="/login" className="nav-link">Login</Link></li> {/* Corrected login link */}
          </>
        ) : (
          <>
            <li><Link to="/hall-booking" className="nav-link">VISUAL BOOKING</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

// Rename the custom routes function to avoid conflicts
const AppRoutes = () => {
  const { user } = useAuth(); // Get user from context

  return (
    <RouterRoutes>
    <Route path="/register" element={!user ? <Register /> : <Navigate to="/hall-booking" />} />
    <Route path="/login" element={!user ? <Login /> : <Navigate to="/hall-booking" />} />
    <Route path="/hall-booking" element={user ? <HallBooking /> : <Navigate to="/login" />} />
    <Route path="*" element={<Navigate to="/hall-booking" />} /> {/* Redirect all unmatched routes */}
  </RouterRoutes>
  );
};

export default App;
