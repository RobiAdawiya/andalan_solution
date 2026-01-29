import { useState } from "react";
import "../styles/login.css";
import logo2 from "../assets/logo2.png";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !password || !confirmPassword) {
      setError("All fields must be filled in");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password is incorrect");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    
    if (users.find(u => u.username === username)) {
      setError("Username is already registered");
      return;
    }

    users.push({ username, password });
    localStorage.setItem("users", JSON.stringify(users));
    
    setSuccess("Account successfully created! Please login.");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    
    setTimeout(() => {
      setIsRegister(false);
      setSuccess("");
    }, 2000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Username and password must be filled in");
      return;
    }

    if (username === "admin" && password === "admin") {
      localStorage.setItem("auth", "true");
      window.location.reload();
      return;
    }

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      localStorage.setItem("auth", "true");
      window.location.reload();
    } else {
      setError("Username or password is incorrect");
    }
  };

  return (
    <div className="login-container">
      <img src={logo2} alt="Company Logo" className="login-logo" />
      <h1 className="brand-title"></h1>
      <p className="subtitle">
        {isRegister ? "Create your account" : "Login to start your new session"}
      </p>

      {isRegister && (
        <form className="form" onSubmit={handleRegister}>
          <label>Username</label>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}

          <button type="submit" className="login-btn">
            Create Account
          </button>

          <button 
            type="button" 
            className="signin-btn"
            onClick={() => {
              setIsRegister(false);
              setError("");
              setSuccess("");
              setUsername("");
              setPassword("");
              setConfirmPassword("");
            }}
          >
            Back to Login
          </button>
        </form>
      )}

      {!isRegister && (
        <form className="form" onSubmit={handleLogin}>
          <label>Username</label>
          <input
            type="text"
            placeholder="User"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="login-btn">
            Login
          </button>

          <button 
            type="button" 
            className="signin-btn"
            onClick={() => {
              setIsRegister(true);
              setError("");
              setUsername("");
              setPassword("");
            }}
          >
            Sign Up
          </button>
        </form>
      )}
    </div>
  );
}
