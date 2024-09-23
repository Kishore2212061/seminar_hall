import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import logo from "../assests/Logo.jpeg";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const navigate = useNavigate();

  const ADMIN_SECRET_KEY = "nec@2261"; // Your actual secret key

  const handleRegister = async (e) => {
    e.preventDefault();
    if (secretKey !== ADMIN_SECRET_KEY) {
      alert("Invalid secret key! Only admins can register.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/hall-status");
    } catch (error) {
      console.error(error);
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
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default Register;