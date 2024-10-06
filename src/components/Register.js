import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import logo from "../assets/Logo.jpeg"; // Corrected path
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [loading, setLoading] = useState(false); // Loading state
  const navigate = useNavigate();

  const ADMIN_SECRET_KEY = process.env.REACT_APP_ADMIN_SECRET_KEY; // Use environment variable

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
  const validatePassword = (password) => password.length >= 6; // Minimum length check

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validate input
    if (!validateEmail(email)) {
      alert("Please enter a valid email.");
      return;
    }
    if (!validatePassword(password)) {
      alert("Password must be at least 6 characters long.");
      return;
    }
    if (secretKey !== ADMIN_SECRET_KEY) {
      alert("Invalid secret key! Only admins can register.");
      return;
    }

    setLoading(true); // Start loading state

    try {
      await createUserWithEmailAndPassword(auth, email, password);

      // List of HOD emails
      const adminEmails = [
        "hodcse@nec.edu.in",
        "hodmech@nec.edu.in", // Add other department HOD emails here
        "hodit@nec.edu.in",
        "hodaids@nec.edu.in",
        "hodece@nec.edu.in",
        "hodeee@nec.edu.in",
        "hodcivil@nec.edu.in"
      ];

      // Check if the registered email is an HOD email
      if (adminEmails.includes(email)) {
        navigate("/admin"); // Redirect to admin page for HOD
      } else {
        navigate("/hall-booking"); // Redirect to hall status for other users
      }
    } catch (error) {
      let errorMessage = "An error occurred. Please try again.";
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "The email address is already in use.";
          break;
        case "auth/invalid-email":
          errorMessage = "The email address is not valid.";
          break;
        case "auth/weak-password":
          errorMessage = "The password is too weak.";
          break;
        default:
          errorMessage = "An unexpected error occurred. Please try again.";
      }
      alert(errorMessage);
      console.error(error);
    } finally {
      setLoading(false); // End loading state
    }
  };

  return (
    <div className="auth-container">
      <img 
        src={logo}
        alt="Logo" 
        style={{ 
          height: 'auto', 
          width: 'auto',  
          maxWidth: '100%', 
          marginTop: '20px',
        }} 
      />
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Secret Key"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
};

export default Register;
