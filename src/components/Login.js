import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase"; // Ensure this path is correct
import { useNavigate } from "react-router-dom";
import logo from "../assests/Logo.jpeg"; // Ensure the path is correct
import { useAuth } from "../context/authContext"; // Ensure this path is correct
import "../styles/Auth.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { user } = useAuth(); // Use the useAuth hook

  // Redirect to Hall Status if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/hall-status");
    }
  }, [user, navigate]);

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      alert("Please enter a valid email.");
      return;
    }
    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setLoading(true); // Show loading state

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/hall-status");
    } catch (error) {
      alert("Invalid credentials.");
      console.error(error);
    } finally {
      setLoading(false); // Hide loading state
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
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
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
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
