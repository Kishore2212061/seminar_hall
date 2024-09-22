import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import logo from "../assests/Logo.jpeg";
import "../styles/Auth.css";
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/hall-status");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="auth-container">
      
          <img 
          src={logo}
          alt="Image 2" 
          style={{ 
            height: 'auto', // Maintain original height
            width: 'auto',  // Maintain original width
            maxWidth: '100%', // Responsive
            marginTop: '20px', // Increased space between images
          }} />
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
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
